"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { FileText, Edit3, Download, ClipboardList, ScrollText, LogOut, Menu, ChevronRight } from "lucide-react"

interface Registro {
  titulo: string
  texto_base: string
  servidor: string
  masp: string
  pagina: string
  coluna: string
  data: string
}

export default function Dashboard() {
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(true)
  const [activeTab, setActiveTab] = useState("input")
  const [texto, setTexto] = useState("")
  const [dados, setDados] = useState<Registro[]>([])
  const [erro, setErro] = useState("")
  const [valorPaginaGlobal, setValorPaginaGlobal] = useState("")
  const [valorColunaGlobal, setValorColunaGlobal] = useState("")
  const [valorDataGlobal, setValorDataGlobal] = useState("")
  const [gerandoDocumento, setGerandoDocumento] = useState(false)
  const [progressoGeracao, setProgressoGeracao] = useState(0)
  const [tempoDecorridoSegundos, setTempoDecorridoSegundos] = useState(0)
  const inicioGeracaoRef = useRef<number | null>(null)

  useEffect(() => {
    if (!gerandoDocumento) return

    const timer = window.setInterval(() => {
      const inicio = inicioGeracaoRef.current
      if (!inicio) return

      const segundos = Math.floor((Date.now() - inicio) / 1000)
      setTempoDecorridoSegundos(segundos)
      setProgressoGeracao((anterior) => {
        const estimativa = Math.min(95, Math.floor((segundos / 45) * 95))
        return Math.max(anterior, estimativa)
      })
    }, 200)

    return () => window.clearInterval(timer)
  }, [gerandoDocumento])

  async function processar() {
    if (!texto.trim()) return

    setErro("")

    const res = await fetch("/api/processar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setErro(json?.error || "Falha ao processar texto")
      return
    }

    const json = await res.json()
    setDados(json)
    setActiveTab("edit")
  }

  function atualizarRegistro(index: number, campo: string, valor: string) {
    const novosDados = [...dados]
    novosDados[index] = { ...novosDados[index], [campo]: valor }
    setDados(novosDados)
  }

  function aplicarValorEmTodasLinhas(campo: "pagina" | "coluna" | "data", valor: string) {
    const novosDados = dados.map((registro) => ({ ...registro, [campo]: valor }))
    setDados(novosDados)
  }

  function aplicarTodos() {
    if (!valorPaginaGlobal && !valorColunaGlobal && !valorDataGlobal) return

    const novosDados = dados.map((registro) => ({
      ...registro,
      pagina: valorPaginaGlobal || registro.pagina,
      coluna: valorColunaGlobal || registro.coluna,
      data: valorDataGlobal || registro.data,
    }))
    setDados(novosDados)
  }

  function moverFocoPlanilha(linhaAtual: number, colunaAtual: number, direcao: "baixo" | "cima") {
    const proximaLinha = direcao === "baixo" ? linhaAtual + 1 : linhaAtual - 1
    if (proximaLinha < 0 || proximaLinha >= dados.length) return

    const proximaCelula = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[data-row="${proximaLinha}"][data-col="${colunaAtual}"]`
    )

    if (proximaCelula) {
      proximaCelula.focus()
      proximaCelula.select()
    }
  }

  function onKeyDownPlanilha(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, linha: number, coluna: number) {
    if (e.key === "Enter") {
      e.preventDefault()
      moverFocoPlanilha(linha, coluna, e.shiftKey ? "cima" : "baixo")
    }
  }

  function ajustarAlturaServidor(elemento: HTMLTextAreaElement | null) {
    if (!elemento) return
    elemento.style.height = "auto"
    elemento.style.height = `${elemento.scrollHeight}px`
  }

  async function sair() {
    await fetch("/api/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  async function gerar() {
    setErro("")
    setGerandoDocumento(true)
    setProgressoGeracao(5)
    setTempoDecorridoSegundos(0)
    inicioGeracaoRef.current = Date.now()

    try {
      const res = await fetch("/api/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registros: dados }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "Falha ao gerar documento")
      }

      const blob = await res.blob()
      setProgressoGeracao(100)

      const url = window.URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition") || ""
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)
      const match = disposition.match(/filename="([^"]+)"/i)
      const nomeArquivo = matchUtf8?.[1] ? decodeURIComponent(matchUtf8[1]) : match?.[1]

      const a = document.createElement("a")
      a.href = url
      a.download = nomeArquivo || "documento_unico_ias.docx"
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Falha ao gerar documento"
      setErro(mensagem)
    } finally {
      window.setTimeout(() => {
        setGerandoDocumento(false)
        setProgressoGeracao(0)
        inicioGeracaoRef.current = null
      }, 500)
    }
  }

  const tituloTela = activeTab === "input" ? "Entrada de Dados" : activeTab === "edit" ? "Edição" : "Exportar"
  const descricaoTela =
    activeTab === "input"
      ? "Cole o texto bruto para processamento automático dos servidores"
      : activeTab === "edit"
        ? "Revise e refine os dados antes de gerar o documento final"
        : "Finalize e baixe o documento consolidado"
  const totalTitulos = new Set(dados.map((registro) => (registro.titulo || "").trim() || "Sem título")).size
  const exportacaoPorTitulo = totalTitulos > 1

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside
        className={cn(
          "relative w-full md:w-72 bg-gradient-to-b from-blue-900 via-blue-900 to-blue-950 text-white p-6 flex flex-col shadow-2xl",
          !menuAberto && "hidden"
        )}
      >
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
          <button
            onClick={() => setActiveTab("input")}
            className={cn(
              "text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium",
              activeTab === "input" ? "bg-blue-700 text-white shadow-md" : "text-blue-100 hover:bg-blue-800/80"
            )}
          >
            <ClipboardList size={16} />
            Entrada de Dados
          </button>

          <button
            onClick={() => setActiveTab("edit")}
            disabled={dados.length === 0}
            className={cn(
              "text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium",
              activeTab === "edit"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-100 hover:bg-blue-800/80 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Edit3 size={16} />
            Edição ({dados.length})
          </button>

          <button
            onClick={() => setActiveTab("export")}
            disabled={dados.length === 0}
            className={cn(
              "text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium",
              activeTab === "export"
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-100 hover:bg-blue-800/80 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Download size={16} />
            Exportar
          </button>

          <Link
            href="/lauda"
            className="text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium text-blue-100 hover:bg-blue-800/80"
          >
            <ScrollText size={16} />
            Preparar Lauda
          </Link>
        </nav>

        <div className="mt-auto pt-8 text-xs opacity-70">© {new Date().getFullYear()} SRE Varginha</div>
      </aside>

      <main className="flex-1 p-4 md:p-6 xl:p-8">
        <div className="mx-auto w-full max-w-[1700px]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className={cn("transition-all duration-200", !menuAberto && "md:ml-14")}>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{tituloTela}</h2>
              <p className="text-slate-500 text-sm mt-1">{descricaoTela}</p>
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
            {erro && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </div>
            )}

            {activeTab === "input" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-sm font-medium text-slate-600 mb-2">Folha de rascunho</label>

                <textarea
                  className="w-full h-64 md:h-80 border border-slate-300 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  placeholder="Cole o texto aqui..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-slate-500">Modelo utilizado: modelo.docx</span>
                  <button
                    className="bg-blue-900 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                    onClick={processar}
                  >
                    <ClipboardList size={16} />
                    Processar Texto
                  </button>
                </div>
              </div>
            )}

            {activeTab === "edit" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-6 grid gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 lg:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Página para todas as linhas"
                      value={valorPaginaGlobal}
                      onChange={(e) => setValorPaginaGlobal(e.target.value)}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => aplicarValorEmTodasLinhas("pagina", valorPaginaGlobal)}
                    >
                      Aplicar
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Coluna para todas as linhas"
                      value={valorColunaGlobal}
                      onChange={(e) => setValorColunaGlobal(e.target.value)}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => aplicarValorEmTodasLinhas("coluna", valorColunaGlobal)}
                    >
                      Aplicar
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Data para todas as linhas"
                      value={valorDataGlobal}
                      onChange={(e) => setValorDataGlobal(e.target.value)}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => aplicarValorEmTodasLinhas("data", valorDataGlobal)}
                    >
                      Aplicar
                    </button>
                  </div>

                  <button
                    type="button"
                    className="lg:col-span-3 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
                    onClick={aplicarTodos}
                  >
                    ✓ Aplicar Tudo
                  </button>
                </div>

                <div className="max-h-[62vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700">
                        <th className="sticky top-0 z-10 w-[6%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">#</th>
                        <th className="sticky top-0 z-10 w-[36%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Servidor</th>
                        <th className="sticky top-0 z-10 w-[26%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Título</th>
                        <th className="sticky top-0 z-10 w-[10%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">MaSP</th>
                        <th className="sticky top-0 z-10 w-[6%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Página</th>
                        <th className="sticky top-0 z-10 w-[6%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Coluna</th>
                        <th className="sticky top-0 z-10 w-[10%] border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.map((d, i) => (
                        <tr key={i} className="odd:bg-white even:bg-slate-50/50 border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                          <td className="px-3 py-2 align-top font-medium text-slate-600">{i + 1}</td>
                          <td className="p-2 align-top">
                            <textarea
                              data-row={i}
                              data-col={0}
                              rows={1}
                              className="w-full min-h-[84px] overflow-hidden resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 leading-6 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                              placeholder="Nome do servidor"
                              value={d.servidor}
                              onChange={(e) => atualizarRegistro(i, "servidor", e.target.value)}
                              onInput={(e) => ajustarAlturaServidor(e.currentTarget)}
                              ref={ajustarAlturaServidor}
                              onKeyDown={(e) => onKeyDownPlanilha(e, i, 0)}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              data-row={i}
                              data-col={1}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                              placeholder="Título do registro"
                              value={d.titulo}
                              onChange={(e) => atualizarRegistro(i, "titulo", e.target.value)}
                              onKeyDown={(e) => onKeyDownPlanilha(e, i, 1)}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              data-row={i}
                              data-col={2}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                              placeholder="Ex: 1.234.567-8"
                              value={d.masp}
                              onChange={(e) => atualizarRegistro(i, "masp", e.target.value)}
                              onKeyDown={(e) => onKeyDownPlanilha(e, i, 2)}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              data-row={i}
                              data-col={3}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                              placeholder="Ex: 42"
                              value={d.pagina}
                              onChange={(e) => atualizarRegistro(i, "pagina", e.target.value)}
                              onKeyDown={(e) => onKeyDownPlanilha(e, i, 3)}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              data-row={i}
                              data-col={4}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                              placeholder="Ex: 1"
                              value={d.coluna}
                              onChange={(e) => atualizarRegistro(i, "coluna", e.target.value)}
                              onKeyDown={(e) => onKeyDownPlanilha(e, i, 4)}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              data-row={i}
                              data-col={5}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                              placeholder="Ex: 20/03/24"
                              value={d.data}
                              onChange={(e) => atualizarRegistro(i, "data", e.target.value)}
                              onKeyDown={(e) => onKeyDownPlanilha(e, i, 5)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    className="bg-blue-900 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all duration-300"
                    onClick={() => setActiveTab("export")}
                  >
                    Próximo: Exportar
                  </button>
                </div>
              </div>
            )}

            {activeTab === "export" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center py-12 md:py-16">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 rounded-3xl mb-8 shadow-sm border border-emerald-200">
                  <FileText size={72} className="text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3 text-center">Tudo Pronto!</h2>
                <p className="text-slate-600 mb-10 text-center max-w-md leading-relaxed">
                  {exportacaoPorTitulo
                    ? `Encontramos ${totalTitulos} títulos diferentes. O download será entregue em um arquivo ZIP com um documento para cada título.`
                    : `Geramos um documento Word único com ${dados.length} página${dados.length > 1 ? "s" : ""}, uma para cada servidor, seguindo o modelo fornecido.`}
                </p>

                <button
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
                  onClick={gerar}
                  disabled={gerandoDocumento}
                >
                  <Download size={20} />
                  {gerandoDocumento
                    ? exportacaoPorTitulo
                      ? "Gerando documentos..."
                      : "Gerando documento..."
                    : exportacaoPorTitulo
                      ? "Baixar documentos por título (.ZIP)"
                      : "Baixar Documento (.DOCX)"}
                </button>

                {gerandoDocumento && (
                  <div className="w-full max-w-md mb-8">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <span>Tempo decorrido: {tempoDecorridoSegundos}s</span>
                      <span>{progressoGeracao}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-emerald-100 overflow-hidden border border-emerald-200">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-200 ease-linear"
                        style={{ width: `${progressoGeracao}%` }}
                      />
                    </div>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      {exportacaoPorTitulo
                        ? "Textos muito grandes podem levar mais tempo para gerar e compactar todos os documentos por título."
                        : "Textos muito grandes podem levar mais tempo para mesclar todas as páginas do documento."}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab("edit")}
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Fazer correções nos dados
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500">
              Sistema de Informativos (SInfo) - Plataforma institucional
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
