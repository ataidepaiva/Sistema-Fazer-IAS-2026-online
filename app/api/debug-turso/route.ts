import { NextResponse } from "next/server"

export const runtime = "nodejs"

function usuarioEhAdmin(request: Request) {
  const cookies = request.headers.get("cookie") || ""
  return cookies
    .split(";")
    .map((item) => item.trim())
    .includes("sinfo-auth=admin")
}

export async function GET(request: Request) {
  if (!usuarioEhAdmin(request)) {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 })
  }

  const diagnostico = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    env_vars: {
      TURSO_DATABASE_URL_present: !!process.env.TURSO_DATABASE_URL,
      TURSO_DATABASE_URL_length: (process.env.TURSO_DATABASE_URL || "").length,
      TURSO_DATABASE_URL_preview: process.env.TURSO_DATABASE_URL
        ? process.env.TURSO_DATABASE_URL.substring(0, 50) + "..."
        : "UNDEFINED",
      TURSO_AUTH_TOKEN_present: !!process.env.TURSO_AUTH_TOKEN,
      TURSO_AUTH_TOKEN_length: (process.env.TURSO_AUTH_TOKEN || "").length,
      TURSO_AUTH_TOKEN_preview: process.env.TURSO_AUTH_TOKEN
        ? process.env.TURSO_AUTH_TOKEN.substring(0, 20) + "..."
        : "UNDEFINED",
    },
    all_env_keys: Object.keys(process.env)
      .filter((k) => k.includes("TURSO"))
      .map((k) => ({
        key: k,
        length: (process.env[k] || "").length,
      })),
  }

  // Tentar criar cliente Turso
  try {
    const { criarClienteTurso } = await import("@/lib/turso")
    const cliente = criarClienteTurso()

    diagnostico.cliente_turso = {
      created: !!cliente,
      status: cliente ? "success" : "failed",
    }

    if (cliente) {
      try {
        const result = await cliente.execute("SELECT 1")
        diagnostico.turso_connection = {
          status: "success",
          test_query_result: "Connected successfully",
        }
      } catch (err) {
        diagnostico.turso_connection = {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }
  } catch (err) {
    diagnostico.cliente_turso = {
      created: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return NextResponse.json(diagnostico)
}
