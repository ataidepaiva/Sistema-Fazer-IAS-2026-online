"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Download, FileText, ClipboardList } from "lucide-react"

export default function Lauda() {
  const [texto, setTexto] = useState("")
  const [gerando, setGerando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [tempoDecorrido, setTempoDecorrido] = useState(0)
  const inicioRef = useRef<number | null>(null)

  useEffect(() => {
    if (!gerando) return

    const timer = window.setInterval(() => {
      const inicio = inicioRef.current
      if (!inicio) return

      const segundos = Math.floor((Date.now() - inicio) / 1000)
      setTempoDecorrido(segundos)
      setProgresso((anterior) => {
        const estimativa = Math.min(95, Math.floor((segundos / 10) * 95))
        return Math.max(anterior, estimativa)
      })
    }, 200)

    return () => window.clearInterval(timer)
  }, [gerando])

  async function gerar() {
    if (!texto.trim()) return

    setGerando(true)
    setProgresso(5)
    setTempoDecorrido(0)
    inicioRef.current = Date.now()

    try {
      const res = await fetch("/api/lauda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      })

      if (!res.ok) throw new Error("Falha ao gerar lauda")

      const blob = await res.blob()
      setProgresso(100)

      const url = window.URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition") || ""
      const match = disposition.match(/filename="([^"]+)"/)

      const a = document.createElement("a")
      a.href = url
      a.download = match?.[1] || "lauda.rtf"
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      window.setTimeout(() => {
        setGerando(false)
        setProgresso(0)
        inicioRef.current = null
      }, 500)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="w-full md:w-72 bg-gradient-to-b from-blue-900 via-blue-900 to-blue-950 text-white p-6 flex flex-col shadow-2xl">
        <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity">
          <div className="shrink-0 rounded-full bg-white p-1.5 shadow-md">
            <Image
              src="/logo-sre-varginha.png"
              alt="Logo oficial da Superintendência Regional de Ensino de Varginha"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">SRE Varginha</h1>
            <p className="text-xs opacity-80">SInfo v1.0</p>
          </div>
        </Link>

        <nav className="flex flex-col gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium text-blue-100 hover:bg-blue-800/80"
          >
            <ClipboardList size={16} />
            Informativos (IAS)
          </Link>

          <div className="px-4 py-3 rounded-xl flex items-center gap-2 font-medium bg-blue-700 text-white shadow-md">
            <FileText size={16} />
            Preparar Lauda
          </div>
        </nav>

        <div className="mt-auto pt-8 text-xs opacity-70">© 2026 SRE Varginha</div>
      </aside>

      <main className="flex-1 p-4 md:p-6 xl:p-8">
        <div className="mx-auto w-full max-w-[1700px]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Preparar Lauda para Envio</h2>
              <p className="text-slate-500 text-sm mt-1">
                Cole o texto da lauda abaixo e gere o documento RTF formatado
              </p>
            </div>

            <Link href="/" className="text-blue-700 hover:text-blue-900 text-sm font-medium inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 md:p-6">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-sm font-medium text-slate-600 mb-2">Texto da Lauda</label>

              <textarea
                className="w-full h-72 md:h-[60vh] border border-slate-300 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                placeholder="Cole o texto da lauda aqui..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={gerando}
              />

              <div className="mt-4 flex flex-col items-end gap-4">
                {gerando && (
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <span>Tempo decorrido: {tempoDecorrido}s</span>
                      <span>{progresso}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-200 ease-linear"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                  onClick={gerar}
                  disabled={gerando || !texto.trim()}
                >
                  <Download size={18} />
                  {gerando ? "Gerando lauda..." : "Gerar e Baixar Lauda (.RTF)"}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500">
              Documento gerado em Times New Roman 6pt, justificado, formato RTF.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
