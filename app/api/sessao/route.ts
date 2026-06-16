import { NextResponse } from "next/server"
import { obterSessaoAutenticada } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const sessao = await obterSessaoAutenticada(request)

  if (!sessao) {
    return NextResponse.json({ error: "Sessao invalida ou expirada" }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    usuario: sessao.usuario,
    perfil: sessao.perfil,
    chave: sessao.chave,
  })
}
