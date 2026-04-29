import "server-only"

import { createClient } from "@libsql/client"

function obterConfigTurso() {
  try {
    // Tenta ler diretamente do process.env sem trim() inicialmente
    const rawUrl = process.env.TURSO_DATABASE_URL
    const rawToken = process.env.TURSO_AUTH_TOKEN

    console.log("[TURSO_DEBUG_RAW]", {
      url_type: typeof rawUrl,
      token_type: typeof rawToken,
      url_undefined: rawUrl === undefined,
      token_undefined: rawToken === undefined,
      env_keys: Object.keys(process.env).filter((k) => k.includes("TURSO")),
    })

    const url = rawUrl?.trim()
    const authToken = rawToken?.trim()

    console.log("[TURSO_DEBUG_TRIMMED]", {
      url_presente: !!url,
      token_presente: !!authToken,
      url_length: url?.length || 0,
      token_length: authToken?.length || 0,
      node_env: process.env.NODE_ENV,
    })

    if (!url || !authToken) {
      console.error("[TURSO_ERROR_CONFIG]", {
        raison: "Variáveis não configuradas",
        TURSO_DATABASE_URL_raw: rawUrl ? `[SET_${rawUrl.length}_chars]` : "UNDEFINED",
        TURSO_AUTH_TOKEN_raw: rawToken ? `[SET_${rawToken.length}_chars]` : "UNDEFINED",
      })
      return null
    }

    return { url, authToken }
  } catch (err) {
    console.error("[TURSO_ERROR_EXCEPTION]", err instanceof Error ? err.message : String(err))
    return null
  }
}

export function criarClienteTurso() {
  try {
    const config = obterConfigTurso()

    if (!config) {
      console.warn("[TURSO_WARN] Não conseguiu configurar cliente - config é null")
      return null
    }

    console.log("[TURSO_CRIAR_CLIENT]", "Criando cliente com URL:", config.url.substring(0, 30) + "...")

    const client = createClient(config)

    console.log("[TURSO_CRIAR_CLIENT_SUCCESS]", "Cliente criado com sucesso")

    return client
  } catch (err) {
    console.error("[TURSO_ERROR_CREATE_CLIENT]", err instanceof Error ? err.message : String(err))
    return null
  }
}
