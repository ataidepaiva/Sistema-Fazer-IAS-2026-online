import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const HOST_CANONICO = (process.env.NEXT_PUBLIC_CANONICAL_HOST || "sistema-fazer-ias-2026-online.vercel.app").toLowerCase()

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get("host")?.toLowerCase()

  if (process.env.NODE_ENV === "production" && host && host !== HOST_CANONICO) {
    const url = new URL(`${request.nextUrl.pathname}${search}`, `https://${HOST_CANONICO}`)
    return NextResponse.redirect(url, 308)
  }

  const temSessao = Boolean(request.cookies.get("sinfo-session")?.value)
  const perfilLegacy = request.cookies.get("sinfo-auth")?.value
  const autenticadoLegacy = perfilLegacy === "user" || perfilLegacy === "admin"
  const autenticado = temSessao || autenticadoLegacy

  const rotasProtegidas = ["/dashboard", "/lauda"]
  const rotaProtegida = rotasProtegidas.some((rota) => pathname.startsWith(rota))

  if (rotaProtegida && !autenticado) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (pathname === "/login" && autenticado) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
