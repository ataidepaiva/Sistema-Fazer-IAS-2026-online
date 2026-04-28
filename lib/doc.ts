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

async function lerModelo(modeloPath: string) {
  const modeloEmCache = cacheModelos.get(modeloPath)

  if (modeloEmCache) {
    return modeloEmCache
  }

  const content = modeloPath === "modelo.docx"
    ? (await lerModeloAtivoArquivo()).conteudo
    : await lerModeloArquivo(modeloPath)

  cacheModelos.set(modeloPath, content)
  return content
}

export async function gerarDoc(modeloPath: string, dados: object) {
  const content = await lerModelo(modeloPath)

  const zip = new PizZip(content.toString("binary"))
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render(dados)

  return doc.getZip().generate({ type: "nodebuffer" })
}