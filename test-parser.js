function normalizarTitulo(titulo) {
  return titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
}

function ehAtoEspecial(titulo) {
  const t = normalizarTitulo(titulo)
  return t.startsWith('RETIFICACAO') || t.startsWith('ANULACAO') || t.startsWith('REVOGACAO')
}

function ehLinhaTitulo(linha) {
  const valor = linha.trim()

  if (!valor) {
    return false
  }

  const normalizado = normalizarTitulo(valor)

  if (ehAtoEspecial(normalizado)) {
    return true
  }

  // Padrão: Se contém "ATO" e ("Nº" ou "No") e termina com números e hífens/travessões
  if (/ATO\s+N[ºo0O]\s*[\d\s\-–—]+/.test(valor) && /[\d\-–—]$/.test(valor)) {
    // Verifica se tem pelo menos algumas letras maiúsculas antes de "ATO"
    const antesAto = valor.split(/ATO/i)[0]
    const letrasMaiusculas = antesAto.replace(/[^A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/g, '')
    if (letrasMaiusculas.length >= 3) {
      return true
    }
  }

  // Rejeita linhas que terminam com ponto, dois-pontos ou ponto-e-vírgula
  if (/[.:;]$/.test(valor) || valor.includes(':')) {
    return false
  }

  const letrasMaiusculas = normalizado.replace(/[^A-ZÀ-Ú]/g, '')

  // Precisa de pelo menos 4 letras maiúsculas
  if (letrasMaiusculas.length < 4) {
    return false
  }

  // Conta letras minúsculas
  const letrasMinusculas = valor.replace(/[^a-zá-ú]/gi, '').replace(/[A-ZÀ-Ú]/g, '')

  // Tolera até 20% de letras minúsculas
  const percentualMinusculas = letrasMinusculas.length / (letrasMaiusculas.length + letrasMinusculas.length)

  return percentualMinusculas < 0.2
}

function dividirTextoPorTitulos(texto) {
  const linhas = texto.replace(/\r\n?/g, '\n').split('\n')
  const blocos = []
  let blocoAtual = []
  let linhaAnteriorVazia = false

  console.log(`[PARSE] Total de linhas: ${linhas.length}`)

  for (let i = 0; i < linhas.length; i++) {
    const linhaOriginal = linhas[i]
    const linha = linhaOriginal.trimEnd()

    console.log(`[L${i}] "${linha.substring(0, 40)}..." | vazio: ${!linha.trim()} | bloco.size: ${blocoAtual.length}`)

    if (!linha.trim()) {
      linhaAnteriorVazia = true
      if (blocoAtual.length > 0) {
        blocoAtual.push('')
      }
      continue
    }

    const ehTitulo = ehLinhaTitulo(linha)
    if (ehTitulo && linhaAnteriorVazia) {
      console.log(`[TÍTULO] Linha ${i}: "${linha.substring(0, 50)}..."`)
    }

    if (linhaAnteriorVazia && ehTitulo && blocoAtual.length > 0) {
      const ultimaLinhaBloco = blocoAtual.filter((l) => l.trim()).slice(-1)[0]
      const temPonto = ultimaLinhaBloco && /\.$/.test(ultimaLinhaBloco.trim())

      console.log(`[DIVISÃO?] temPonto: ${temPonto} | última linha: "${ultimaLinhaBloco?.substring(0, 30)}..."`)

      if (temPonto) {
        const blocoAnterior = blocoAtual.join('\n').trim()

        if (blocoAnterior) {
          console.log(`[PUSH] Bloco ${blocos.length + 1}: "${blocoAnterior.split('\n')[0]}"`)
          blocos.push(blocoAnterior)
        }

        blocoAtual = [linha.trim()]
        linhaAnteriorVazia = false
        continue
      }
    }

    linhaAnteriorVazia = false
    blocoAtual.push(linha.trim())
  }

  const ultimoBloco = blocoAtual.join('\n').trim()

  if (ultimoBloco) {
    console.log(`[PUSH] Último bloco: "${ultimoBloco.split('\n')[0]}"`)
    blocos.push(ultimoBloco)
  }

  console.log(`[FINAL] Total de blocos: ${blocos.length}`)
  return blocos
}

const texto = `OPÇÃO POR COMPOSIÇÃO REMUNERATÓRIA - ATO Nº 08 -25
Registra Opção Remuneratória, nos termos do inciso II, art. 23 da Lei nº 21710, de 2015, e art. 28-A da Lei nº 15293, de 2004, do(s) servidor(es): Nepomuceno, E.E. Coronel Joaquim Ribeiro, MaSP 1.381.640-0, Eliane de Fátima Aguiar Santos, ATB - adm. 1, pela remuneração do cargo de provimento efetivo acrescida de 50% da remuneração do cargo de provimento em comissão de Secretário de Escola - SE IV, a partir de 03/10/2025.
 
DESIGNAÇÃO DE LOCAL DE EXERCÍCIO – ATO Nº 07-25
Designa, nos termos do Decreto nº 18.073, de 08-09-76, o(s) servidor(es), para: Machado, E.E. Rubens Garcia, MaSP 1.056.385-6, Cleison Carvalho Pereira, ATB - adm. 4, de Machado, E.E. Iracema Rodrigues, devendo entrar em exercício no prazo de 30 (trinta) dias, a contar da data de publicação deste ato.
 
AFASTAMENTO PRELIMINAR À APOSENTADORIA – ATO Nº 21 -25
Registra Afastamento Preliminar à Aposentadoria Voluntária, nos termos do § 24 do art. 36 da CE-1989 e artigo 9º da LCE nº 64, de 2002, com redação dada pela LCE nº 156, de 2020 do(s) servidor(es): Machado, CESEC Dr. Tancredo de Almeida Neves, MaSP 381.086-8, Fábio Couto Brigagão, a partir de 06/10/2025.
 
AFASTAMENTO PRELIMINAR À APOSENTADORIA – ATO Nº 18-25
Registra Afastamento Preliminar à Aposentadoria Voluntária, nos termos do § 24 do art. 36 da CE-1989 e artigo 9º da LCE nº 64, de 2002, com redação dada pela LCE nº 156, de 2020 do(s) servidor(es): Cambuquira, E.E. Clóvis Salgado, MaSP 892.002-7, Elienai Domingues de Aguiar, a partir de 04/10/2025.`

const blocos = dividirTextoPorTitulos(texto)

console.log('\n=== RESULTADO ===')
console.log(`Total de blocos: ${blocos.length}`)
blocos.forEach((b, i) => {
  console.log(`${i + 1}. ${b.split('\n')[0].trim()}`)
})
