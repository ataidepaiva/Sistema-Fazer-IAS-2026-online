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

  if (/[.:;]$/.test(valor) || valor.includes(":")) {
    return false
  }

  const temLetraMinuscula = /[a-zá-ú]/.test(valor)

  if (temLetraMinuscula) {
    return false
  }

  const letrasMaiusculas = normalizado.replace(/[^A-ZÀ-Ú]/g, "")

  if (letrasMaiusculas.length < 4) {
    return false
  }

  return true
}

function dividirTextoPorTitulos(texto: string) {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n")
  const blocos: string[] = []
  let blocoAtual: string[] = []

  for (const linhaOriginal of linhas) {
    const linha = linhaOriginal.trimEnd()

    if (!linha.trim()) {
      if (blocoAtual.length > 0) {
        blocoAtual.push("")
      }

      continue
    }

    if (ehLinhaTitulo(linha) && blocoAtual.length > 0) {
      const blocoAnterior = blocoAtual.join("\n").trim()

      if (blocoAnterior) {
        blocos.push(blocoAnterior)
      }

      blocoAtual = [linha.trim()]
      continue
    }

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