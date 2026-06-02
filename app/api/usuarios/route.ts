import { NextResponse } from "next/server"
import {
  atualizarUsuarioSistema,
  criarUsuarioSistema,
  listarUsuariosSistema,
  obterSessaoAutenticada,
} from "@/lib/auth"

export const runtime = "nodejs"

async function validarAdmin(request: Request) {
  const sessao = await obterSessaoAutenticada(request)

  if (!sessao || sessao.perfil !== "admin") {
    return null
  }

  return sessao
}

export async function GET(request: Request) {
  const sessao = await validarAdmin(request)

  if (!sessao) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  try {
    const usuarios = await listarUsuariosSistema()
    return NextResponse.json({ ok: true, usuarios })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao listar usuarios"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const sessao = await validarAdmin(request)

  if (!sessao) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const usuario = body?.usuario?.trim()
  const senha = body?.senha?.trim()
  const perfil = body?.perfil === "admin" ? "admin" : "user"

  if (!usuario || !senha) {
    return NextResponse.json({ error: "Informe usuario e senha" }, { status: 400 })
  }

  try {
    await criarUsuarioSistema({ usuario, senha, perfil })
    const usuarios = await listarUsuariosSistema()
    return NextResponse.json({ ok: true, usuarios })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao criar usuario"

    if (/UNIQUE|constraint/i.test(mensagem)) {
      return NextResponse.json({ error: "Usuario ja existe" }, { status: 409 })
    }

    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const sessao = await validarAdmin(request)

  if (!sessao) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const senha = typeof body?.senha === "string" ? body.senha : undefined
  const perfil = body?.perfil === "admin" || body?.perfil === "user" ? body.perfil : undefined
  const ativo = typeof body?.ativo === "boolean" ? body.ativo : undefined

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID de usuario invalido" }, { status: 400 })
  }

  if (!senha && !perfil && typeof ativo !== "boolean") {
    return NextResponse.json({ error: "Nenhuma alteracao informada" }, { status: 400 })
  }

  try {
    const usuario = await atualizarUsuarioSistema(id, { senha, perfil, ativo })
    return NextResponse.json({ ok: true, usuario })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao atualizar usuario"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}
