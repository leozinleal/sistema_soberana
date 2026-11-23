// Cores dos gráficos (paleta validada para daltonismo)
export const COR_ENTRADA = '#2a78d6'
export const COR_SAIDA = '#eb6834'
export const COR_GRID = '#e1e0d9'
export const COR_EIXO = '#71717a'

/** Agrupa lançamentos pagos por mês: [{ mes:'2026-11', entradas, saidas }] */
export function porMes(lancamentos) {
  const mapa = {}
  for (const l of lancamentos) {
    if (l.status !== 'pago') continue
    const m = String(l.data).slice(0, 7)
    mapa[m] ??= { mes: m, entradas: 0, saidas: 0 }
    mapa[m][l.tipo === 'entrada' ? 'entradas' : 'saidas'] += Number(l.valor)
  }
  return Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes))
}

/** Gastos pagos por categoria, do maior para o menor */
export function gastosPorCategoria(lancamentos, nomes) {
  const mapa = {}
  for (const l of lancamentos) {
    if (l.tipo !== 'saida' || l.status !== 'pago') continue
    mapa[l.categoria] = (mapa[l.categoria] ?? 0) + Number(l.valor)
  }
  return Object.entries(mapa)
    .map(([k, valor]) => ({ categoria: nomes[k] ?? k, valor }))
    .sort((a, b) => b.valor - a.valor)
}

export const moedaCurta = (v) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`
