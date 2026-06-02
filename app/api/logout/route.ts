import { NextResponse } from "next/server"
import { removerSessao } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  await removerSessao(request)

  const response = NextResponse.json({ ok: true })

  response.cookies.set("sinfo-session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  response.cookies.set("sinfo-auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  response.cookies.set("sinfo-user", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  response.cookies.set("sinfo-user-key", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  response.cookies.set("sinfo-role", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  return response
}
