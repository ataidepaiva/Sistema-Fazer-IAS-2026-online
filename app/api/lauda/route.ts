import fs from "fs"
import path from "path"

function converterParaRtf(texto: string): string {
  let result = ""

  for (const char of texto) {
    const code = char.charCodeAt(0)

    if (char === "\n") {
      result += "\\par "
    } else if (char === "\r") {
      // ignorar
    } else if (char === "\\") {
      result += "\\\\"
    } else if (char === "{") {
      result += "\\{"
    } else if (char === "}") {
      result += "\\}"
    } else if (code > 127) {
      // Codifica como Windows-1252 (latin1 para chars comuns do português)
      const buf = Buffer.from(char, "latin1")
      const hex = buf[0].toString(16).padStart(2, "0")
      result += `\\'${hex}`
    } else {
      result += char
    }
  }

  return result
}

function obterDataParaNome(): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date())

  const d = partes.find((p) => p.type === "day")?.value
  const m = partes.find((p) => p.type === "month")?.value
  const y = partes.find((p) => p.type === "year")?.value

  return `${d}-${m}-${y}`
}

function obterNomeAscii(nomeArquivo: string): string {
  return nomeArquivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/"/g, "")
    .trim() || "lauda.rtf"
}

function montarContentDisposition(nomeArquivo: string): string {
  const nomeAscii = obterNomeAscii(nomeArquivo)
  const nomeUtf8 = encodeURIComponent(nomeArquivo)

  return `attachment; filename="${nomeAscii}"; filename*=UTF-8''${nomeUtf8}`
}

export async function POST(req: Request) {
  const { texto } = await req.json()

  if (!texto || typeof texto !== "string" || !texto.trim()) {
    return Response.json({ error: "Texto não informado" }, { status: 400 })
  }

  const modeloPath = path.join(process.cwd(), "modelo lauda.rtf")
  const modelo = fs.readFileSync(modeloPath, "binary")

  const textoRtf = converterParaRtf(texto.trim())
  const resultado = modelo.replace("\\{texto\\}", textoRtf)

  const buffer = Buffer.from(resultado, "binary")
  const nomeArquivo = `Lauda de ${obterDataParaNome()}.rtf`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/rtf",
      "Content-Disposition": montarContentDisposition(nomeArquivo),
    },
  })
}
