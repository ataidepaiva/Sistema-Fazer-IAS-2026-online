import fs from "fs"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"

export function gerarDoc(modeloPath: string, dados: Record<string, any>) {
  const content = fs.readFileSync(modeloPath, "binary")

  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip)

  doc.setData(dados)
  doc.render()

  return doc.getZip().generate({ type: "nodebuffer" })
}