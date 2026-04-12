import "server-only"

import fs from "fs"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"

const cacheModelos = new Map<string, string>()

function lerModelo(modeloPath: string) {
  const modeloEmCache = cacheModelos.get(modeloPath)

  if (modeloEmCache) {
    return modeloEmCache
  }

  const content = fs.readFileSync(modeloPath, "binary")
  cacheModelos.set(modeloPath, content)
  return content
}

export function gerarDoc(modeloPath: string, dados: object) {
  const content = lerModelo(modeloPath)

  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render(dados)

  return doc.getZip().generate({ type: "nodebuffer" })
}