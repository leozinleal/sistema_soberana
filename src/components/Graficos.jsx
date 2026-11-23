import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { COR_EIXO, COR_ENTRADA, COR_GRID, COR_SAIDA, moedaCurta } from '../lib/chart'
import { mesAno, money } from '../lib/format'

function Dica({ active, payload, label, titulo }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-zinc-800">{titulo ? titulo(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-zinc-700">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          {p.name}: <b>{money(p.value)}</b>
        </p>
      ))}
    </div>
  )
}

/** Entradas x saídas por mês (barras agrupadas) */
export function GraficoMensal({ dados }) {
  if (!dados.length) return <p className="py-10 text-center text-sm text-zinc-400">Sem lançamentos pagos ainda</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} barGap={2} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={COR_GRID} />
        <XAxis dataKey="mes" tickFormatter={mesAno} tick={{ fontSize: 11, fill: COR_EIXO }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
        <YAxis tickFormatter={moedaCurta} tick={{ fontSize: 11, fill: COR_EIXO }} axisLine={false} tickLine={false} width={84} />
        <Tooltip content={<Dica titulo={mesAno} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: '#3f3f46' }} />
        <Bar dataKey="entradas" name="Entradas" fill={COR_ENTRADA} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="saidas" name="Saídas" fill={COR_SAIDA} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Gastos por categoria (barras horizontais, um tom só, com valor ao lado) */
export function GraficoCategorias({ dados }) {
  if (!dados.length) return <p className="py-10 text-center text-sm text-zinc-400">Sem gastos pagos ainda</p>
  const total = dados.reduce((s, d) => s + d.valor, 0)
  return (
    <ul className="space-y-3">
      {dados.map((d) => {
        const pct = total ? (d.valor / total) * 100 : 0
        return (
          <li key={d.categoria} title={`${d.categoria}: ${money(d.valor)} (${pct.toFixed(1)}%)`}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <span className="truncate font-medium text-zinc-700">{d.categoria}</span>
              <span className="shrink-0 font-semibold text-zinc-900">
                {money(d.valor)} <span className="font-normal text-zinc-400">· {pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1.5)}%`, background: COR_SAIDA }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
