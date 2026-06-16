"use client"

import { Fragment, useEffect, useEffectEvent, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { processarTexto } from "@/lib/parser"
import { gerarPacoteOffline } from "@/lib/offline-doc"
import {
  baixarBlob,
  base64ParaUint8Array,
  excluirModeloOffline,
  gravarCookiePerfilOffline,
  limparSessaoOfflineLocal,
  lerModeloOffline,
  obterUsuarioOfflineAtivo,
  salvarModeloOffline,
} from "@/lib/offline-client"
import { FileText, Edit3, Download, ClipboardList, ScrollText, LogOut, Menu, ChevronRight, Upload, Trash2, Users } from "lucide-react"

interface Registro {
  titulo: string
  texto_base: string
  servidor: string
  masp: string
  pagina: string
  coluna: string
  data: string
}

interface UsuarioSistema {
  id: number
  usuario: string
  perfil: "user" | "admin"
  ativo: boolean
  criadoEm: string
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
  const [mensagemModelo, setMensagemModelo] = useState("")
  const [nomeModeloAtivo, setNomeModeloAtivo] = useState("modelo.docx")
  const [estaOnline, setEstaOnline] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioSistema[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)
  const [mensagemUsuarios, setMensagemUsuarios] = useState("")
  const [salvandoUsuarioId, setSalvandoUsuarioId] = useState<number | null>(null)
  const [perfilEdicao, setPerfilEdicao] = useState<Record<number, "user" | "admin">>({})
  const [senhaEdicao, setSenhaEdicao] = useState<Record<number, string>>({})
  const [novoUsuario, setNovoUsuario] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [novoPerfil, setNovoPerfil] = useState<"user" | "admin">("user")
  const inicioGeracaoRef = useRef<number | null>(null)
  const inputModeloRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setEstaOnline(typeof navigator === "undefined" ? true : navigator.onLine)

    const perfil = document.cookie
      .split("; ")
      .find((item) => item.startsWith("sinfo-role="))
      ?.split("=")[1]

    setIsAdmin(perfil === "admin")
    gravarCookiePerfilOffline(perfil === "admin" ? "admin" : "user")
    void carregarStatusModelo()

    const atualizarConectividade = () => {
      setEstaOnline(navigator.onLine)
      void carregarStatusModelo()
    }

    window.addEventListener("online", atualizarConectividade)
    window.addEventListener("offline", atualizarConectividade)

    return () => {
      window.removeEventListener("online", atualizarConectividade)
      window.removeEventListener("offline", atualizarConectividade)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    void carregarUsuariosSistema()
  }, [isAdmin])

  const carregarStatusModelo = useEffectEvent(async () => {
    const usuarioOffline = obterUsuarioOfflineAtivo()

    if (!navigator.onLine) {
      const modeloOffline = lerModeloOffline(usuarioOffline)
      setNomeModeloAtivo(modeloOffline?.nomeArquivo || "modelo.docx")
      return
    }

    try {
      const resposta = await fetch("/api/modelo?status=1")

      if (!resposta.ok) {
        const modeloOffline = lerModeloOffline(usuarioOffline)
        if (modeloOffline) {
          setNomeModeloAtivo(modeloOffline.nomeArquivo)
        }
        return
      }

      const json = await resposta.json().catch(() => null)
      const nomeArquivo = json?.modeloAtivo?.nomeArquivo

      if (typeof nomeArquivo === "string" && nomeArquivo.trim()) {
        setNomeModeloAtivo(nomeArquivo)
      }

      void sincronizarModeloAtualOffline()
    } catch {
      const modeloOffline = lerModeloOffline(usuarioOffline)
      if (modeloOffline) {
        setNomeModeloAtivo(modeloOffline.nomeArquivo)
      }
    }
  })

  async function sincronizarModeloAtualOffline() {
    if (!navigator.onLine) {
      return
    }

    try {
      const resposta = await fetch("/api/modelo")

      if (!resposta.ok) {
        return
      }

      const blob = await resposta.blob()
      const disposition = resposta.headers.get("Content-Disposition") || ""
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)
      const match = disposition.match(/filename="([^"]+)"/i)
      const nomeArquivo = matchUtf8?.[1] ? decodeURIComponent(matchUtf8[1]) : match?.[1] || "modelo.docx"
      const usuario = obterUsuarioOfflineAtivo()

      if (usuario) {
        await salvarModeloOffline({
          usuario,
          nomeArquivo,
          mimeType: blob.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          arquivo: blob,
        })
      }
    } catch {
      // Cache offline é melhor esforço.
    }
  }

  async function obterModeloOfflineOuPadrao() {
    const usuario = obterUsuarioOfflineAtivo()
    const modeloOffline = lerModeloOffline(usuario)

    if (modeloOffline) {
      return {
        nomeArquivo: modeloOffline.nomeArquivo,
        bytes: base64ParaUint8Array(modeloOffline.base64),
      }
    }

    const resposta = await fetch("/modelo.docx")

    if (!resposta.ok) {
      throw new Error("Nenhum modelo offline está disponível neste navegador")
    }

    const blob = await resposta.blob()
    return {
      nomeArquivo: "modelo.docx",
      bytes: new Uint8Array(await blob.arrayBuffer()),
    }
  }

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

    if (!navigator.onLine) {
      const json = processarTexto(texto)
      setDados(json)
      setActiveTab("edit")
      return
    }

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

  function normalizarTituloParaAgrupamento(titulo: string) {
    return (titulo || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
  }

  async function baixarModelo() {
    setMensagemModelo("Baixando modelo...")

    if (!navigator.onLine) {
      const modeloOffline = lerModeloOffline(obterUsuarioOfflineAtivo())

      if (!modeloOffline) {
        setMensagemModelo("Sem rede e sem modelo salvo neste navegador")
        return
      }

      const blob = new Blob([base64ParaUint8Array(modeloOffline.base64)], { type: modeloOffline.mimeType })
      baixarBlob(blob, modeloOffline.nomeArquivo)
      setMensagemModelo(`Download offline concluído: ${modeloOffline.nomeArquivo}`)
      return
    }

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

      const usuario = obterUsuarioOfflineAtivo()
      if (usuario) {
        await salvarModeloOffline({
          usuario,
          nomeArquivo,
          mimeType: blob.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          arquivo: blob,
        })
      }

      baixarBlob(blob, nomeArquivo)

      setMensagemModelo(`Download concluído: ${nomeArquivo}`)
    } catch {
      setMensagemModelo("Falha ao baixar o modelo")
    }
  }

  async function subirNovoModelo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) return

    const usuario = obterUsuarioOfflineAtivo()
    if (usuario) {
      await salvarModeloOffline({
        usuario,
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        arquivo,
      })
      setNomeModeloAtivo(arquivo.name)
    }

    if (!navigator.onLine) {
      setMensagemModelo(`Modelo salvo offline neste navegador: ${arquivo.name}`)
      event.target.value = ""
      return
    }

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
      const nomeArquivo = json?.modeloAtivo?.nomeArquivo

      if (typeof nomeArquivo === "string" && nomeArquivo.trim()) {
        setNomeModeloAtivo(nomeArquivo)
      }
    } catch {
      setMensagemModelo("Falha ao enviar o novo modelo")
    } finally {
      event.target.value = ""
    }
  }

  async function excluirModeloPersonalizado() {
    const confirmar = window.confirm("Deseja excluir o modelo personalizado e voltar para o modelo padrão?")

    if (!confirmar) {
      return
    }

    setMensagemModelo("Excluindo modelo personalizado...")

    excluirModeloOffline(obterUsuarioOfflineAtivo())

    if (!navigator.onLine) {
      setNomeModeloAtivo("modelo.docx")
      setMensagemModelo("Modelo offline removido. O sistema usará o modelo padrão em cache.")
      return
    }

    try {
      const resposta = await fetch("/api/modelo", {
        method: "DELETE",
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemModelo(json?.error || "Falha ao excluir o modelo personalizado")
        return
      }

      setMensagemModelo(json?.mensagem || "Modelo padrão reativado com sucesso")
      const nomeArquivo = json?.modeloAtivo?.nomeArquivo

      if (typeof nomeArquivo === "string" && nomeArquivo.trim()) {
        setNomeModeloAtivo(nomeArquivo)
      }
    } catch {
      setMensagemModelo("Falha ao excluir o modelo personalizado")
    }
  }

  async function carregarUsuariosSistema() {
    setCarregandoUsuarios(true)
    setMensagemUsuarios("")

    try {
      const resposta = await fetch("/api/usuarios")
      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemUsuarios(json?.error || "Falha ao listar usuarios")
        return
      }

      const usuarios = Array.isArray(json?.usuarios) ? json.usuarios : []
      setUsuariosSistema(usuarios)
      setPerfilEdicao(() => {
        const proximo: Record<number, "user" | "admin"> = {}

        usuarios.forEach((usuario: UsuarioSistema) => {
          proximo[usuario.id] = usuario.perfil
        })

        return proximo
      })
    } catch {
      setMensagemUsuarios("Falha ao listar usuarios")
    } finally {
      setCarregandoUsuarios(false)
    }
  }

  async function criarNovoUsuario() {
    if (!novoUsuario.trim() || !novaSenha.trim()) {
      setMensagemUsuarios("Informe usuario e senha para criar")
      return
    }

    setMensagemUsuarios("Criando usuario...")

    try {
      const resposta = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: novoUsuario.trim(), senha: novaSenha, perfil: novoPerfil }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemUsuarios(json?.error || "Falha ao criar usuario")
        return
      }

      const usuarios = Array.isArray(json?.usuarios) ? json.usuarios : []
      setUsuariosSistema(usuarios)
      setPerfilEdicao(() => {
        const proximo: Record<number, "user" | "admin"> = {}

        usuarios.forEach((usuario: UsuarioSistema) => {
          proximo[usuario.id] = usuario.perfil
        })

        return proximo
      })
      setNovoUsuario("")
      setNovaSenha("")
      setNovoPerfil("user")
      setMensagemUsuarios("Usuario criado com sucesso")
    } catch {
      setMensagemUsuarios("Falha ao criar usuario")
    }
  }

  async function alternarStatusUsuario(usuario: UsuarioSistema) {
    setSalvandoUsuarioId(usuario.id)
    setMensagemUsuarios(`Atualizando usuario ${usuario.usuario}...`)

    try {
      const resposta = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usuario.id, ativo: !usuario.ativo }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemUsuarios(json?.error || "Falha ao atualizar usuario")
        return
      }

      setUsuariosSistema((anterior) => anterior.map((item) => (item.id === usuario.id ? json?.usuario : item)))
      setPerfilEdicao((anterior) => ({
        ...anterior,
        [usuario.id]: json?.usuario?.perfil === "admin" ? "admin" : "user",
      }))
      setMensagemUsuarios(`Usuario ${usuario.usuario} atualizado com sucesso`)
    } catch {
      setMensagemUsuarios("Falha ao atualizar usuario")
    } finally {
      setSalvandoUsuarioId(null)
    }
  }

  async function salvarPerfilUsuario(usuario: UsuarioSistema) {
    const perfil = perfilEdicao[usuario.id] || usuario.perfil

    if (perfil === usuario.perfil) {
      setMensagemUsuarios(`Nenhuma alteração de perfil para ${usuario.usuario}`)
      return
    }

    setSalvandoUsuarioId(usuario.id)
    setMensagemUsuarios(`Salvando perfil de ${usuario.usuario}...`)

    try {
      const resposta = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usuario.id, perfil }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemUsuarios(json?.error || "Falha ao atualizar perfil")
        return
      }

      setUsuariosSistema((anterior) => anterior.map((item) => (item.id === usuario.id ? json?.usuario : item)))
      setPerfilEdicao((anterior) => ({
        ...anterior,
        [usuario.id]: json?.usuario?.perfil === "admin" ? "admin" : "user",
      }))
      setMensagemUsuarios(`Perfil de ${usuario.usuario} atualizado com sucesso`)
    } catch {
      setMensagemUsuarios("Falha ao atualizar perfil")
    } finally {
      setSalvandoUsuarioId(null)
    }
  }

  async function salvarSenhaUsuario(usuario: UsuarioSistema) {
    const senha = (senhaEdicao[usuario.id] || "").trim()

    if (!senha) {
      setMensagemUsuarios(`Informe a nova senha de ${usuario.usuario}`)
      return
    }

    setSalvandoUsuarioId(usuario.id)
    setMensagemUsuarios(`Salvando senha de ${usuario.usuario}...`)

    try {
      const resposta = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usuario.id, senha }),
      })

      const json = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        setMensagemUsuarios(json?.error || "Falha ao atualizar senha")
        return
      }

      setUsuariosSistema((anterior) => anterior.map((item) => (item.id === usuario.id ? json?.usuario : item)))
      setSenhaEdicao((anterior) => ({ ...anterior, [usuario.id]: "" }))
      setMensagemUsuarios(`Senha de ${usuario.usuario} atualizada com sucesso`)
    } catch {
      setMensagemUsuarios("Falha ao atualizar senha")
    } finally {
      setSalvandoUsuarioId(null)
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
    setErro("")
    setGerandoDocumento(true)
    setProgressoGeracao(5)
    setTempoDecorridoSegundos(0)
    inicioGeracaoRef.current = Date.now()

    try {
      if (!navigator.onLine) {
        const modelo = await obterModeloOfflineOuPadrao()
        const pacote = await gerarPacoteOffline(modelo.bytes, dados)
        baixarBlob(pacote.blob, pacote.nomeArquivo)
        setProgressoGeracao(100)
        return
      }

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

          <Link
            href="/offline"
            className="text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium text-blue-100 hover:bg-blue-800/80"
          >
            <FileText size={16} />
            Diagnóstico Offline
          </Link>

          {isAdmin && (
            <button
              onClick={() => setActiveTab("users")}
              className={cn(
                "text-left px-4 py-3 rounded-xl flex items-center gap-2 transition-all font-medium",
                activeTab === "users" ? "bg-blue-700 text-white shadow-md" : "text-blue-100 hover:bg-blue-800/80"
              )}
            >
              <Users size={16} />
              Usuários
            </button>
          )}
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

              <button
                type="button"
                onClick={excluirModeloPersonalizado}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Excluir meu modelo
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
            <div className={cn(
              "mb-4 rounded-xl border px-4 py-3 text-sm",
              estaOnline ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
            )}>
              {estaOnline
                ? "Modo online: o sistema sincroniza sessão e modelo com o servidor."
                : "Modo offline: processamento e exportação funcionam localmente; se houver vários registros, o download sai em ZIP com um DOCX por página."}
            </div>

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
                  <span className="text-xs text-slate-500">Modelo utilizado: {nomeModeloAtivo}</span>
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
                      {dados.map((d, i) => {
                        const tituloAnterior = i > 0 ? dados[i - 1]?.titulo || "" : ""
                        const novoTitulo = i === 0 || normalizarTituloParaAgrupamento(d.titulo) !== normalizarTituloParaAgrupamento(tituloAnterior)

                        return (
                          <Fragment key={`${i}-${d.titulo}-${d.servidor}`}>
                            {novoTitulo && (
                              <tr className="bg-amber-50">
                                <td colSpan={7} className="border-y-2 border-amber-300 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                                      {i === 0 ? "Primeiro título" : "Novo título"}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">{d.titulo || "Sem título informado"}</span>
                                  </div>
                                </td>
                              </tr>
                            )}

                            <tr key={i} className={cn("border-b border-slate-100 hover:bg-blue-50/30 transition-colors", i % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
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
                                  className={cn(
                                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400",
                                    novoTitulo && "border-amber-300 bg-amber-50 ring-2 ring-amber-100"
                                  )}
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
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all duration-300"
                    onClick={() => setActiveTab("input")}
                  >
                    Voltar
                  </button>
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
                  className="mt-2 rounded-xl bg-slate-600 px-6 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-slate-700"
                >
                  Voltar e corrigir
                </button>
              </div>
            )}

            {activeTab === "users" && isAdmin && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-lg font-semibold text-slate-800">Cadastrar novo usuário</h3>
                  <div className="grid gap-3 md:grid-cols-4">
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Usuário"
                      value={novoUsuario}
                      onChange={(e) => setNovoUsuario(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Senha"
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={novoPerfil}
                      onChange={(e) => setNovoPerfil(e.target.value === "admin" ? "admin" : "user")}
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <button
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                      type="button"
                      onClick={criarNovoUsuario}
                    >
                      Criar usuário
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Usuários cadastrados</h3>
                    <button
                      type="button"
                      onClick={carregarUsuariosSistema}
                      className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Atualizar lista
                    </button>
                  </div>

                  {mensagemUsuarios ? (
                    <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{mensagemUsuarios}</p>
                  ) : null}

                  <div className="overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-slate-700">
                          <th className="px-3 py-2">Usuário</th>
                          <th className="px-3 py-2">Perfil</th>
                          <th className="px-3 py-2">Senha</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuariosSistema.map((usuario) => (
                          <tr key={usuario.id} className="border-t border-slate-200">
                            <td className="px-3 py-2">{usuario.usuario}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                  value={perfilEdicao[usuario.id] || usuario.perfil}
                                  onChange={(e) =>
                                    setPerfilEdicao((anterior) => ({
                                      ...anterior,
                                      [usuario.id]: e.target.value === "admin" ? "admin" : "user",
                                    }))
                                  }
                                  disabled={salvandoUsuarioId === usuario.id}
                                >
                                  <option value="user">Usuário</option>
                                  <option value="admin">Administrador</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => salvarPerfilUsuario(usuario)}
                                  className="rounded-lg bg-blue-700 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
                                  disabled={salvandoUsuarioId === usuario.id}
                                >
                                  Salvar
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="password"
                                  placeholder="Nova senha"
                                  className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                  value={senhaEdicao[usuario.id] || ""}
                                  onChange={(e) =>
                                    setSenhaEdicao((anterior) => ({
                                      ...anterior,
                                      [usuario.id]: e.target.value,
                                    }))
                                  }
                                  disabled={salvandoUsuarioId === usuario.id}
                                />
                                <button
                                  type="button"
                                  onClick={() => salvarSenhaUsuario(usuario)}
                                  className="rounded-lg bg-indigo-700 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
                                  disabled={salvandoUsuarioId === usuario.id}
                                >
                                  Trocar
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2">{usuario.ativo ? "Ativo" : "Inativo"}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => alternarStatusUsuario(usuario)}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors",
                                  usuario.ativo ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                                )}
                                disabled={salvandoUsuarioId === usuario.id}
                              >
                                {usuario.ativo ? "Desativar" : "Ativar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {carregandoUsuarios ? <p className="mt-3 text-xs text-slate-500">Carregando usuários...</p> : null}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
