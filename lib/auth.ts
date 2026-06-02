import "server-only"

import crypto from "crypto"
import { criarClienteTurso } from "@/lib/turso"

type Perfil = "user" | "admin"

const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 12

interface UsuarioAutenticado {
  id: number | null
  usuario: string
  perfil: Perfil
  chave: string
}

interface SessaoAutenticada {
  token: string
  usuario: string
  perfil: Perfil
  chave: string
  expiraEm: string
}

interface UsuarioSistema {
  id: number
  usuario: string
  perfil: Perfil
  ativo: boolean
  criadoEm: string
}

interface CredenciaisBase {
  usuarioComum: string | null
  senhaComum: string | null
  usuarioAdmin: string
  senhaAdmin: string | null
}

function obterCredenciaisBase(): CredenciaisBase {
  const usuarioComumEnv = process.env.USER_USERNAME?.trim() || null
  const senhaComumEnv = process.env.USER_PASSWORD?.trim() || null
  const usuarioAdmin = process.env.ADMIN_USERNAME?.trim() || "admin"
  const senhaAdminEnv = process.env.ADMIN_PASSWORD?.trim() || null

  if (process.env.NODE_ENV === "production") {
    return {
      usuarioComum: usuarioComumEnv,
      senhaComum: senhaComumEnv,
      usuarioAdmin,
      senhaAdmin: senhaAdminEnv,
    }
  }

  return {
    usuarioComum: usuarioComumEnv || "usuario",
    senhaComum: senhaComumEnv || "123456",
    usuarioAdmin,
    senhaAdmin: senhaAdminEnv || "admin123",
  }
}

function parseCookies(request: Request) {
  const cookiesHeader = request.headers.get("cookie") || ""
  const itens = cookiesHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)

  const cookies = new Map<string, string>()

  for (const item of itens) {
    const separador = item.indexOf("=")

    if (separador <= 0) {
      continue
    }

    const nome = item.slice(0, separador).trim()
    const valor = item.slice(separador + 1).trim()

    if (nome) {
      cookies.set(nome, decodeURIComponent(valor))
    }
  }

  return cookies
}

