import { NextResponse } from "next/server"
import { obterStatusModeloAtivo } from "@/lib/model-storage"

export const runtime = "nodejs"

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diagnostico: Record<string, any> = {
    timestamp: new Date().toISOString(),
    teste: "Testando leitura de modelo",
  }

  try {
    const status = await obterStatusModeloAtivo()
    diagnostico.status = status
    diagnostico.sucesso = true
  } catch (err) {
    diagnostico.sucesso = false
    diagnostico.erro = err instanceof Error ? err.message : String(err)
    diagnostico.stack = err instanceof Error ? err.stack : undefined
  }

  return NextResponse.json(diagnostico)
}
