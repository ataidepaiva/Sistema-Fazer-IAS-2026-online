import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sistema de Informativos (SInfo)",
  description: "Plataforma institucional para processamento e geração automatizada de documentos oficiais",
  keywords: "IAS, Assistência Social, Documentos, Sistema Oficial",
  authors: [{ name: "Superintendência Regional de Ensino de Varginha" }],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-br">
      <body className="antialiased">{children}</body>
    </html>
  )
}
