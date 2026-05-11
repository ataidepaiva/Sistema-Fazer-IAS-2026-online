import { processarTexto } from "@/lib/parser"

export async function POST(req: Request) {
  const { texto } = await req.json()

  console.log(
    `[API] Recebido: ${texto.length} chars, quebras: \\n=${texto.match(/\n/g)?.length || 0}, \\r\\n=${texto.match(/\r\n/g)?.length || 0}`
  )
  console.log(`[API] Primeiros 80 chars: "${texto.substring(0, 80)}"`)

  if (!texto || typeof texto !== "string" || !texto.trim()) {
    return Response.json({ error: "Texto não informado" }, { status: 400 })
  }

  const dados = processarTexto(texto)

  console.log(`[API] Resultado: ${dados.length} registros`)

  return Response.json(dados)
}