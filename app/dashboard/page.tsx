"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { FileText, Edit3, Download, ClipboardList, Shield, ArrowLeft } from "lucide-react"

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
  const [activeTab, setActiveTab] = useState("input") // input, edit, export
  const [texto, setTexto] = useState("")
  const [dados, setDados] = useState<Registro[]>([])

  async function processar() {
    if (!texto.trim()) return
    
    const res = await fetch("/api/processar", {
      method: "POST",
      body: JSON.stringify({ texto })
    })

    const json = await res.json()
    setDados(json)
    setActiveTab("edit") // Muda para a aba de edição após processar
  }

  function atualizarRegistro(index: number, campo: string, valor: string) {
    const novosDados = [...dados]
    novosDados[index] = { ...novosDados[index], [campo]: valor }
    setDados(novosDados)
  }

  async function gerar() {
    const res = await fetch("/api/gerar", {
      method: "POST",
      body: JSON.stringify({ registros: dados })
    })

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "documentos_ias.zip"
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Institucional */}
      <header className="bg-white shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex flex-row flex-nowrap items-center gap-4 hover:opacity-80 transition-opacity">
              <div className="shrink-0 bg-white p-1.5 rounded-lg border border-blue-100 shadow-sm">
                <Image
                  src="/logo-sre-varginha.png"
                  alt="Logo oficial da Superintendência Regional de Ensino de Varginha"
                  width={54}
                  height={54}
                  className="h-[54px] w-[54px] object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">Superintendência Regional de Ensino de Varginha</h1>
                <p className="text-xs text-gray-600">Painel de Controle</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Sistema de Informativos (SInfo)</p>
                <p className="text-xs text-gray-400">v1.0</p>
              </div>
              <Link
                href="/"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Voltar ao Início</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
        {/* Navegação por Abas */}
        <div className="flex space-x-2 mb-6 bg-white rounded-t-lg shadow-sm p-2">
          <button
            onClick={() => setActiveTab("input")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all flex-1 justify-center",
              activeTab === "input" 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <ClipboardList size={18} />
            Entrada de Dados
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            disabled={dados.length === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all flex-1 justify-center",
              activeTab === "edit" 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Edit3 size={18} />
            Edição ({dados.length})
          </button>
          <button
            onClick={() => setActiveTab("export")}
            disabled={dados.length === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all flex-1 justify-center",
              activeTab === "export" 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Download size={18} />
            Exportar
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-white shadow-xl rounded-b-lg p-8 border border-gray-100">

        {/* Conteúdo da Aba: Entrada */}
        {activeTab === "input" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Entrada de Dados</h2>
              <p className="text-gray-600">Cole o texto bruto abaixo para iniciar o processamento automático dos servidores.</p>
            </div>
            
            <div
              className="relative mx-auto max-w-5xl overflow-hidden rounded-md border border-[#dccfb5] bg-[#fffef8] shadow-[0_30px_55px_-30px_rgba(15,23,42,0.8)]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(239,68,68,0.16) 0 64px, transparent 64px), linear-gradient(to bottom, rgba(245,236,214,0.6), rgba(255,254,248,0.95))"
              }}
            >
              <div className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[30px] border-b-[30px] border-l-transparent border-b-[#e9dcc0]" />
              <div className="pointer-events-none absolute inset-y-0 left-16 w-[2px] bg-red-400/70" />
              <div className="pointer-events-none absolute left-6 top-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800/60">
                Folha de rascunho
              </div>
              <textarea
                className="resize-vertical border-0 bg-transparent px-20 pb-10 pt-10 text-[16px] leading-8 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/70"
                style={{
                  width: "min(35cm, 100%)",
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0px, transparent 33px, rgba(59,130,246,0.24) 34px)",
                  backgroundSize: "100% 34px"
                }}
                rows={20}
                placeholder="Cole o texto aqui..."
                value={texto}
                onChange={e => setTexto(e.target.value)}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                onClick={processar}
              >
                <ClipboardList size={20} />
                Processar Texto
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba: Edição */}
        {activeTab === "edit" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Refinar Informações</h2>
              <p className="text-gray-600">Complete os detalhes de cada registro identificado.</p>
            </div>
            
            <div className="space-y-4">
              {dados.map((d, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{d.servidor}</h3>
                      <p className="text-sm text-gray-600 mt-1">{d.titulo}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                      Registro #{i + 1}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MaSP</label>
                      <input
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 1.234.567-8"
                        value={d.masp}
                        onChange={e => atualizarRegistro(i, 'masp', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Página</label>
                      <input 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 42" 
                        value={d.pagina}
                        onChange={e => atualizarRegistro(i, 'pagina', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coluna</label>
                      <input 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 1" 
                        value={d.coluna}
                        onChange={e => atualizarRegistro(i, 'coluna', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data do Diário</label>
                      <input 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 20/03/24" 
                        value={d.data}
                        onChange={e => atualizarRegistro(i, 'data', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
              <button 
                onClick={() => setActiveTab("input")}
                className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar para entrada
              </button>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => setActiveTab("export")}
              >
                Próximo: Exportar
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba: Exportar */}
        {activeTab === "export" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center py-16">
            <div className="bg-green-50 p-8 rounded-full mb-6">
              <FileText size={64} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Tudo Pronto!</h2>
            <p className="text-gray-600 mb-8 text-center max-w-md">
              Geramos {dados.length} documentos baseados no modelo fornecido e nos dados preenchidos. Clique abaixo para baixar o pacote ZIP.
            </p>
            
            <button 
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-3 mb-6"
              onClick={gerar}
            >
              <Download size={20} />
              Baixar Arquivos (.ZIP)
            </button>

            <button 
              onClick={() => setActiveTab("edit")}
              className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Fazer correções nos dados
            </button>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Sistema de Informativos (SInfo) - Plataforma institucional para geração de documentos oficiais</p>
          <p className="mt-1">Modelo utilizado: <strong>modelo.docx</strong></p>
        </div>
      </div>
    </div>
    </div>
  )
}
