"use client"

import Link from "next/link"
import Image from "next/image"

export default function SREVarginha() {
  return (
    <div className="page">
      <header className="header">
        <div className="header-left">
          <div className="logo-badge">
            <Image src="/logo-sre-varginha.png" alt="Logo SRE" width={114} height={114} className="logo" priority />
          </div>
          <div>
            <h1 className="org">SRE Varginha</h1>
            <p className="subtitle">Sistema de Informativos</p>
          </div>
        </div>
        <span className="version">v1.0</span>
      </header>

      <section className="hero">
        <h2 className="hero-title">Sistema de Informativos</h2>
        <p className="hero-text">
          Plataforma inteligente para processamento e geração automatizada de documentos oficiais com precisão e segurança
        </p>
      </section>

      <main className="content">
        <div className="cards">
          <article className="card">
            <h3>Processamento Automático</h3>
            <p>Extração inteligente de dados de textos para geração automática de registros estruturados e validados</p>
          </article>

          <article className="card">
            <h3>Gestão de Servidores</h3>
            <p>Edição em tempo real e validação completa de informações de servidores públicos</p>
          </article>

          <article className="card">
            <h3>Documentação Segura</h3>
            <p>Geração de documentos Word padronizados com garantia de integridade e conformidade</p>
          </article>
        </div>

        <div className="cta-wrap">
          <Link href="/dashboard" className="cta-btn">
            Acessar Painel de Controle (IAS)
          </Link>
          <Link href="/lauda" className="cta-btn cta-btn-secondary">
            Preparar Lauda para Envio
          </Link>
          <p className="cta-note">Acesso restrito a usuários autorizados</p>
        </div>
      </main>

      <footer className="footer">
        <p>© 2026 Superintendência Regional de Ensino de Varginha</p>
        <p>Sistema desenvolvido para otimização de processos administrativos</p>
      </footer>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #e5e7eb;
          color: #1f2937;
          font-family: Arial, Helvetica, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: #0d47a1;
          color: #fff;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-badge {
          width: 90px;
          height: 90px;
          border-radius: 999px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }

        .logo {
          width: 105px;
          height: 105px;
          object-fit: contain;
        }

        .org {
          margin: 0;
          font-size: 36px;
          line-height: 1.05;
          font-weight: 700;
        }

        .subtitle {
          margin: 2px 0 0;
          font-size: 33px;
          line-height: 1.05;
          font-weight: 500;
        }

        .version {
          font-size: 30px;
          font-weight: 500;
          opacity: 0.95;
          padding-right: 8px;
        }

        .hero {
          background: linear-gradient(to right, #2b6fba, #4a9fe8);
          color: #fff;
          text-align: center;
          padding: 48px 20px 50px;
        }

        .hero-title {
          margin: 0 0 10px;
          font-size: 47px;
          line-height: 1.08;
          font-weight: 700;
        }

        .hero-text {
          margin: 0 auto;
          max-width: 980px;
          font-size: 37px;
          line-height: 1.12;
          font-weight: 400;
        }

        .content {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 48px 20px 38px;
          flex: 1;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
          padding: 24px 24px 22px;
        }

        .card h3 {
          margin: 0 0 10px;
          color: #0d47a1;
          font-size: 40px;
          line-height: 1.1;
          font-weight: 700;
        }

        .card p {
          margin: 0;
          color: #222;
          font-size: 40px;
          line-height: 1.1;
          font-weight: 400;
        }

        .cta-wrap {
          text-align: center;
          margin-top: 42px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        .cta-btn {
          display: inline-block;
          background: #0d47a1;
          color: #fff;
          text-decoration: none;
          border-radius: 12px;
          padding: 14px 36px;
          font-size: 37px;
          line-height: 1;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .cta-btn:hover {
          background: #1565c0;
        }

        .cta-btn-secondary {
          background: #059669;
        }

        .cta-btn-secondary:hover {
          background: #047857;
        }

        .cta-note {
          margin: 12px 0 0;
          color: #4b5563;
          font-size: 34px;
          line-height: 1.1;
        }

        .footer {
          background: #0d47a1;
          color: #fff;
          text-align: center;
          padding: 14px 20px 15px;
          font-size: 21px;
          line-height: 1.35;
        }

        .footer p {
          margin: 2px 0;
        }

        @media (max-width: 1200px) {
          .org {
            font-size: 26px;
          }

          .subtitle,
          .version {
            font-size: 22px;
          }

          .hero-title {
            font-size: 42px;
          }

          .hero-text {
            font-size: 26px;
          }

          .card h3,
          .card p,
          .cta-btn,
          .cta-note {
            font-size: 26px;
          }
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: 1fr;
          }

          .org {
            font-size: 20px;
          }

          .subtitle,
          .version {
            font-size: 15px;
          }

          .hero-title {
            font-size: 33px;
          }

          .hero-text {
            font-size: 20px;
            line-height: 1.25;
          }

          .card h3,
          .card p {
            font-size: 24px;
          }

          .cta-btn {
            font-size: 20px;
          }

          .cta-note {
            font-size: 16px;
          }

          .footer {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}
