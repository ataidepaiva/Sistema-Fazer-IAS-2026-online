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

export function processarTexto(texto: string) {
  const blocos = texto.split("\n\n")

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