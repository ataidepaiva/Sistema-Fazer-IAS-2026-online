import { gerarDoc } from "@/lib/doc"

interface Registro {
  titulo: string
  texto_base: string
  servidor: string
  masp: string
  pagina: string
  coluna: string
  data: string
}

async function mesclarDocs(buffers: Buffer[]) {
  const { default: DocxMerger } = await import("docx-merger")

  const merger = new DocxMerger({ pageBreak: true }, buffers)

  return await new Promise<Buffer>((resolve, reject) => {
    try {
      merger.save("nodebuffer", (data: Buffer) => {
        if (!data) {
          reject(new Error("Falha ao mesclar documentos"))
          return
        }

        resolve(data)
      })
    } catch (error) {
      reject(error)
    }
  })
}

export async function POST(req: Request) {
  const { registros }: { registros: Registro[] } = await req.json()

  if (!Array.isArray(registros) || registros.length === 0) {
    return Response.json({ error: "Nenhum registro informado" }, { status: 400 })
  }

  const docs = registros.map((item: Registro) => gerarDoc("modelo.docx", item))
  const buffer = docs.length === 1 ? docs[0] : await mesclarDocs(docs)
  const payload = new Uint8Array(buffer)

  return new Response(payload, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=documento_unico.docx"
    }
  })
}