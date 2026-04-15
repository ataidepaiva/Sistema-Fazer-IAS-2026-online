import { promises as fs } from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { limparCacheModelo } from "@/lib/doc"

export const runtime = "nodejs"

const caminhoModelo = path.join(process.cwd(), "modelo.docx")

function usuarioEhAdmin(request: Request) {
  const cookies = request.headers.get("cookie") || ""
  return cookies
    .split(";")
    .map((item) => item.trim())
    .includes("sinfo-auth=admin")
}

export async function GET(request: Request) {
  if (!usuarioEhAdmin(request)) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  const arquivo = await fs.readFile(caminhoModelo)

  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="modelo.docx"',
    },
  })
}

export async function POST(request: Request) {
  if (!usuarioEhAdmin(request)) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  const formData = await request.formData()
  const arquivo = formData.get("arquivo")

  if (!arquivo || typeof arquivo === "string") {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  if (!arquivo.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Envie um arquivo .docx" }, { status: 400 })
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  if (!buffer.length) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 })
  }

  await fs.writeFile(caminhoModelo, buffer)
  limparCacheModelo(caminhoModelo)

  return NextResponse.json({ ok: true, arquivo: arquivo.name })
}
