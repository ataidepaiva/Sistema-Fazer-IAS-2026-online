import { NextResponse } from "next/server"
import { criarClienteTurso } from "@/lib/turso"

export const runtime = "nodejs"

function extrairToken(request: Request) {
  const authorization = request.headers.get("authorization")

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim()
  }

  const { searchParams } = new URL(request.url)
  return searchParams.get("secret")?.trim() || null
}

function validarAcesso(request: Request) {
  const segredoConfigurado = process.env.KEEP_ALIVE_SECRET || process.env.CRON_SECRET

  const userAgent = request.headers.get("user-agent") || ""
  const chamadoPorCronVercel = userAgent.toLowerCase().includes("vercel-cron")

  if (!segredoConfigurado) {
    if (chamadoPorCronVercel) {
      return { ok: true as const }
    }

    return {
      ok: false,
      status: 500,
      mensagem: "Configure KEEP_ALIVE_SECRET ou CRON_SECRET para chamadas manuais do keep-alive.",
    }
  }

  const tokenRecebido = extrairToken(request)

  if (tokenRecebido !== segredoConfigurado) {
    return {
      ok: false,
      status: 401,
      mensagem: "Não autorizado.",
    }
  }

  return { ok: true as const }
}

export async function GET(request: Request) {
  const acesso = validarAcesso(request)

  if (!acesso.ok) {
    return NextResponse.json({ ok: false, error: acesso.mensagem }, { status: acesso.status })
  }

  const cliente = criarClienteTurso()

  if (!cliente) {
    return NextResponse.json(
      { ok: false, error: "Variáveis do Turso não configuradas." },
      { status: 500 }
    )
  }

  const inicio = Date.now()

  try {
    await cliente.execute("SELECT 1")
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha no healthcheck do Turso"
    return NextResponse.json(
      {
        ok: false,
        error: mensagem,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    tookMs: Date.now() - inicio,
    database: "turso",
  })
}
