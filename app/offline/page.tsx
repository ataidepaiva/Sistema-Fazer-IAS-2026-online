"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { lerModeloOffline, listarUsuariosOfflineDisponiveis, obterUsuarioOfflineAtivo, type OfflineModelRecord, type OfflineUserRecord } from "@/lib/offline-client"

interface DiagnosticoOffline {
  estaOnline: boolean
  serviceWorkerRegistrado: boolean
  serviceWorkerControlando: boolean
  cachesDisponiveis: boolean
  nomesCaches: string[]
  entradasCache: number
  armazenamentoUsadoMb: string | null
  armazenamentoTotalMb: string | null
  usuarioAtivo: string | null
  usuariosOffline: OfflineUserRecord[]
  modeloAtivo: OfflineModelRecord | null
}

function formatarData(valor: string | null | undefined) {
  if (!valor) {
    return "-"
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return valor
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data)
}

function formatarMegabytes(valor?: number) {
  if (!Number.isFinite(valor || NaN) || !valor) {
    return null
  }

  return `${(valor / (1024 * 1024)).toFixed(2)} MB`
}

export default function OfflinePage() {
  const [diagnostico, setDiagnostico] = useState<DiagnosticoOffline>({
    estaOnline: true,
    serviceWorkerRegistrado: false,
    serviceWorkerControlando: false,
    cachesDisponiveis: false,
    nomesCaches: [],
    entradasCache: 0,
    armazenamentoUsadoMb: null,
    armazenamentoTotalMb: null,
    usuarioAtivo: null,
    usuariosOffline: [],
    modeloAtivo: null,
  })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)

      const estaOnline = typeof navigator === "undefined" ? true : navigator.onLine
      const serviceWorkerRegistrado = typeof navigator !== "undefined" && "serviceWorker" in navigator
      const serviceWorkerControlando = serviceWorkerRegistrado ? Boolean(navigator.serviceWorker.controller) : false
      const cachesDisponiveis = typeof window !== "undefined" && "caches" in window
      const usuarioAtivo = obterUsuarioOfflineAtivo()
      const usuariosOffline = listarUsuariosOfflineDisponiveis()
      const modeloAtivo = lerModeloOffline(usuarioAtivo)
      let nomesCaches: string[] = []
      let entradasCache = 0
      let armazenamentoUsadoMb: string | null = null
      let armazenamentoTotalMb: string | null = null

      if (cachesDisponiveis) {
        nomesCaches = await caches.keys()

        for (const nomeCache of nomesCaches) {
          const cache = await caches.open(nomeCache)
          const chaves = await cache.keys()
          entradasCache += chaves.length
        }
      }

      if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
        const estimativa = await navigator.storage.estimate()
        armazenamentoUsadoMb = formatarMegabytes(estimativa.usage)
        armazenamentoTotalMb = formatarMegabytes(estimativa.quota)
      }

      setDiagnostico({
        estaOnline,
        serviceWorkerRegistrado,
        serviceWorkerControlando,
        cachesDisponiveis,
        nomesCaches,
        entradasCache,
        armazenamentoUsadoMb,
        armazenamentoTotalMb,
        usuarioAtivo,
        usuariosOffline,
        modeloAtivo,
      })
      setCarregando(false)
    }

    void carregar()

    const atualizar = () => {
      void carregar()
    }

    window.addEventListener("online", atualizar)
    window.addEventListener("offline", atualizar)

    return () => {
      window.removeEventListener("online", atualizar)
      window.removeEventListener("offline", atualizar)
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Diagnóstico Offline</h1>
            <p className="mt-1 text-sm text-slate-600">Verifique se o navegador está pronto para continuar usando o sistema sem rede.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              Ir para login
            </Link>
            <Link href="/dashboard" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
              Ir para dashboard
            </Link>
          </div>
        </div>

        <div className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${diagnostico.estaOnline ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {diagnostico.estaOnline
            ? "Rede disponível: este é o melhor momento para sincronizar usuário, modelo e páginas no cache."
            : "Sem rede: esta tela mostra exatamente o que já ficou salvo localmente neste navegador."}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Aplicação e cache</h2>
            <div className="space-y-3 text-sm text-slate-700">
              <p><strong>Status:</strong> {carregando ? "Lendo..." : diagnostico.estaOnline ? "Online" : "Offline"}</p>
              <p><strong>Service worker:</strong> {diagnostico.serviceWorkerRegistrado ? "Registrado" : "Não registrado"}</p>
              <p><strong>Controlando a página:</strong> {diagnostico.serviceWorkerControlando ? "Sim" : "Não"}</p>
              <p><strong>API de cache:</strong> {diagnostico.cachesDisponiveis ? "Disponível" : "Indisponível"}</p>
              <p><strong>Quantidade de caches:</strong> {diagnostico.nomesCaches.length}</p>
              <p><strong>Entradas em cache:</strong> {diagnostico.entradasCache}</p>
              <p><strong>Armazenamento usado:</strong> {diagnostico.armazenamentoUsadoMb || "-"}</p>
              <p><strong>Quota estimada:</strong> {diagnostico.armazenamentoTotalMb || "-"}</p>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {diagnostico.nomesCaches.length > 0 ? diagnostico.nomesCaches.join(", ") : "Nenhum cache encontrado ainda."}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Sessão e usuários offline</h2>
            <div className="space-y-3 text-sm text-slate-700">
              <p><strong>Usuário ativo:</strong> {diagnostico.usuarioAtivo || "Nenhum"}</p>
              <p><strong>Usuários disponíveis offline:</strong> {diagnostico.usuariosOffline.length}</p>
            </div>

            <div className="mt-4 space-y-2">
              {diagnostico.usuariosOffline.length > 0 ? diagnostico.usuariosOffline.map((usuario) => (
                <div key={usuario.usuario} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p><strong>{usuario.usuario}</strong> ({usuario.perfil === "admin" ? "Administrador" : "Usuário"})</p>
                  <p className="text-xs text-slate-500">Última sincronização: {formatarData(usuario.atualizadoEm)}</p>
                </div>
              )) : <p className="text-sm text-slate-500">Nenhum usuário foi sincronizado neste navegador ainda.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Modelo offline do usuário ativo</h2>
            {diagnostico.modeloAtivo ? (
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <p><strong>Arquivo:</strong> {diagnostico.modeloAtivo.nomeArquivo}</p>
                <p><strong>Tipo:</strong> {diagnostico.modeloAtivo.mimeType || "-"}</p>
                <p><strong>Salvo em:</strong> {formatarData(diagnostico.modeloAtivo.salvoEm)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhum modelo personalizado foi salvo localmente para o usuário atual.</p>
            )}

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Para uso offline consistente, faça login online uma vez, abra Dashboard e Lauda, e baixe ou envie o modelo desejado antes de desligar a rede.
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
