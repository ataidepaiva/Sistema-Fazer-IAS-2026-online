import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL?.trim()
const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

if (!url || !authToken) {
  console.error("Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN antes de executar o seed.")
  process.exit(1)
}

const total = Number(process.env.SEED_USERS_TOTAL || "50")
const inicio = Number(process.env.SEED_USERS_START || "1")
const prefixo = (process.env.SEED_USERS_PREFIX || "usuario").trim()
const senhaPadrao = (process.env.SEED_USERS_PASSWORD || "Senha@123").trim()

if (!Number.isFinite(total) || total <= 0) {
  console.error("SEED_USERS_TOTAL deve ser um numero maior que zero.")
  process.exit(1)
}

if (!Number.isFinite(inicio) || inicio <= 0) {
  console.error("SEED_USERS_START deve ser um numero maior que zero.")
  process.exit(1)
}

if (!prefixo) {
  console.error("SEED_USERS_PREFIX nao pode ser vazio.")
  process.exit(1)
}

if (!senhaPadrao) {
  console.error("SEED_USERS_PASSWORD nao pode ser vazio.")
  process.exit(1)
}

const cliente = createClient({ url, authToken })

await cliente.execute(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK (perfil IN ('user', 'admin')),
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

let criadosOuAtualizados = 0

for (let i = 0; i < total; i += 1) {
  const numero = inicio + i
  const sufixo = String(numero).padStart(3, "0")
  const usuario = `${prefixo}${sufixo}`

  await cliente.execute({
    sql: `
      INSERT INTO usuarios (usuario, senha, perfil, ativo)
      VALUES (?, ?, 'user', 1)
      ON CONFLICT(usuario) DO UPDATE SET
        senha = excluded.senha,
        perfil = excluded.perfil,
        ativo = 1
    `,
    args: [usuario, senhaPadrao],
  })

  criadosOuAtualizados += 1
}

console.log(`Seed concluido: ${criadosOuAtualizados} usuarios processados.`)
console.log(`Prefixo: ${prefixo}`)
console.log(`Faixa: ${inicio} ate ${inicio + total - 1}`)
