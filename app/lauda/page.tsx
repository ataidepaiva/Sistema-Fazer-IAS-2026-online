"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { baixarBlob, limparSessaoOfflineLocal } from "@/lib/offline-client"
import { montarLaudaOffline, obterNomeLaudaOffline } from "@/lib/offline-doc"
import { ArrowLeft, Download, FileText, ClipboardList, LogOut, Menu, ChevronRight, Upload } from "lucide-react"

export default function Lauda() {
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(true)
  const [texto, setTexto] = useState("")
  const [gerando, setGerando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [tempoDecorrido, setTempoDecorrido] = useState(0)
  const [mensagemModelo, setMensagemModelo] = useState("")
  const [estaOnline, setEstaOnline] = useState(true)
  const inicioRef = useRef<number | null>(null)
  const inputModeloRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setEstaOnline(typeof navigator === "undefined" ? true : navigator.onLine)

    const atualizarStatus = () => setEstaOnline(navigator.onLine)

    window.addEventListener("online", atualizarStatus)
    window.addEventListener("offline", atualizarStatus)

    return () => {
      window.removeEventListener("online", atualizarStatus)
      window.removeEventListener("offline", atualizarStatus)
    }
  }, [])

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

  async function baixarModelo() {
    setMensagemModelo("Baixando modelo...")

    try {
      const resposta = await fetch("/api/modelo")
      const json = await resposta.clone().json().catch(() => null)

      if (!resposta.ok) {
        setMensagemModelo(json?.error || "Falha ao baixar o modelo")
        return
      }

      const blob = await resposta.blob()
      const disposition = resposta.headers.get("Content-Disposition") || ""
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)
      const match = disposition.match(/filename="([^"]+)"/i)
      const nomeArquivo = matchUtf8?.[1] ? decodeURIComponent(matchUtf8[1]) : match?.[1] || "modelo.docx"

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = nomeArquivo
      a.click()
      window.URL.revokeObjectURL(url)

      setMensagemModelo(`Download concluído: ${nomeArquivo}`)
    } catch {
      setMensagemModelo("Falha ao baixar o modelo")
    }
  }

  async function subirNovoModelo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) return

    const formData = new FormData()
    formData.append("arquivo", arquivo)
    setMensagemModelo("Enviando novo modelo...")

    try {
      const resposta = await fetch("/api/modelo", {
        method: "POST",
        body: formData,
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemModelo(json?.error || "Falha ao atualizar o modelo")
        return
      }

      setMensagemModelo(`Modelo atualizado com sucesso: ${json?.arquivo || arquivo.name}`)
    } catch {
      setMensagemModelo("Falha ao enviar o novo modelo")
    } finally {
      event.target.value = ""
    }
  }

  async function sair() {
    limparSessaoOfflineLocal()

    if (navigator.onLine) {
      await fetch("/api/logout", { method: "POST" })
    }

    router.push("/login")
    router.refresh()
  }

  async function gerar() {
    if (!texto.trim()) return

    setGerando(true)
    setProgresso(5)
    setTempoDecorrido(0)
    inicioRef.current = Date.now()

    try {
      if (!navigator.onLine) {
        const respostaModelo = await fetch("/modelo-lauda.rtf")

        if (!respostaModelo.ok) {
          throw new Error("Modelo de lauda offline indisponível")
        }

        const modeloRtf = await respostaModelo.text()
        const conteudo = montarLaudaOffline(modeloRtf, texto)
        const blob = new Blob([conteudo], { type: "application/rtf" })
        baixarBlob(blob, obterNomeLaudaOffline())
        setProgresso(100)
        return
      }

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
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)
      const match = disposition.match(/filename="([^"]+)"/i)
      const nomeArquivo = matchUtf8?.[1] ? decodeURIComponent(matchUtf8[1]) : match?.[1]

      const a = document.createElement("a")
      a.href = url
      a.download = nomeArquivo || "lauda.rtf"
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
      <aside className={`${menuAberto ? "flex" : "hidden"} relative w-full md:w-72 bg-gradient-to-b from-blue-900 via-blue-900 to-blue-950 text-white p-6 flex-col shadow-2xl`}>
        <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity">
          <div className="shrink-0 h-16 w-16 overflow-hidden rounded-full bg-white p-0.5 shadow-md">
            <Image
              src="/logo-sre-varginha.png"
              alt="Logo oficial da Superintendência Regional de Ensino de Varginha"
              width={56}
              height={56}
              className="h-full w-full scale-150 object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">SRE Varginha</h1>
            <p className="text-xs opacity-80">SInfo v2.6</p>
          </div>
        </Link>

        <button
          onClick={() => setMenuAberto(false)}
          className="absolute -right-3 top-6 hidden h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg transition-colors hover:bg-slate-800 md:flex"
          aria-label="Ocultar menu"
          title="Ocultar menu"
        >
          <Menu className="h-4 w-4" />
        </button>

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

          <Link
            href="/offline"
            className="text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium text-blue-100 hover:bg-blue-800/80"
          >
            <Download size={16} />
            Diagnóstico Offline
          </Link>
        </nav>

        <div className="mt-auto pt-6">
          <div className="space-y-2 border-t border-blue-800/70 pt-4">
              <button
                type="button"
                onClick={baixarModelo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Baixar meu modelo
              </button>

              <button
                type="button"
                onClick={() => inputModeloRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-500"
              >
                <Upload className="h-4 w-4" />
                Subir meu modelo
              </button>

              <input ref={inputModeloRef} type="file" accept=".docx" className="hidden" onChange={subirNovoModelo} />

              {mensagemModelo ? <p className="text-xs text-blue-100/90">{mensagemModelo}</p> : null}
          </div>

          <div className="pt-6 text-xs opacity-70">SRE Varginha</div>
          <div className="pt-1 text-xs opacity-70">© {new Date().getFullYear()} Desenvolvido por Ataide de Paula Paiva - Todos os Direitos Reservados</div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 xl:p-8">
        <div className="mx-auto w-full max-w-[1700px]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className={`transition-all duration-200 ${!menuAberto ? "md:ml-14" : ""}`}>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Preparar Lauda para Envio</h2>
              <p className="text-slate-500 text-sm mt-1">
                Cole o texto da lauda abaixo e gere o documento RTF formatado
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!menuAberto && (
                <button
                  onClick={() => setMenuAberto(true)}
                  className="fixed left-3 top-6 z-30 hidden h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg transition-colors hover:bg-slate-800 md:inline-flex"
                  aria-label="Mostrar menu"
                  title="Mostrar menu"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Fazer IAS
              </Link>
              <button
                onClick={sair}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 md:p-6">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className={`${estaOnline ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"} mb-4 rounded-xl border px-4 py-3 text-sm`}>
                {estaOnline
                  ? "Modo online: a lauda pode ser gerada pelo servidor e também fica pronta para uso offline depois do cache inicial."
                  : "Modo offline: a lauda será montada localmente no navegador usando o modelo em cache."}
              </div>

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
