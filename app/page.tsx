import Link from "next/link"
import Image from "next/image"
import styles from "./page.module.css"

export default function SREVarginha() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
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

      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>Sistema de Informativos</h2>
        <p className={styles.heroText}>
          Plataforma inteligente para processamento e geração automatizada de documentos oficiais com precisão e segurança
        </p>
      </section>

      <main className={styles.content}>
        <div className={styles.cards}>
          <article className={styles.card}>
            <h3>Processamento Automático</h3>
            <p>Extração inteligente de dados de textos para geração automática de registros estruturados e validados</p>
          </article>

          <article className={styles.card}>
            <h3>Gestão de Servidores</h3>
            <p>Edição em tempo real e validação completa de informações de servidores públicos</p>
          </article>

          <article className={styles.card}>
            <h3>Documentação Segura</h3>
            <p>Geração de documentos Word padronizados com garantia de integridade e conformidade</p>
          </article>
        </div>

        <div className={styles.ctaWrap}>
          <Link href="/login" className={styles.ctaBtn}>
            Acessar Login do Sistema
          </Link>
          <p className={styles.ctaNote}>Acesso restrito a usuários autorizados</p>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Superintendência Regional de Ensino de Varginha</p>
        <p>Sistema desenvolvido para otimização na produção de IAS</p>
        <p>© {new Date().getFullYear()} Desenvolvido por Ataide de Paula Paiva - Todos os Direitos Reservados</p>
      </footer>
    </div>
  )
}
