import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import JSZip from "jszip"

export interface RegistroOffline {
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
    year: "numeric",
  }).format(new Date())
}

function normalizarData(data: string | undefined): string {
  const valor = (data || "").trim()

  if (!valor || valor.toLowerCase() === "undefined") {
    return obterDataAtualBrasil()
  }

  return valor
}

function normalizarRegistro(item: RegistroOffline) {
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

function sanitizarNomeArquivo(titulo: string | undefined) {
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

function uint8ArrayParaBinaryString(valor: Uint8Array) {
  let binary = ""

  for (const byte of valor) {
    binary += String.fromCharCode(byte)
  }

  return binary
}

export async function gerarDocumentoOffline(modelo: Uint8Array, dados: object) {
  const zip = new PizZip(uint8ArrayParaBinaryString(modelo))
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
  doc.render(dados)
  return doc.getZip().generate({ type: "blob" }) as Blob
}

export async function gerarPacoteOffline(modelo: Uint8Array, registros: RegistroOffline[]) {
  const registrosNormalizados = registros.map((item) => normalizarRegistro(item))
  const grupos = agruparRegistrosPorTitulo(registrosNormalizados)
  const arquivos: Array<{ nomeArquivo: string; blob: Blob }> = []

  for (const grupo of grupos) {
    for (let indice = 0; indice < grupo.registros.length; indice += 1) {
      const registro = grupo.registros[indice]
      const blob = await gerarDocumentoOffline(modelo, registro)
      const nomeBase = sanitizarNomeArquivo(grupo.titulo).replace(/\.docx$/i, "")
      const sufixo = grupo.registros.length > 1 ? `_${String(indice + 1).padStart(2, "0")}` : ""

      arquivos.push({
        nomeArquivo: `${nomeBase}${sufixo}.docx`,
        blob,
      })
    }
  }

  if (arquivos.length === 1) {
    return {
      tipo: "docx" as const,
      nomeArquivo: arquivos[0].nomeArquivo,
      blob: arquivos[0].blob,
    }
  }

  const zip = new JSZip()

  for (const arquivo of arquivos) {
    zip.file(arquivo.nomeArquivo, arquivo.blob)
  }

  return {
    tipo: "zip" as const,
    nomeArquivo: "documentos_offline.zip",
    blob: await zip.generateAsync({ type: "blob" }),
  }
}

export function converterParaRtfOffline(texto: string) {
  let result = ""

  for (const char of texto) {
    const code = char.charCodeAt(0)

    if (char === "\n") {
      result += "\\par "
    } else if (char === "\r") {
      continue
    } else if (char === "\\") {
      result += "\\\\"
    } else if (char === "{") {
      result += "\\{"
    } else if (char === "}") {
      result += "\\}"
    } else if (code > 127) {
      result += `\\u${code}?`
    } else {
      result += char
    }
  }

  return result
}

export function montarLaudaOffline(modeloRtf: string, texto: string) {
  return modeloRtf.replace("\\{texto\\}", converterParaRtfOffline(texto.trim()))
}

export function obterNomeLaudaOffline() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date())

  const d = partes.find((p) => p.type === "day")?.value
  const m = partes.find((p) => p.type === "month")?.value
  const y = partes.find((p) => p.type === "year")?.value

  return `Lauda de ${d}-${m}-${y}.rtf`
}
