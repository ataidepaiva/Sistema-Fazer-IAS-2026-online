import Link from "next/link"
import Image from "next/image"
import { FileText, Shield, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Institucional */}
      <header className="bg-white shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex flex-row flex-nowrap items-center gap-4">
              <div className="shrink-0 bg-white p-2 rounded-lg border border-blue-100 shadow-sm">
                <Image
                  src="/logo-sre-varginha.png"
                  alt="Logo oficial da Superintendência Regional de Ensino de Varginha"
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">Superintendência Regional de Ensino de Varginha</h1>
                <p className="text-sm text-gray-600">Sistema de Geração de Documentos</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Versão 1.0</p>
              <p className="text-xs text-gray-400">Sistema Oficial</p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao Sistema de Informativos (SInfo)
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plataforma institucional para processamento e geração automatizada de documentos oficiais
          </p>
        </div>

        {/* Cards de Funcionalidades */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-50">
            <div className="bg-blue-100 p-3 rounded-lg w-fit mb-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processamento Inteligente</h3>
            <p className="text-gray-600 text-sm">
              Extração automática de dados de textos brutos para geração de registros estruturados
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-50">
            <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestão de Servidores</h3>
            <p className="text-gray-600 text-sm">
              Organização e validação de informações de servidores públicos
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-50">
            <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentação Oficial</h3>
            <p className="text-gray-600 text-sm">
              Geração de documentos Word padronizados e certificados
            </p>
          </div>
        </div>

        {/* Botão de Acesso */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            <FileText className="mr-2 h-5 w-5" />
            Acessar Painel de Controle
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Acesso restrito a usuários autorizados
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2024 Superintendência Regional de Ensino de Varginha. Todos os direitos reservados.</p>
            <p className="mt-2">Sistema desenvolvido para otimização de processos administrativos</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
