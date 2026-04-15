import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const usuario = body?.usuario?.trim()
  const senha = body?.senha?.trim()

  if (usuario !== "seemg" || senha !== "seemg") {
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })

  response.cookies.set("sinfo-auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return response
}
