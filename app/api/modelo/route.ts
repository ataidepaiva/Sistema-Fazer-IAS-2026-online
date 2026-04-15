import { NextResponse } from "next/server"
import { limparCacheModelo } from "@/lib/doc"
import { lerModeloArquivo, salvarModeloArquivo } from "@/lib/model-storage"

export const runtime = "nodejs"

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

  const arquivo = await lerModeloArquivo("modelo.docx")

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

  try {
    await salvarModeloArquivo(buffer, "modelo.docx")
    limparCacheModelo("modelo.docx")

    return NextResponse.json({ ok: true, arquivo: arquivo.name })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao atualizar o modelo"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}
