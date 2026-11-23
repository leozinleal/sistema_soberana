import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TODAS_CATEGORIAS } from '../lib/constants'
import { date, money } from '../lib/format'
import { gastosPorCategoria, porMes } from '../lib/chart'
import { EmptyState, Loading, PageHeader, StatCard } from '../components/ui'
import { GraficoCategorias, GraficoMensal } from '../components/Graficos'
import { StatusBadge } from './Obras'
import { useToast } from '../components/Toast'

export default function Painel() {
  const toast = useToast()
  const [dados, setDados] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [r, l] = await Promise.all([
        supabase.from('obras_resumo').select('*'),
        supabase.from('lancamentos').select('id, obra_id, tipo, categoria, valor, data, status, vencimento, descricao, obras(nome)'),
      ])
      if (r.error || l.error) toast((r.error || l.error).message, 'erro')
      setDados({ obras: r.data ?? [], lancamentos: l.data ?? [] })
    })()
  }, [toast])

  if (!dados) return <Loading />
  const { obras, lancamentos } = dados

  if (obras.length === 0) {
    return (
      <>
        <PageHeader title="Painel" />
        <EmptyState
          icon={Building2}
          title="Bem-vindo ao sistema de obras da Soberana"
          text="Comece cadastrando a primeira obra. Depois é só anexar as notas, lançar pagamentos e funcionários."
          action={<Link to="/obras" className="btn-primary"><Plus className="h-4 w-4" /> Cadastrar obra</Link>}
        />
      </>
    )
  }

  const ativas = obras.filter((o) => ['planejamento', 'em_andamento', 'pausada'].includes(o.status))
  const tot = (k) => obras.reduce((s, o) => s + Number(o[k] ?? 0), 0)
  const pendentes = lancamentos
    .filter((l) => l.status === 'pendente')
    .sort((a, b) => String(a.vencimento ?? a.data).localeCompare(String(b.vencimento ?? b.data)))
    .slice(0, 6)

  return (
    <>
      <PageHeader title="Painel" subtitle={`${ativas.length} obra(s) em andamento · ${obras.length} no total`} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saldo geral" value={money(tot('saldo'))} hint="Recebido − gasto, todas as obras" tone={tot('saldo') < 0 ? 'red' : 'default'} />
        <StatCard label="Total gasto" value={money(tot('saidas_pagas'))} tone="red" />
        <StatCard label="A pagar" value={money(tot('a_pagar'))} tone="amber" />
        <StatCard label="A receber" value={money(tot('a_receber'))} tone="amber" />
      </div>

      {/* Obras lado a lado */}
      <div className="card mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="font-bold">Situação de cada obra</p>
          <Link to="/obras" className="text-sm font-semibold text-zinc-500 hover:text-ink">Todas as obras →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-y border-zinc-200 bg-zinc-50">
              <tr>
                <th className="table-th">Obra</th>
                <th className="table-th text-right">Contrato</th>
                <th className="table-th text-right">Recebido</th>
                <th className="table-th text-right">Gasto</th>
                <th className="table-th text-right">Saldo</th>
                <th className="table-th text-right">Lucro previsto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {obras.map((o) => {
                const lucro = Number(o.valor_contrato) - Number(o.saidas_pagas) - Number(o.a_pagar)
                return (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="table-td">
                      <Link to={`/obras/${o.id}`} className="font-semibold hover:underline">{o.nome}</Link>
                      <div className="mt-0.5"><StatusBadge status={o.status} /></div>
                    </td>
                    <td className="table-td text-right">{money(o.valor_contrato)}</td>
                    <td className="table-td text-right text-green-700">{money(o.entradas_pagas)}</td>
                    <td className="table-td text-right text-red-600">{money(o.saidas_pagas)}</td>
                    <td className={`table-td text-right font-bold ${Number(o.saldo) < 0 ? 'text-red-600' : ''}`}>{money(o.saldo)}</td>
                    <td className={`table-td text-right font-bold ${lucro < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {Number(o.valor_contrato) ? money(lucro) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <p className="mb-3 font-bold">Entradas e saídas por mês (todas as obras)</p>
          <GraficoMensal dados={porMes(lancamentos)} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <p className="mb-4 font-bold">Gastos por categoria</p>
          <GraficoCategorias dados={gastosPorCategoria(lancamentos, TODAS_CATEGORIAS)} />
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="card p-5">
          <p className="mb-3 font-bold">Contas pendentes</p>
          <ul className="divide-y divide-zinc-100">
            {pendentes.map((l) => (
              <li key={l.id}>
                <Link to={`/obras/${l.obra_id}/lancamentos`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-zinc-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.descricao}</p>
                    <p className="text-xs text-zinc-500">
                      {l.obras?.nome} · {l.tipo === 'entrada' ? 'a receber' : 'a pagar'} · vence {date(l.vencimento ?? l.data)}
                    </p>
                  </div>
                  <b className={l.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}>{money(l.valor)}</b>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
