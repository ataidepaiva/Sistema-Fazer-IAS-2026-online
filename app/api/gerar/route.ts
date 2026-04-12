import { gerarDoc } from "@/lib/doc"

export const runtime = "nodejs"
export const maxDuration = 300

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

async function gerarDocsEmLotes(registros: ReturnType<typeof normalizarRegistro>[]) {
  const buffers: Buffer[] = []

  for (let index = 0; index < registros.length; index += 1) {
    buffers.push(gerarDoc("modelo.docx", registros[index]))

    if ((index + 1) % 25 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve))
    }
  }

  return buffers
}

export async function POST(req: Request) {
  const { registros }: { registros: Registro[] } = await req.json()

  if (!Array.isArray(registros) || registros.length === 0) {
    return Response.json({ error: "Nenhum registro informado" }, { status: 400 })
  }

  if (registros.some((item) => !item || typeof item !== "object")) {
    return Response.json({ error: "Formato de registros inválido" }, { status: 400 })
  }

  const registrosNormalizados = registros.map((item: Registro) => normalizarRegistro(item))
  const nomeArquivo = sanitizarNomeArquivo(registrosNormalizados[0]?.titulo)

  const docs = await gerarDocsEmLotes(registrosNormalizados)
  const buffer = docs.length === 1 ? docs[0] : await mesclarDocs(docs)
  const payload = new Uint8Array(buffer)

  return new Response(payload, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": montarContentDisposition(nomeArquivo)
    }
  })
}