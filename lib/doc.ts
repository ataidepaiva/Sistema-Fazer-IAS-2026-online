import "server-only"

import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { lerModeloArquivo, lerModeloAtivoArquivo } from "@/lib/model-storage"

const cacheModelos = new Map<string, Buffer>()

export function limparCacheModelo(modeloPath?: string) {
  if (modeloPath) {
    cacheModelos.delete(modeloPath)
    return
  }

  cacheModelos.clear()
}

async function lerModelo(modeloPath: string, userKey?: string) {
  const cacheKey = userKey ? `${modeloPath}::${userKey}` : modeloPath
  const modeloEmCache = cacheModelos.get(cacheKey)

  if (modeloEmCache) {
    return modeloEmCache
  }

  const content = modeloPath === "modelo.docx"
    ? (await lerModeloAtivoArquivo(userKey)).conteudo
    : await lerModeloArquivo(modeloPath)

  cacheModelos.set(cacheKey, content)
  return content
}

export async function gerarDoc(modeloPath: string, dados: object, userKey?: string) {
  const content = await lerModelo(modeloPath, userKey)

  const zip = new PizZip(content.toString("binary"))
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render(dados)

  return doc.getZip().generate({ type: "nodebuffer" })
}