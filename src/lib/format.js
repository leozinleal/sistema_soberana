const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (v) => brl.format(Number(v) || 0)

/** '2026-11-23' -> '23/11/2026' (sem problema de fuso) */
export const date = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const today = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

/** Aceita "1.234,56", "1234.56" ou número */
export const parseMoney = (v) => {
  if (typeof v === 'number') return v
  if (!v) return 0
  const s = String(v).trim()
  const n = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(n) || 0
}

export const mesAno = (iso) => {
  const [y, m] = String(iso).split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(m) - 1]}/${y.slice(2)}`
}
