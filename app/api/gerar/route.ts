import { PassThrough } from "stream"
import archiver from "archiver"
import { gerarDoc } from "@/lib/doc"
import { obterSessaoAutenticada } from "@/lib/auth"

export const runtime = "nodejs"
export const maxDuration = 300
const LIMITE_CONCORRENCIA_POR_USUARIO = 1
const geracoesEmAndamento = new Map<string, number>()

interface Registro {
  titulo: string
  texto_base: string
  servidor: string
  masp: string
  pagina: string
  coluna: string
  data: string
}

function obterDataAtualBrasil(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date())
}

function normalizarData(data: string | undefined): string {
  const valor = (data || "").trim()

  if (!valor || valor.toLowerCase() === "undefined") {
    return obterDataAtualBrasil()
  }

  return valor
}

function sanitizarNomeArquivo(titulo: string | undefined): string {
  const valor = (titulo || "").trim()

  if (!valor) {
    return "documento_unico_ias.docx"
  }

  const nomeSeguro = valor
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return `${nomeSeguro || "documento_unico_ias"}.docx`
}

function obterNomeAscii(nomeArquivo: string): string {
  return nomeArquivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/"/g, "")
    .trim() || "documento_unico_ias.docx"
}

function montarContentDisposition(nomeArquivo: string): string {
  const nomeAscii = obterNomeAscii(nomeArquivo)
  const nomeUtf8 = encodeURIComponent(nomeArquivo)

  return `attachment; filename="${nomeAscii}"; filename*=UTF-8''${nomeUtf8}`
}

function normalizarRegistro(item: Registro) {
  return {
    titulo: (item.titulo || "").trim(),
    texto_base: (item.texto_base || "").trim(),
    servidor: (item.servidor || "").trim(),
    masp: (item.masp || "").trim(),
    pagina: (item.pagina || "").trim(),
    coluna: (item.coluna || "").trim(),
    data: normalizarData(item.data),
    data_atual: obterDataAtualBrasil(),
  }
}

async function mesclarDocs(buffers: Buffer[]) {
  const { default: DocxMerger } = await import("docx-merger")

  const merger = new DocxMerger({ pageBreak: true }, buffers)

  return await new Promise<Buffer>((resolve, reject) => {
    try {
      merger.save("nodebuffer", (data: Buffer) => {
        if (!data) {
          reject(new Error("Falha ao mesclar documentos"))
          return
        }

        resolve(data)
      })
    } catch (error) {
      reject(error)
    }
  })
}

async function gerarDocsEmLotes(registros: ReturnType<typeof normalizarRegistro>[], userKey: string) {
  const buffers: Buffer[] = []

  for (let index = 0; index < registros.length; index += 1) {
    buffers.push(await gerarDoc("modelo.docx", registros[index], userKey))

    if ((index + 1) % 25 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve))
    }
  }

  return buffers
}

function agruparRegistrosPorTitulo(registros: ReturnType<typeof normalizarRegistro>[]) {
  const grupos = new Map<string, { titulo: string; registros: ReturnType<typeof normalizarRegistro>[] }>()

  for (const registro of registros) {
    const titulo = registro.titulo || "Sem título"
    const chave = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    const grupoExistente = grupos.get(chave)

    if (grupoExistente) {
      grupoExistente.registros.push(registro)
      continue
    }

    grupos.set(chave, { titulo, registros: [registro] })
  }

  return Array.from(grupos.values())
}

async function gerarZipComDocumentos(documentos: Array<{ nomeArquivo: string; buffer: Buffer }>) {
  const stream = new PassThrough()
  const archive = archiver("zip", { zlib: { level: 9 } })
  const chunks: Buffer[] = []

  return await new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })

    stream.on("end", () => {
      resolve(Buffer.concat(chunks))
    })

    stream.on("error", reject)
    archive.on("error", reject)
    archive.pipe(stream)

    for (const documento of documentos) {
      archive.append(documento.buffer, { name: documento.nomeArquivo })
    }

    void archive.finalize()
  })
}

export async function POST(req: Request) {
  let chaveSessao = ""

  try {
    const sessao = await obterSessaoAutenticada(req)

    if (!sessao?.chave) {
      return Response.json({ error: "Sessão inválida ou expirada" }, { status: 401 })
    }

    chaveSessao = sessao.chave
    const execucoesAtuais = geracoesEmAndamento.get(chaveSessao) || 0

    if (execucoesAtuais >= LIMITE_CONCORRENCIA_POR_USUARIO) {
      return Response.json(
        { error: "Voce ja possui uma geracao em andamento. Aguarde a conclusao para iniciar outra." },
        { status: 429 }
      )
    }

    geracoesEmAndamento.set(chaveSessao, execucoesAtuais + 1)

    const body = await req.json().catch(() => null)
    const registros = body?.registros as Registro[] | undefined

    if (!Array.isArray(registros) || registros.length === 0) {
      return Response.json({ error: "Nenhum registro informado" }, { status: 400 })
    }

    if (registros.some((item) => !item || typeof item !== "object")) {
      return Response.json({ error: "Formato de registros inválido" }, { status: 400 })
    }

    const registrosNormalizados = registros.map((item: Registro) => normalizarRegistro(item))
    const gruposPorTitulo = agruparRegistrosPorTitulo(registrosNormalizados)

    if (gruposPorTitulo.length === 1) {
      const nomeArquivo = sanitizarNomeArquivo(gruposPorTitulo[0]?.titulo)
      const docs = await gerarDocsEmLotes(gruposPorTitulo[0].registros, sessao.chave)
      const buffer = docs.length === 1 ? docs[0] : await mesclarDocs(docs)
      const payload = new Uint8Array(buffer)

      return new Response(payload, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": montarContentDisposition(nomeArquivo)
        }
      })
    }

    const documentosPorTitulo: Array<{ nomeArquivo: string; buffer: Buffer }> = []

    for (const grupo of gruposPorTitulo) {
      const docs = await gerarDocsEmLotes(grupo.registros, sessao.chave)
      const buffer = docs.length === 1 ? docs[0] : await mesclarDocs(docs)

      documentosPorTitulo.push({
        nomeArquivo: sanitizarNomeArquivo(grupo.titulo),
        buffer,
      })
    }

    const zipBuffer = await gerarZipComDocumentos(documentosPorTitulo)
    const payload = new Uint8Array(zipBuffer)
    const nomeZip = "documentos_por_titulo.zip"

    return new Response(payload, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": montarContentDisposition(nomeZip)
      }
    })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha inesperada ao gerar documento"
    return Response.json({ error: mensagem }, { status: 500 })
  } finally {
    if (chaveSessao) {
      const restante = (geracoesEmAndamento.get(chaveSessao) || 1) - 1

      if (restante > 0) {
        geracoesEmAndamento.set(chaveSessao, restante)
      } else {
        geracoesEmAndamento.delete(chaveSessao)
      }
    }
  }
}