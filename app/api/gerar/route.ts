import { gerarDoc } from "@/lib/doc"
import archiver from "archiver"

interface Registro {
  titulo: string
  texto_base: string
  servidor: string
  masp: string
  pagina: string
  coluna: string
  data: string
}

export async function POST(req: Request) {
  const { registros }: { registros: Registro[] } = await req.json()

  const archive = archiver("zip")

  registros.forEach((item: Registro, i) => {
    const buffer = gerarDoc("modelo.docx", item)

    archive.append(buffer, {
      name: `doc_${i + 1}.docx`
    })
  })

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = []
    archive.on('data', (chunk) => buffers.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(buffers)))
    archive.on('error', reject)
    archive.finalize()
  })

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=docs.zip"
    }
  })
}