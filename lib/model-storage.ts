import "server-only"

import { promises as fs } from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const NOME_PADRAO_MODELO = "modelo.docx"

function obterCaminhoLocal(nomeArquivo = NOME_PADRAO_MODELO) {
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

export async function lerModeloArquivo(nomeArquivo = NOME_PADRAO_MODELO) {
  const cliente = criarClienteAdminSupabase()

  if (cliente) {
    const { data, error } = await cliente.storage.from(obterBucketModelos()).download(nomeArquivo)

    if (!error && data) {
      return Buffer.from(await data.arrayBuffer())
    }
  }

  return await fs.readFile(obterCaminhoLocal(nomeArquivo))
}

export async function salvarModeloArquivo(buffer: Buffer, nomeArquivo = NOME_PADRAO_MODELO) {
  const cliente = criarClienteAdminSupabase()

  if (cliente) {
    const { error } = await cliente.storage.from(obterBucketModelos()).upload(nomeArquivo, buffer, {
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

  await fs.writeFile(obterCaminhoLocal(nomeArquivo), buffer)
  return { destino: "local" }
}
