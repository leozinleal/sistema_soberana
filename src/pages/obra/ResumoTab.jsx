import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { TODAS_CATEGORIAS } from '../../lib/constants'
import { date, money } from '../../lib/format'
import { gastosPorCategoria, porMes } from '../../lib/chart'
import { StatCard } from '../../components/ui'
import { GraficoCategorias, GraficoMensal } from '../../components/Graficos'
import LancamentoLista from '../../components/LancamentoLista'

export default function ResumoTab({ obra, lancamentos, notas, equipe }) {
  const soma = (fn) => lancamentos.filter(fn).reduce((s, l) => s + Number(l.valor), 0)
  const recebido = soma((l) => l.tipo === 'entrada' && l.status === 'pago')
  const aReceber = soma((l) => l.tipo === 'entrada' && l.status === 'pendente')
  const gasto = soma((l) => l.tipo === 'saida' && l.status === 'pago')
  const aPagar = soma((l) => l.tipo === 'saida' && l.status === 'pendente')
  const maoDeObra = soma((l) => l.categoria === 'mao_de_obra' && l.status === 'pago')
  const contrato = Number(obra.valor_contrato) || 0
  const orcamento = Number(obra.orcamento_previsto) || 0
  const custoTotal = gasto + aPagar
  const lucroPrevisto = contrato - custoTotal
  const pctOrc = orcamento ? (custoTotal / orcamento) * 100 : 0

  const pendentes = lancamentos
    .filter((l) => l.status === 'pendente')
    .sort((a, b) => String(a.vencimento ?? a.data).localeCompare(String(b.vencimento ?? b.data)))
    .slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Números principais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saldo da obra" value={money(recebido - gasto)} hint="Recebido − gasto (já pagos)" tone={recebido - gasto < 0 ? 'red' : 'default'} />
        <StatCard label="Lucro previsto" value={contrato ? money(lucroPrevisto) : '—'} hint={contrato ? 'Contrato − todos os custos' : 'Informe o valor do contrato'} tone={lucroPrevisto < 0 ? 'red' : 'green'} />
        <StatCard label="Total gasto" value={money(gasto)} hint={`${money(maoDeObra)} em mão de obra`} tone="red" />
        <StatCard label="Recebido" value={money(recebido)} hint={contrato ? `de ${money(contrato)} do contrato` : undefined} tone="green" />
        <StatCard label="A pagar" value={money(aPagar)} tone="amber" />
        <StatCard label="A receber" value={money(aReceber)} tone="amber" />
        <StatCard label="Notas anexadas" value={notas.length} hint={money(notas.reduce((s, n) => s + Number(n.valor), 0))} />
        <StatCard label="Funcionários" value={equipe.length} />
      </div>

      {orcamento > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-bold">Orçamento previsto</p>
            <p className="text-sm text-zinc-500">
              <b className="text-zinc-900">{money(custoTotal)}</b> de {money(orcamento)} ({pctOrc.toFixed(0)}%)
            </p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full rounded-full ${pctOrc > 100 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${Math.min(pctOrc, 100)}%` }} />
          </div>
          {pctOrc > 100 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
              <AlertTriangle className="h-4 w-4" /> Orçamento estourado em {money(custoTotal - orcamento)}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <p className="mb-3 font-bold">Entradas e saídas por mês</p>
          <GraficoMensal dados={porMes(lancamentos)} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <p className="mb-4 font-bold">Para onde foi o dinheiro</p>
          <GraficoCategorias dados={gastosPorCategoria(lancamentos, TODAS_CATEGORIAS)} />
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="card p-5">
          <p className="mb-3 font-bold">Próximos vencimentos</p>
          <ul className="divide-y divide-zinc-100">
            {pendentes.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.descricao}</p>
                  <p className="text-xs text-zinc-500">{l.tipo === 'entrada' ? 'A receber' : 'A pagar'} · vence {date(l.vencimento ?? l.data)}</p>
                </div>
                <b className={l.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}>{money(l.valor)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lancamentos.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">Últimos lançamentos</p>
            <Link to={`/obras/${obra.id}/lancamentos`} className="text-sm font-semibold text-zinc-500 hover:text-ink">Ver todos →</Link>
          </div>
          <LancamentoLista itens={lancamentos.slice(0, 6)} />
        </div>
      )}
    </div>
  )
}
