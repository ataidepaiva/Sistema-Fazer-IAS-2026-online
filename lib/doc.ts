import fs from "fs"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"

export function gerarDoc(modeloPath: string, dados: object) {
  const content = fs.readFileSync(modeloPath, "binary")

  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render(dados)

  return doc.getZip().generate({ type: "nodebuffer" })
}