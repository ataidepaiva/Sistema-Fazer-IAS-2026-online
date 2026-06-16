"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { autenticarOffline, gravarCookiePerfilOffline, salvarCredenciaisOffline } from "@/lib/offline-client"
import styles from "./page.module.css"

export default function LoginPage() {
  const anoAtual = new Date().getFullYear()
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [estaOnline, setEstaOnline] = useState(true)

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

  async function entrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro("")
    setCarregando(true)

    try {
      if (!navigator.onLine) {
        const sessaoOffline = await autenticarOffline(usuario, senha)

        if (!sessaoOffline) {
          setErro("Sem rede: use um usuário que já tenha entrado neste navegador anteriormente")
          return
        }

        gravarCookiePerfilOffline(sessaoOffline.perfil)
        router.push("/dashboard")
        router.refresh()
        return
      }

      const resposta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      })

      if (!resposta.ok) {
        const json = await resposta.json().catch(() => null)
        setErro(json?.error || "Falha ao entrar no sistema")
        return
      }

      const json = await resposta.json().catch(() => null)
      const perfil = json?.perfil === "admin" ? "admin" : "user"
      const nomeUsuario = typeof json?.usuario === "string" && json.usuario.trim() ? json.usuario.trim() : usuario.trim()

      await salvarCredenciaisOffline({ usuario: nomeUsuario, senha, perfil })

      router.push("/dashboard")
      router.refresh()
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandWrap}>
          <div className={styles.logoBadge}>
            <Image src="/logo-sre-varginha.png" alt="Logo SRE" width={114} height={114} className={styles.logo} priority />
          </div>
          <div>
            <h1 className={styles.org}>SRE Varginha</h1>
            <p className={styles.subtitle}>Sistema de Informativos</p>
          </div>
        </div>
        <span className={styles.version}>v2.6</span>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.badge}>Acesso Institucional</span>
          <h2 className={styles.title}>Entrar no sistema</h2>
          <p className={styles.description}>
            Utilize suas credenciais para acessar o painel de controle e continuar o processamento dos informativos.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLogoWrap}>
              <Image src="/logo-sre-varginha.png" alt="Logo SRE" width={84} height={84} className={styles.cardLogo} priority />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Login</h3>
              <p className={styles.cardText}>Informe usuário e senha para continuar</p>
              <p className={styles.tip}>Credenciais de acesso configuradas para uso interno</p>
            </div>
          </div>

          {!estaOnline ? <p className={styles.tip}>Modo offline ativo: o último acesso deste navegador pode continuar trabalhando sem rede.</p> : null}

          <form onSubmit={entrar} className={styles.form}>
            <label className={styles.label}>
              Usuário
              <input
                className={styles.input}
                type="text"
                name="usuario"
                placeholder="Digite seu usuário"
                autoComplete="username"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
              />
            </label>

            <label className={styles.label}>
              Senha
              <input
                className={styles.input}
                type="password"
                name="senha"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
              />
            </label>

            {erro ? <p className={styles.error}>{erro}</p> : null}

            <button type="submit" className={styles.button} disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className={styles.actions}>
            <Link href="/" className={styles.secondaryLink}>
              Voltar para a página inicial
            </Link>
            <p className={styles.helpText}>Acesso restrito a usuários autorizados</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Superintendência Regional de Ensino de Varginha</p>
        <p>Sistema desenvolvido para otimização na produção de IAS</p>
        <p>© {anoAtual} Desenvolvido por Ataide de Paula Paiva - Todos os Direitos Reservados</p>
      </footer>
    </div>
  )
}
