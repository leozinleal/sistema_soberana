import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { TODAS_CATEGORIAS } from './constants'
import { date, money } from './format'

async function carregarLogo() {
  const res = await fetch('/logo-soberana.png')
  const blob = await res.blob()
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.readAsDataURL(blob)
  })
}

/**
 * Gera o extrato da obra em PDF.
 * @param {object} obra      registro da obra (com clientes.nome)
 * @param {array}  linhas    lançamentos já filtrados
 * @param {string} descFiltros  texto descrevendo os filtros usados
 */
export async function gerarExtratoPDF(obra, linhas, descFiltros) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const logo = await carregarLogo()

  // Cabeçalho
  doc.setFillColor(255, 242, 18)
  doc.rect(0, 0, W, 3, 'F')
  doc.addImage(logo, 'PNG', 14, 9, 52, 13)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Extrato da obra', W - 14, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(110)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - 14, 20.5, { align: 'right' })

  // Dados da obra
  doc.setTextColor(20)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(obra.nome, 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90)
  const info = [
    obra.endereco && `Endereço: ${obra.endereco}`,
    `Cliente: ${obra.clientes?.nome ?? '—'}`,
    `Filtros: ${descFiltros}`,
  ].filter(Boolean)
  info.forEach((t, i) => doc.text(t, 14, 39 + i * 5))

  // Resumo
  const soma = (fn) => linhas.filter(fn).reduce((s, l) => s + Number(l.valor), 0)
  const entradas = soma((l) => l.tipo === 'entrada' && l.status === 'pago')
  const saidas = soma((l) => l.tipo === 'saida' && l.status === 'pago')
  const aReceber = soma((l) => l.tipo === 'entrada' && l.status === 'pendente')
  const aPagar = soma((l) => l.tipo === 'saida' && l.status === 'pendente')

  const y0 = 39 + info.length * 5 + 3
  const boxes = [
    ['Entradas pagas', money(entradas), [21, 128, 61]],
    ['Saídas pagas', money(saidas), [220, 38, 38]],
    ['Saldo', money(entradas - saidas), [17, 17, 17]],
    ['A receber / A pagar', `${money(aReceber)} / ${money(aPagar)}`, [161, 98, 7]],
  ]
  const bw = (W - 28 - 9) / 4
  boxes.forEach(([label, val, cor], i) => {
    const x = 14 + i * (bw + 3)
    doc.setDrawColor(225)
    doc.setFillColor(248, 248, 248)
    doc.roundedRect(x, y0, bw, 16, 2, 2, 'FD')
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text(label.toUpperCase(), x + 3, y0 + 5.5)
    doc.setFontSize(i === 3 ? 8 : 10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...cor)
    doc.text(val, x + 3, y0 + 12)
    doc.setFont('helvetica', 'normal')
  })

  // Tabela
  autoTable(doc, {
    startY: y0 + 22,
    head: [['Data', 'Descrição', 'Categoria', 'Situação', 'Entrada', 'Saída']],
    body: linhas.map((l) => [
      date(l.data),
      [l.descricao, l.funcionarios?.nome && `Func.: ${l.funcionarios.nome}`, (l.fornecedores?.nome ?? l.fornecedor) && `Forn.: ${l.fornecedores?.nome ?? l.fornecedor}`, l.notas?.numero && !l.descricao.startsWith('NF') && `NF ${l.notas.numero}`]
        .filter(Boolean)
        .join('\n'),
      TODAS_CATEGORIAS[l.categoria] ?? l.categoria,
      l.status === 'pago' ? 'Pago' : `Pendente${l.vencimento ? ` (${date(l.vencimento)})` : ''}`,
      l.tipo === 'entrada' ? money(l.valor) : '',
      l.tipo === 'saida' ? money(l.valor) : '',
    ]),
    foot: [['', 'TOTAL', '', '', money(soma((l) => l.tipo === 'entrada')), money(soma((l) => l.tipo === 'saida'))]],
    styles: { fontSize: 8, cellPadding: 2, textColor: 30 },
    headStyles: { fillColor: [17, 17, 17], textColor: [255, 242, 18], fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 19 },
      2: { cellWidth: 34 },
      3: { cellWidth: 24 },
      4: { halign: 'right', cellWidth: 25, textColor: [21, 128, 61] },
      5: { halign: 'right', cellWidth: 25, textColor: [220, 38, 38] },
    },
    margin: { left: 14, right: 14 },
  })

  // Rodapé com paginação
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(140)
    const H = doc.internal.pageSize.getHeight()
    doc.text('Soberana Imobiliária e Construtora — Sistema de Gestão de Obras', 14, H - 8)
    doc.text(`Página ${i} de ${n}`, W - 14, H - 8, { align: 'right' })
  }

  const nomeArq = `extrato-${obra.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`
  doc.save(nomeArq)
}