async function garantirTabelasAuth() {
  const cliente = criarClienteTurso()

  if (!cliente) {
    return null
  }

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

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS sessoes (
      token TEXT PRIMARY KEY,
      usuario_id INTEGER,
      usuario TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK (perfil IN ('user', 'admin')),
      chave TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  await inicializarUsuariosPadrao(cliente)

  return cliente
}

async function inicializarUsuariosPadrao(cliente: NonNullable<ReturnType<typeof criarClienteTurso>>) {
  const { usuarioComum, senhaComum, usuarioAdmin, senhaAdmin } = obterCredenciaisBase()

  if (usuarioComum && senhaComum) {
    await cliente.execute({
      sql: `
        INSERT INTO usuarios (usuario, senha, perfil, ativo)
        VALUES (?, ?, 'user', 1)
        ON CONFLICT(usuario) DO UPDATE SET
          senha = excluded.senha,
          perfil = excluded.perfil,
          ativo = 1
      `,
      args: [usuarioComum, senhaComum],
    })
  }

  if (senhaAdmin) {
    await cliente.execute({
      sql: `
        INSERT INTO usuarios (usuario, senha, perfil, ativo)
        VALUES (?, ?, 'admin', 1)
        ON CONFLICT(usuario) DO UPDATE SET
          senha = excluded.senha,
          perfil = excluded.perfil,
          ativo = 1
      `,
      args: [usuarioAdmin, senhaAdmin],
    })
  }
}

function autenticarPorVariaveis(usuario: string, senha: string): UsuarioAutenticado | null {
  const { usuarioComum, senhaComum, usuarioAdmin, senhaAdmin } = obterCredenciaisBase()

  if (usuarioComum && senhaComum && usuario === usuarioComum && senha === senhaComum) {
    return {
      id: null,
      usuario,
      perfil: "user",
      chave: `legacy:${usuario.toLowerCase()}`,
    }
  }

  if (senhaAdmin && usuario === usuarioAdmin && senha === senhaAdmin) {
    return {
      id: null,
      usuario,
      perfil: "admin",
      chave: `legacy:${usuario.toLowerCase()}`,
    }
  }

  return null
}

export async function autenticarUsuario(usuarioRaw: string, senhaRaw: string) {
  const usuario = (usuarioRaw || "").trim()
  const senha = (senhaRaw || "").trim()

  if (!usuario || !senha) {
    return null
  }

  let cliente = null

  try {
    cliente = await garantirTabelasAuth()
  } catch {
    cliente = null
  }

  if (!cliente) {
    return autenticarPorVariaveis(usuario, senha)
  }

  const resultado = await cliente.execute({
    sql: `
      SELECT id, usuario, senha, perfil
      FROM usuarios
      WHERE usuario = ? AND ativo = 1
      LIMIT 1
    `,
    args: [usuario],
  })

  const linha = resultado.rows[0]

  if (!linha) {
    return null
  }

  const senhaBanco = String(linha.senha || "")

  if (senhaBanco !== senha) {
    return null
  }

  const id = Number(linha.id)
  const perfil = String(linha.perfil || "user") === "admin" ? "admin" : "user"

  return {
    id,
    usuario: String(linha.usuario || usuario),
    perfil,
    chave: `user:${id}`,
  } as UsuarioAutenticado
}

export async function criarSessao(usuario: UsuarioAutenticado): Promise<SessaoAutenticada> {
  const token = crypto.randomUUID()
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000).toISOString()
  let cliente = null

  try {
    cliente = await garantirTabelasAuth()
  } catch {
    cliente = null
  }

  if (cliente) {
    await cliente.execute({
      sql: `
        INSERT INTO sessoes (token, usuario_id, usuario, perfil, chave, expira_em)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [token, usuario.id, usuario.usuario, usuario.perfil, usuario.chave, expiraEm],
    })

    await cliente.execute({
      sql: `DELETE FROM sessoes WHERE expira_em <= datetime('now')`,
      args: [],
    })
  }

  return {
    token,
    usuario: usuario.usuario,
    perfil: usuario.perfil,
    chave: usuario.chave,
    expiraEm,
  }
}

export async function obterSessaoAutenticada(request: Request) {
  const cookies = parseCookies(request)
  const token = cookies.get("sinfo-session")
  let cliente = null

  try {
    cliente = await garantirTabelasAuth()
  } catch {
    cliente = null
  }

  if (token && cliente) {
    const resultado = await cliente.execute({
      sql: `
        SELECT usuario, perfil, chave, expira_em
        FROM sessoes
        WHERE token = ?
        LIMIT 1
      `,
      args: [token],
    })

    const linha = resultado.rows[0]

    if (linha) {
      const expiraEm = String(linha.expira_em || "")

      if (expiraEm && new Date(expiraEm).getTime() > Date.now()) {
        return {
          token,
          usuario: String(linha.usuario || ""),
          perfil: String(linha.perfil || "user") === "admin" ? "admin" : "user",
          chave: String(linha.chave || ""),
          expiraEm,
        } as SessaoAutenticada
      }

      await cliente.execute({
        sql: `DELETE FROM sessoes WHERE token = ?`,
        args: [token],
      })
    }
  }

  const perfilLegacy = cookies.get("sinfo-auth")
  const chaveLegacy = cookies.get("sinfo-user-key")
  const usuarioLegacy = cookies.get("sinfo-user")

  if ((perfilLegacy === "user" || perfilLegacy === "admin") && chaveLegacy) {
    return {
      token: token || "",
      usuario: usuarioLegacy || "",
      perfil: perfilLegacy,
      chave: chaveLegacy,
      expiraEm: new Date(Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000).toISOString(),
    } as SessaoAutenticada
  }

  return null
}

export async function removerSessao(request: Request) {
  const cookies = parseCookies(request)
  const token = cookies.get("sinfo-session")
  let cliente = null

  try {
    cliente = await garantirTabelasAuth()
  } catch {
    cliente = null
  }

  if (token && cliente) {
    await cliente.execute({
      sql: `DELETE FROM sessoes WHERE token = ?`,
      args: [token],
    })
  }
}

export function obterDuracaoSessaoSegundos() {
  return DURACAO_SESSAO_SEGUNDOS
}

export async function listarUsuariosSistema(): Promise<UsuarioSistema[]> {
  const cliente = await garantirTabelasAuth()

  if (!cliente) {
    throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para gerenciar usuarios")
  }

  const resultado = await cliente.execute(`
    SELECT id, usuario, perfil, ativo, criado_em
    FROM usuarios
    ORDER BY usuario ASC
  `)

  return resultado.rows.map((linha) => ({
    id: Number(linha.id),
    usuario: String(linha.usuario || ""),
    perfil: String(linha.perfil || "user") === "admin" ? "admin" : "user",
    ativo: Number(linha.ativo || 0) === 1,
    criadoEm: String(linha.criado_em || ""),
  }))
}

export async function criarUsuarioSistema(input: {
  usuario: string
  senha: string
  perfil: Perfil
}) {
  const cliente = await garantirTabelasAuth()

  if (!cliente) {
    throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para gerenciar usuarios")
  }

  const usuario = (input.usuario || "").trim()
  const senha = (input.senha || "").trim()
  const perfil = input.perfil === "admin" ? "admin" : "user"

  if (!usuario || !senha) {
    throw new Error("Informe usuario e senha")
  }

  await cliente.execute({
    sql: `
      INSERT INTO usuarios (usuario, senha, perfil, ativo)
      VALUES (?, ?, ?, 1)
    `,
    args: [usuario, senha, perfil],
  })
}

export async function atualizarUsuarioSistema(
  id: number,
  input: { senha?: string; perfil?: Perfil; ativo?: boolean }
) {
  const cliente = await garantirTabelasAuth()

  if (!cliente) {
    throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para gerenciar usuarios")
  }

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("ID de usuario invalido")
  }

  if (typeof input.senha === "string" && input.senha.trim()) {
    await cliente.execute({
      sql: `UPDATE usuarios SET senha = ? WHERE id = ?`,
      args: [input.senha.trim(), id],
    })
  }

  if (input.perfil === "admin" || input.perfil === "user") {
    await cliente.execute({
      sql: `UPDATE usuarios SET perfil = ? WHERE id = ?`,
      args: [input.perfil, id],
    })
  }

  if (typeof input.ativo === "boolean") {
    await cliente.execute({
      sql: `UPDATE usuarios SET ativo = ? WHERE id = ?`,
      args: [input.ativo ? 1 : 0, id],
    })
  }

  const resultado = await cliente.execute({
    sql: `SELECT id, usuario, perfil, ativo, criado_em FROM usuarios WHERE id = ? LIMIT 1`,
    args: [id],
  })

  const linha = resultado.rows[0]

  if (!linha) {
    throw new Error("Usuario nao encontrado")
  }

  return {
    id: Number(linha.id),
    usuario: String(linha.usuario || ""),
    perfil: String(linha.perfil || "user") === "admin" ? "admin" : "user",
    ativo: Number(linha.ativo || 0) === 1,
    criadoEm: String(linha.criado_em || ""),
  } as UsuarioSistema
}
