import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const HOST_ORIGEM_REDIRECT = "sistema-fazer-ias-2026-online.vercel.app"
const HOST_DESTINO_REDIRECT = "sistema-fazer-ias-2026-online-six.vercel.app"

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get("host")

  if (host === HOST_ORIGEM_REDIRECT) {
    const url = new URL(`${request.nextUrl.pathname}${search}`, `https://${HOST_DESTINO_REDIRECT}`)
    return NextResponse.redirect(url, 308)
  }

  const perfil = request.cookies.get("sinfo-auth")?.value
  const autenticado = perfil === "user" || perfil === "admin"

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
