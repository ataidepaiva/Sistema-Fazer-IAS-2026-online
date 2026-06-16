export type PerfilOffline = "user" | "admin"

interface OfflineAuthRecord {
  usuario: string
  perfil: PerfilOffline
  passwordHash: string
  atualizadoEm: string
}

export interface OfflineModelRecord {
  usuario: string
  nomeArquivo: string
  mimeType: string
  base64: string
  salvoEm: string
}

export interface OfflineUserRecord {
  usuario: string
  perfil: PerfilOffline
  atualizadoEm: string
}

const CHAVE_AUTH = "sinfo-offline-auth"
const CHAVE_USER_ATIVO = "sinfo-offline-user"
const CHAVE_MODEL_PREFIX = "sinfo-offline-model:"

function podeUsarStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function obterUsuarioOfflineAtivo() {
  if (!podeUsarStorage()) {
    return null
  }

  return window.localStorage.getItem(CHAVE_USER_ATIVO)
}

export function definirUsuarioOfflineAtivo(usuario: string) {
  if (!podeUsarStorage()) {
    return
  }

  window.localStorage.setItem(CHAVE_USER_ATIVO, usuario)
}

export function limparUsuarioOfflineAtivo() {
  if (!podeUsarStorage()) {
    return
  }

  window.localStorage.removeItem(CHAVE_USER_ATIVO)
}

function lerAuthMap() {
  if (!podeUsarStorage()) {
    return {} as Record<string, OfflineAuthRecord>
  }

  try {
    const bruto = window.localStorage.getItem(CHAVE_AUTH)
    return bruto ? (JSON.parse(bruto) as Record<string, OfflineAuthRecord>) : {}
  } catch {
    return {} as Record<string, OfflineAuthRecord>
  }
}

export function listarUsuariosOfflineDisponiveis(): OfflineUserRecord[] {
  const authMap = lerAuthMap()

  return Object.values(authMap)
    .map((registro) => ({
      usuario: registro.usuario,
      perfil: registro.perfil,
      atualizadoEm: registro.atualizadoEm,
    }))
    .sort((a, b) => a.usuario.localeCompare(b.usuario, "pt-BR"))
}

function salvarAuthMap(valor: Record<string, OfflineAuthRecord>) {
  if (!podeUsarStorage()) {
    return
  }

  window.localStorage.setItem(CHAVE_AUTH, JSON.stringify(valor))
}

async function gerarHash(valor: string) {
  const bytes = new TextEncoder().encode(valor)
  const digest = await window.crypto.subtle.digest("SHA-256", bytes)
  const array = Array.from(new Uint8Array(digest))
  return array.map((item) => item.toString(16).padStart(2, "0")).join("")
}

export async function salvarCredenciaisOffline(input: {
  usuario: string
  senha: string
  perfil: PerfilOffline
}) {
  if (!podeUsarStorage() || !input.usuario || !input.senha) {
    return
  }

  const authMap = lerAuthMap()
  const chave = input.usuario.trim().toLowerCase()
  authMap[chave] = {
    usuario: input.usuario.trim(),
    perfil: input.perfil,
    passwordHash: await gerarHash(input.senha),
    atualizadoEm: new Date().toISOString(),
  }

  salvarAuthMap(authMap)
  definirUsuarioOfflineAtivo(input.usuario.trim())
}

export async function autenticarOffline(usuario: string, senha: string) {
  if (!podeUsarStorage()) {
    return null
  }

  const authMap = lerAuthMap()
  const registro = authMap[usuario.trim().toLowerCase()]

  if (!registro) {
    return null
  }

  const hash = await gerarHash(senha)

  if (hash !== registro.passwordHash) {
    return null
  }

  definirUsuarioOfflineAtivo(registro.usuario)
  return {
    usuario: registro.usuario,
    perfil: registro.perfil,
  }
}

export function gravarCookiePerfilOffline(perfil: PerfilOffline) {
  if (typeof document === "undefined") {
    return
  }

  document.cookie = `sinfo-role=${perfil}; path=/; SameSite=Lax`
}

export function limparSessaoOfflineLocal() {
  limparUsuarioOfflineAtivo()

  if (typeof document !== "undefined") {
    document.cookie = "sinfo-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
  }
}

function obterChaveModelo(usuario?: string | null) {
  const chave = (usuario || obterUsuarioOfflineAtivo() || "anon").trim().toLowerCase()
  return `${CHAVE_MODEL_PREFIX}${chave}`
}

export async function salvarModeloOffline(input: {
  usuario?: string | null
  nomeArquivo: string
  mimeType: string
  arquivo: Blob
}) {
  if (!podeUsarStorage()) {
    return
  }

  const base64 = await blobParaBase64(input.arquivo)
  const payload: OfflineModelRecord = {
    usuario: (input.usuario || obterUsuarioOfflineAtivo() || "anon").trim(),
    nomeArquivo: input.nomeArquivo,
    mimeType: input.mimeType,
    base64,
    salvoEm: new Date().toISOString(),
  }

  window.localStorage.setItem(obterChaveModelo(input.usuario), JSON.stringify(payload))
}

export function lerModeloOffline(usuario?: string | null): OfflineModelRecord | null {
  if (!podeUsarStorage()) {
    return null
  }

  try {
    const bruto = window.localStorage.getItem(obterChaveModelo(usuario))
    return bruto ? (JSON.parse(bruto) as OfflineModelRecord) : null
  } catch {
    return null
  }
}

export function excluirModeloOffline(usuario?: string | null) {
  if (!podeUsarStorage()) {
    return
  }

  window.localStorage.removeItem(obterChaveModelo(usuario))
}

export async function blobParaBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return window.btoa(binary)
}

export function base64ParaUint8Array(base64: string) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = nomeArquivo
  link.click()
  window.URL.revokeObjectURL(url)
}
