import "server-only"

import { createClient } from "@libsql/client"

function obterConfigTurso() {
  const url = process.env.TURSO_DATABASE_URL?.trim()
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

  if (!url || !authToken) {
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
