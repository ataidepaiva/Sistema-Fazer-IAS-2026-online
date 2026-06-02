import "server-only"

import { promises as fs } from "fs"
import path from "path"
import { criarClienteTurso, criarClienteTursoObrigatorio } from "@/lib/turso"

const NOME_MODELO_PADRAO = "modelo.docx"
const NOME_MODELO_CUSTOM = "modelo_custom.docx"
const ID_REGISTRO_MODELO_CUSTOM = 1
const ID_REGISTRO_MODELO_PRINCIPAL = 1
const CHAVE_MODELO_GLOBAL_LEGADO = "global"

function obterCaminhoLocal(nomeArquivo = NOME_MODELO_PADRAO) {
  return path.join(process.cwd(), nomeArquivo)
}

function obterNomeArquivoCustomLocalPorUsuario(userKey: string) {
  const chaveSegura = (userKey || CHAVE_MODELO_GLOBAL_LEGADO)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80)

  return `${NOME_MODELO_CUSTOM}.${chaveSegura}`
}

async function garantirTabelaModelos() {
  const cliente = criarClienteTurso()

  if (!cliente) {
    return null
  }

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS modelos (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nome_arquivo TEXT NOT NULL,
      conteudo BLOB NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS modelos_usuario (
      user_key TEXT PRIMARY KEY,
      nome_arquivo TEXT NOT NULL,
      conteudo BLOB NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  return cliente
}

async function garantirTabelaModelosObrigatoria() {
  const cliente = criarClienteTursoObrigatorio()

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS modelos (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nome_arquivo TEXT NOT NULL,
      conteudo BLOB NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS modelos_usuario (
      user_key TEXT PRIMARY KEY,
      nome_arquivo TEXT NOT NULL,
      conteudo BLOB NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  return cliente
}

async function garantirTabelaModeloPrincipal() {
  const cliente = criarClienteTurso()

  if (!cliente) {
    return null
  }

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS modelos_principais (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nome_arquivo TEXT NOT NULL,
      conteudo BLOB NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  return cliente
}

async function garantirTabelaModeloPrincipalObrigatoria() {
  const cliente = criarClienteTursoObrigatorio()

  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS modelos_principais (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nome_arquivo TEXT NOT NULL,
      conteudo BLOB NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  return cliente
}

async function lerModeloCustomTurso(userKey: string) {
  const cliente = await garantirTabelaModelos()

  if (!cliente) {
    return null
  }

  const resultado = await cliente.execute({
    sql: "SELECT nome_arquivo, conteudo FROM modelos_usuario WHERE user_key = ?",
    args: [userKey],
  })

  const linha = resultado.rows[0]

  if (!linha) {
    return null
  }

  const nomeArquivo = String(linha.nome_arquivo || NOME_MODELO_CUSTOM)
  const conteudo = converterConteudoParaBuffer(linha.conteudo)

  if (!conteudo) {
    return null
  }

  return {
    nomeArquivo,
    conteudo,
  }
}

async function lerModeloCustomTursoLegadoGlobal() {
  const cliente = await garantirTabelaModelos()

  if (!cliente) {
    return null
  }

  const resultado = await cliente.execute({
    sql: "SELECT nome_arquivo, conteudo FROM modelos WHERE id = ?",
    args: [ID_REGISTRO_MODELO_CUSTOM],
  })

  const linha = resultado.rows[0]

  if (!linha) {
    return null
  }

  const nomeArquivo = String(linha.nome_arquivo || NOME_MODELO_CUSTOM)
  const conteudo = converterConteudoParaBuffer(linha.conteudo)

  if (!conteudo) {
    return null
  }

  return {
    nomeArquivo,
    conteudo,
  }
}

async function lerModeloPrincipalTurso() {
  const cliente = await garantirTabelaModeloPrincipal()

  if (!cliente) {
    return null
  }

  const resultado = await cliente.execute({
    sql: "SELECT nome_arquivo, conteudo FROM modelos_principais WHERE id = ?",
    args: [ID_REGISTRO_MODELO_PRINCIPAL],
  })

  const linha = resultado.rows[0]

  if (!linha) {
    return null
  }

  const nomeArquivo = String(linha.nome_arquivo || NOME_MODELO_PADRAO)
  const conteudo = converterConteudoParaBuffer(linha.conteudo)

  if (!conteudo) {
    return null
  }

  return {
    nomeArquivo,
    conteudo,
  }
}

function converterConteudoParaBuffer(conteudo: unknown) {
  if (!conteudo) {
    return null
  }

  if (Buffer.isBuffer(conteudo)) {
    return conteudo
  }

  if (conteudo instanceof Uint8Array) {
    return Buffer.from(conteudo)
  }

  if (conteudo instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(conteudo))
  }

  return null
}

async function lerArquivoLocal(nomeArquivo: string) {
  try {
    return await fs.readFile(obterCaminhoLocal(nomeArquivo))
  } catch (error) {
    const erro = error as NodeJS.ErrnoException

    if (erro?.code === "ENOENT") {
      return null
    }

    throw error
  }
}

export async function lerModeloArquivo(nomeArquivo = NOME_MODELO_PADRAO) {
  if (nomeArquivo === NOME_MODELO_PADRAO) {
    try {
      const principalTurso = await lerModeloPrincipalTurso()

      if (principalTurso) {
        return principalTurso.conteudo
      }
    } catch {
      // Se o Turso falhar, tenta fallback local abaixo.
    }
  }

  const local = await lerArquivoLocal(nomeArquivo)

  if (local) {
    return local
  }

  throw new Error(`Modelo não encontrado: ${nomeArquivo}`)
}

export async function lerModeloAtivoArquivo(userKey = CHAVE_MODELO_GLOBAL_LEGADO) {
  let customTurso = null

  try {
    customTurso = await lerModeloCustomTurso(userKey)
  } catch {
    customTurso = null
  }

  if (!customTurso && userKey === CHAVE_MODELO_GLOBAL_LEGADO) {
    try {
      customTurso = await lerModeloCustomTursoLegadoGlobal()
    } catch {
      customTurso = null
    }
  }

  if (customTurso) {
    return { conteudo: customTurso.conteudo, nomeArquivo: customTurso.nomeArquivo, origem: "custom" as const }
  }

  const nomeArquivoLocalPorUsuario = obterNomeArquivoCustomLocalPorUsuario(userKey)
  const customLocal = await lerArquivoLocal(nomeArquivoLocalPorUsuario)

  if (!customLocal && userKey === CHAVE_MODELO_GLOBAL_LEGADO) {
    const customLocalLegado = await lerArquivoLocal(NOME_MODELO_CUSTOM)

    if (customLocalLegado) {
      return { conteudo: customLocalLegado, nomeArquivo: NOME_MODELO_CUSTOM, origem: "custom" as const }
    }
  }

  if (customLocal) {
    return { conteudo: customLocal, nomeArquivo: nomeArquivoLocalPorUsuario, origem: "custom" as const }
  }

  try {
    const principalTurso = await lerModeloPrincipalTurso()

    if (principalTurso) {
      return { conteudo: principalTurso.conteudo, nomeArquivo: principalTurso.nomeArquivo, origem: "principal" as const }
    }
  } catch {
    // Se o Turso falhar, tenta fallback local abaixo.
  }

  const padrao = await lerModeloArquivo(NOME_MODELO_PADRAO)
  return { conteudo: padrao, nomeArquivo: NOME_MODELO_PADRAO, origem: "padrao" as const }
}

export async function salvarModeloPrincipalImutavel(buffer: Buffer, nomeArquivo = NOME_MODELO_PADRAO) {
  const cliente = process.env.VERCEL ? await garantirTabelaModeloPrincipalObrigatoria() : await garantirTabelaModeloPrincipal()

  if (!cliente) {
    throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para salvar o modelo principal imutável")
  }

  const resultado = await cliente.execute({
    sql: `
      INSERT INTO modelos_principais (id, nome_arquivo, conteudo)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `,
    args: [ID_REGISTRO_MODELO_PRINCIPAL, nomeArquivo, buffer],
  })

  return {
    criado: (resultado.rowsAffected || 0) > 0,
  }
}

export async function obterStatusModeloPrincipal() {
  try {
    const principal = await lerModeloPrincipalTurso()

    if (!principal) {
      return { existe: false as const }
    }

    return {
      existe: true as const,
      nomeArquivo: principal.nomeArquivo,
    }
  } catch {
    return { existe: false as const }
  }
}

export async function salvarModeloCustomizado(buffer: Buffer, userKey = CHAVE_MODELO_GLOBAL_LEGADO) {
  const cliente = process.env.VERCEL ? await garantirTabelaModelosObrigatoria() : await garantirTabelaModelos()

  if (cliente) {
    await cliente.execute({
      sql: `
        INSERT INTO modelos_usuario (user_key, nome_arquivo, conteudo, atualizado_em)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_key) DO UPDATE SET
          nome_arquivo = excluded.nome_arquivo,
          conteudo = excluded.conteudo,
          atualizado_em = datetime('now')
      `,
      args: [userKey, NOME_MODELO_CUSTOM, buffer],
    })

    return { destino: "turso" }
  }

  if (process.env.VERCEL) {
    throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para permitir upload do modelo na Vercel")
  }

  await fs.writeFile(obterCaminhoLocal(obterNomeArquivoCustomLocalPorUsuario(userKey)), buffer)
  return { destino: "local" }
}

export async function excluirModeloCustomizado(userKey = CHAVE_MODELO_GLOBAL_LEGADO) {
  const cliente = process.env.VERCEL ? await garantirTabelaModelosObrigatoria() : await garantirTabelaModelos()

  if (cliente) {
    const resultado = await cliente.execute({
      sql: "DELETE FROM modelos_usuario WHERE user_key = ?",
      args: [userKey],
    })

    return { destino: "turso" as const, removido: (resultado.rowsAffected || 0) > 0 }
  }

  try {
    await fs.unlink(obterCaminhoLocal(obterNomeArquivoCustomLocalPorUsuario(userKey)))
    return { destino: "local" as const, removido: true }
  } catch (error) {
    const erro = error as NodeJS.ErrnoException

    if (erro?.code === "ENOENT") {
      return { destino: "local" as const, removido: false }
    }

    throw error
  }
}

export async function obterStatusModeloAtivo() {
  const modelo = await lerModeloAtivoArquivo(CHAVE_MODELO_GLOBAL_LEGADO)

  return {
    nomeArquivo: modelo.nomeArquivo,
    origem: modelo.origem,
  }
}

export async function obterStatusModeloAtivoPorUsuario(userKey: string) {
  const modelo = await lerModeloAtivoArquivo(userKey)

  return {
    nomeArquivo: modelo.nomeArquivo,
    origem: modelo.origem,
  }
}
