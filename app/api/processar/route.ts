import { processarTexto } from "@/lib/parser"

export async function POST(req: Request) {
  const { texto } = await req.json()

  if (!texto || typeof texto !== "string" || !texto.trim()) {
    return Response.json({ error: "Texto não informado" }, { status: 400 })
  }

  const dados = processarTexto(texto)

  return Response.json(dados)
}