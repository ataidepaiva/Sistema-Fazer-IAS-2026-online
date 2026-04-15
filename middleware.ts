import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const autenticado = request.cookies.get("sinfo-auth")?.value === "ok"

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
  matcher: ["/dashboard/:path*", "/lauda/:path*", "/login"],
}
