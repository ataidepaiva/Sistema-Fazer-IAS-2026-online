import "server-only"

import { createClient } from "@libsql/client"

function obterConfigTurso() {
  const url = process.env.TURSO_DATABASE_URL?.trim()
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

  // Debug logging para produção
  console.log("[TURSO_DEBUG]", {
    url_presente: !!url,
    token_presente: !!authToken,
    url_length: url?.length || 0,
    token_length: authToken?.length || 0,
    ambiente: process.env.NODE_ENV,
  })

  if (!url || !authToken) {
    console.error("[TURSO_ERROR] Variáveis de ambiente não configuradas", {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    })
    return null
  }

  return { url, authToken }
}

export function criarClienteTurso() {
  const config = obterConfigTurso()

  if (!config) {
    return null
  }

  return createClient(config)
}
