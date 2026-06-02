import { NextResponse } from "next/server"
import { autenticarUsuario, criarSessao, obterDuracaoSessaoSegundos } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const usuario = body?.usuario?.trim() || ""
  const senha = body?.senha?.trim() || ""
  const usuarioAutenticado = await autenticarUsuario(usuario, senha)

  if (!usuarioAutenticado) {
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 })
  }

  const sessao = await criarSessao(usuarioAutenticado)

  const response = NextResponse.json({ ok: true, perfil: sessao.perfil, usuario: sessao.usuario })
  const maxAge = obterDuracaoSessaoSegundos()

  response.cookies.set("sinfo-session", sessao.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  })

  response.cookies.set("sinfo-auth", sessao.perfil, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  })

  response.cookies.set("sinfo-user", sessao.usuario, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  })

  response.cookies.set("sinfo-user-key", sessao.chave, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  })

  response.cookies.set("sinfo-role", sessao.perfil, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  })

  return response
}
