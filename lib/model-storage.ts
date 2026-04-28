import "server-only"

import { promises as fs } from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const NOME_MODELO_PADRAO = "modelo.docx"
const NOME_MODELO_CUSTOM = "modelo_custom.docx"

function obterCaminhoLocal(nomeArquivo = NOME_MODELO_PADRAO) {
  return path.join(process.cwd(), nomeArquivo)
}

function obterBucketModelos() {
  return process.env.SUPABASE_MODELOS_BUCKET || "modelos"
}

function criarClienteAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function lerArquivoSupabase(nomeArquivo: string) {
  const cliente = criarClienteAdminSupabase()

  if (!cliente) {
    return null
  }

  const { data, error } = await cliente.storage.from(obterBucketModelos()).download(nomeArquivo)

  if (error || !data) {
    return null
  }

  return Buffer.from(await data.arrayBuffer())
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
  const doSupabase = await lerArquivoSupabase(nomeArquivo)

  if (doSupabase) {
    return doSupabase
  }

  const local = await lerArquivoLocal(nomeArquivo)

  if (local) {
    return local
  }

  throw new Error(`Modelo não encontrado: ${nomeArquivo}`)
}

export async function lerModeloAtivoArquivo() {
  const custom = await lerArquivoSupabase(NOME_MODELO_CUSTOM)

  if (custom) {
    return { conteudo: custom, nomeArquivo: NOME_MODELO_CUSTOM, origem: "custom" as const }
  }

  const customLocal = await lerArquivoLocal(NOME_MODELO_CUSTOM)

  if (customLocal) {
    return { conteudo: customLocal, nomeArquivo: NOME_MODELO_CUSTOM, origem: "custom" as const }
  }

  const padrao = await lerModeloArquivo(NOME_MODELO_PADRAO)
  return { conteudo: padrao, nomeArquivo: NOME_MODELO_PADRAO, origem: "padrao" as const }
}

export async function salvarModeloCustomizado(buffer: Buffer) {
  const cliente = criarClienteAdminSupabase()

  if (cliente) {
    const { error } = await cliente.storage.from(obterBucketModelos()).upload(NOME_MODELO_CUSTOM, buffer, {
      upsert: true,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })

    if (error) {
      throw error
    }

    return { destino: "supabase" }
  }

  if (process.env.VERCEL) {
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY e SUPABASE_MODELOS_BUCKET para permitir upload do modelo na Vercel")
  }

  await fs.writeFile(obterCaminhoLocal(NOME_MODELO_CUSTOM), buffer)
  return { destino: "local" }
}

export async function excluirModeloCustomizado() {
  const cliente = criarClienteAdminSupabase()

  if (cliente) {
    const { data, error } = await cliente.storage.from(obterBucketModelos()).remove([NOME_MODELO_CUSTOM])

    if (error) {
      throw error
    }

    const removido = Array.isArray(data) ? data.some((item) => item.name === NOME_MODELO_CUSTOM) : false
    return { destino: "supabase" as const, removido }
  }

  try {
    await fs.unlink(obterCaminhoLocal(NOME_MODELO_CUSTOM))
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
  const modelo = await lerModeloAtivoArquivo()

  return {
    nomeArquivo: modelo.nomeArquivo,
    origem: modelo.origem,
  }
}
