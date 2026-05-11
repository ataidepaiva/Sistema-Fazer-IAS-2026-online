import "server-only"

function extrairMasp(texto: string): string {
  const match = texto.match(/ma\s*sp\s*[:\-]?\s*([\d.\/-]+)/i)

  if (match?.[1]) {
    return match[1].trim()
  }

  return ""
}

function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
}

function ehAtoEspecial(titulo: string): boolean {
  const tituloNormalizado = normalizarTitulo(titulo)
  return (
    tituloNormalizado.startsWith("RETIFICACAO") ||
    tituloNormalizado.startsWith("ANULACAO") ||
    tituloNormalizado.startsWith("REVOGACAO")
  )
}

function ehLinhaTitulo(linha: string): boolean {
  const valor = linha.trim()

  if (!valor) {
    return false
  }

  const normalizado = normalizarTitulo(valor)

  if (ehAtoEspecial(normalizado)) {
    return true
  }

  // Padrão: Se contém "ATO" e ("Nº" ou "No") e termina com números e hífens/travessões
  // Exemplos: "DESIGNAÇÃO DE LOCAL DE EXERCÍCIO – ATO Nº 07-25"
  //           "AFASTAMENTO PRELIMINAR À APOSENTADORIA – ATO Nº 21 -25"
  if (/ATO\s+N[ºo0O]\s*[\d\s\-–—]+/.test(valor) && /[\d\-–—]$/.test(valor)) {
    // Verifica se tem pelo menos algumas letras maiúsculas antes de "ATO"
    const antesAto = valor.split(/ATO/i)[0]
    const letrasMaiusculas = antesAto.replace(/[^A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/g, "")
    if (letrasMaiusculas.length >= 3) {
      return true
    }
  }

  // Rejeita linhas que terminam com ponto, dois-pontos ou ponto-e-vírgula
  if (/[.:;]$/.test(valor) || valor.includes(":")) {
    return false
  }

  const letrasMaiusculas = normalizado.replace(/[^A-ZÀ-Ú]/g, "")

  // Precisa de pelo menos 4 letras maiúsculas
  if (letrasMaiusculas.length < 4) {
    return false
  }

  // Conta letras minúsculas (excluindo acentos e caracteres especiais)
  const letrasMinusculas = valor.replace(/[^a-zá-ú]/gi, "").replace(/[A-ZÀ-Ú]/g, "")
  
  // Tolera até 20% de letras minúsculas para casos como "À APOSENTADORIA"
  const percentualMinusculas = letrasMinusculas.length / (letrasMaiusculas.length + letrasMinusculas.length)

  return percentualMinusculas < 0.2
}

function dividirTextoPorTitulos(texto: string) {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n")
  const blocos: string[] = []
  let blocoAtual: string[] = []
  let linhaAnteriorVazia = false

  for (let i = 0; i < linhas.length; i++) {
    const linhaOriginal = linhas[i]
    const linha = linhaOriginal.trimEnd()

    if (!linha.trim()) {
      linhaAnteriorVazia = true
      if (blocoAtual.length > 0) {
        blocoAtual.push("")
      }
      continue
    }

    // Se a linha anterior era vazia (parágrafo) e esta linha parece um título, inicia novo bloco
    if (linhaAnteriorVazia && ehLinhaTitulo(linha) && blocoAtual.length > 0) {
      const blocoAnterior = blocoAtual.join("\n").trim()

      if (blocoAnterior) {
        blocos.push(blocoAnterior)
      }

      blocoAtual = [linha.trim()]
      linhaAnteriorVazia = false
      continue
    }

    linhaAnteriorVazia = false
    blocoAtual.push(linha.trim())
  }

  const ultimoBloco = blocoAtual.join("\n").trim()

  if (ultimoBloco) {
    blocos.push(ultimoBloco)
  }

  return blocos
}

export function processarTexto(texto: string) {
  const blocos = dividirTextoPorTitulos(texto)

  const resultado: {
    titulo: string
    texto_base: string
    servidor: string
    masp: string
    pagina: string
    coluna: string
    data: string
  }[] = []

  blocos.forEach(bloco => {
    const linhas = bloco.trim().split("\n")
    const maspDoBloco = extrairMasp(bloco)

    const titulo = (linhas[0] || "").trim()
    const resto = linhas.slice(1).join(" ")

    const atoEspecial = ehAtoEspecial(titulo)
    const index = resto.indexOf(":")

    const texto_base = atoEspecial || index === -1 ? "" : resto.slice(0, index + 1)
    const lista = atoEspecial || index === -1 ? resto : resto.slice(index + 1)

    const servidores = lista
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    servidores.forEach(servidor => {
      resultado.push({
        titulo,
        texto_base,
        servidor,
        masp: extrairMasp(servidor) || maspDoBloco,
        pagina: "",
        coluna: "",
        data: ""
      })
    })
  })

  return resultado
}