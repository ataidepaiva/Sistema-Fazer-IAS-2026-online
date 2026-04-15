import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

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

  if (!segredoConfigurado) {
    return {
      ok: false,
      status: 500,
      mensagem: "Configure KEEP_ALIVE_SECRET ou CRON_SECRET para proteger o keep-alive.",
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

function criarClienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !chave) {
    return null
  }

  return createClient(url, chave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET(request: Request) {
  const acesso = validarAcesso(request)

  if (!acesso.ok) {
    return NextResponse.json({ ok: false, error: acesso.mensagem }, { status: acesso.status })
  }

  const cliente = criarClienteSupabase()

  if (!cliente) {
    return NextResponse.json(
      { ok: false, error: "Variáveis do Supabase não configuradas." },
      { status: 500 }
    )
  }

  const inicio = Date.now()
  const { data, error } = await cliente.storage.listBuckets()

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    tookMs: Date.now() - inicio,
    buckets: data?.map((bucket) => bucket.name) || [],
  })
}
