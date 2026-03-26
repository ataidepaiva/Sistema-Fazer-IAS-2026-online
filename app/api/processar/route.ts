import { processarTexto } from "@/lib/parser"

export async function POST(req: Request) {
  const { texto } = await req.json()

  const dados = processarTexto(texto)

  return Response.json(dados)
}