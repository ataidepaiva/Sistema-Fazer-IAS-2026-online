import { NextResponse } from "next/server"

const USUARIO_ADMIN = process.env.ADMIN_USERNAME?.trim() || "admin"
const SENHA_ADMIN = process.env.ADMIN_PASSWORD?.trim()

function obterPerfil(usuario: string, senha: string) {
  if (usuario === "seemg" && senha === "seemg") return "user"
  if (SENHA_ADMIN && usuario === USUARIO_ADMIN && senha === SENHA_ADMIN) return "admin"
  return null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const usuario = body?.usuario?.trim()
  const senha = body?.senha?.trim()
  const perfil = obterPerfil(usuario, senha)

  if (!perfil) {
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, perfil })

  response.cookies.set("sinfo-auth", perfil, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  response.cookies.set("sinfo-role", perfil, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return response
}
