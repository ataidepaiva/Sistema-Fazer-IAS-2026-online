import { NextResponse } from "next/server"
import { obterSessaoAutenticada } from "@/lib/auth"
import { obterStatusModeloPrincipal, salvarModeloPrincipalImutavel } from "@/lib/model-storage"

export const runtime = "nodejs"

async function usuarioEhAdmin(request: Request) {
  const sessao = await obterSessaoAutenticada(request)
  return sessao?.perfil === "admin"
}

export async function GET(request: Request) {
  if (!(await usuarioEhAdmin(request))) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  const status = await obterStatusModeloPrincipal()
  return NextResponse.json({ ok: true, modeloPrincipal: status })
}

export async function POST(request: Request) {
  if (!(await usuarioEhAdmin(request))) {
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
    const resultado = await salvarModeloPrincipalImutavel(buffer, "modelo.docx")

    if (!resultado.criado) {
      return NextResponse.json(
        { error: "Modelo principal já cadastrado e imutável" },
        { status: 409 }
      )
    }

    const status = await obterStatusModeloPrincipal()
    return NextResponse.json({ ok: true, modeloPrincipal: status })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao salvar modelo principal"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}
