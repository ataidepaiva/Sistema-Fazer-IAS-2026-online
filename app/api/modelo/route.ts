import { NextResponse } from "next/server"
import { limparCacheModelo } from "@/lib/doc"
import { obterSessaoAutenticada } from "@/lib/auth"
import {
  excluirModeloCustomizado,
  lerModeloAtivoArquivo,
  obterStatusModeloAtivoPorUsuario,
  salvarModeloCustomizado,
} from "@/lib/model-storage"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const sessao = await obterSessaoAutenticada(request)

  if (!sessao?.chave) {
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  if (searchParams.get("status") === "1") {
    const status = await obterStatusModeloAtivoPorUsuario(sessao.chave)
    return NextResponse.json({ ok: true, modeloAtivo: status })
  }

  const modelo = await lerModeloAtivoArquivo(sessao.chave)

  return new Response(new Uint8Array(modelo.conteudo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${modelo.nomeArquivo}"`,
    },
  })
}

export async function POST(request: Request) {
  const sessao = await obterSessaoAutenticada(request)

  if (!sessao?.chave) {
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 })
  }

  const formData = await request.formData()
  const arquivo = formData.get("arquivo")

  if (!arquivo || typeof arquivo === "string") {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  if (!arquivo.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Envie um arquivo .docx" }, { status: 400 })
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  if (!buffer.length) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 })
  }

  try {
    await salvarModeloCustomizado(buffer, sessao.chave)
    limparCacheModelo(`modelo.docx::${sessao.chave}`)

    const status = await obterStatusModeloAtivoPorUsuario(sessao.chave)
    return NextResponse.json({ ok: true, arquivo: arquivo.name, modeloAtivo: status })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao atualizar o modelo"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const sessao = await obterSessaoAutenticada(request)

  if (!sessao?.chave) {
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 })
  }

  try {
    const resultado = await excluirModeloCustomizado(sessao.chave)
    limparCacheModelo(`modelo.docx::${sessao.chave}`)
    const status = await obterStatusModeloAtivoPorUsuario(sessao.chave)

    return NextResponse.json({
      ok: true,
      removido: resultado.removido,
      modeloAtivo: status,
      mensagem: resultado.removido
        ? "Seu modelo personalizado foi excluído. O sistema voltou para o modelo padrão."
        : "Você não tinha modelo personalizado. O sistema já está usando o modelo padrão.",
    })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao excluir modelo personalizado"
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}
