import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, MapPin, Plus, Search } from 'lucide-react'
import { supabase, unwrap } from '../lib/supabase'
import { STATUS_OBRA } from '../lib/constants'
import { money } from '../lib/format'
import { EmptyState, Field, Loading, Modal, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'
import { ClienteModal } from './Clientes'

const vazio = {
  nome: '', endereco: '', cliente_id: '', status: 'em_andamento', valor_contrato: '', orcamento_previsto: '',
  data_inicio: '', previsao_entrega: '', data_entrega: '', observacoes: '',
}

export function ObraModal({ open, onClose, obra, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(vazio)
  const [clientes, setClientes] = useState([])
  const [novoCliente, setNovoCliente] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregarClientes = () => supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => setClientes(data ?? []))

  useEffect(() => {
    if (!open) return
    carregarClientes()
    setForm(obra ? Object.fromEntries(Object.keys(vazio).map((k) => [k, obra[k] ?? ''])) : vazio)
  }, [open, obra])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = { ...form }
      for (const k of ['cliente_id', 'data_inicio', 'previsao_entrega', 'data_entrega']) if (!dados[k]) dados[k] = null
      for (const k of ['valor_contrato', 'orcamento_previsto']) dados[k] = Number(dados[k]) || 0
      const q = obra?.id
        ? supabase.from('obras').update(dados).eq('id', obra.id).select().single()
        : supabase.from('obras').insert(dados).select().single()
      const salva = unwrap(await q)
      toast('Obra salva')
      onSaved?.(salva)
      onClose()
    } catch (err) {
      toast(err.message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Modal
        open={open && !novoCliente}
        onClose={onClose}
        wide
        title={obra?.id ? 'Editar obra' : 'Nova obra'}
        footer={
          <>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" form="form-obra" disabled={salvando}>Salvar</button>
          </>
        }
      >
        <form id="form-obra" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da obra *" className="sm:col-span-2">
            <input className="input" required placeholder="Ex.: Casa Rua das Gaivotas, 120" value={form.nome} onChange={set('nome')} />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <input className="input" value={form.endereco} onChange={set('endereco')} />
          </Field>
          <Field label="Cliente">
            <div className="flex gap-2">
              <select className="input" value={form.cliente_id} onChange={set('cliente_id')}>
                <option value="">— sem cliente —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button type="button" className="btn-outline !px-3" title="Cadastrar cliente" onClick={() => setNovoCliente(true)}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Field label="Situação">
            <select className="input" value={form.status} onChange={set('status')}>
              {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Valor do contrato / venda (R$)">
            <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={form.valor_contrato} onChange={set('valor_contrato')} />
          </Field>
          <Field label="Orçamento previsto de gastos (R$)">
            <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={form.orcamento_previsto} onChange={set('orcamento_previsto')} />
          </Field>
          <Field label="Início">
            <input className="input" type="date" value={form.data_inicio} onChange={set('data_inicio')} />
          </Field>
          <Field label="Previsão de entrega">
            <input className="input" type="date" value={form.previsao_entrega} onChange={set('previsao_entrega')} />
          </Field>
          <Field label="Data da entrega (quando entregue)">
            <input className="input" type="date" value={form.data_entrega} onChange={set('data_entrega')} />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <textarea className="input" rows={3} value={form.observacoes} onChange={set('observacoes')} />
          </Field>
        </form>
      </Modal>
      <ClienteModal
        open={open && novoCliente}
        onClose={() => setNovoCliente(false)}
        onSaved={(c) => { carregarClientes(); setForm((f) => ({ ...f, cliente_id: c.id })) }}
      />
    </>
  )
}

export function StatusBadge({ status }) {
  const s = STATUS_OBRA[status] ?? STATUS_OBRA.planejamento
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export default function Obras() {
  const toast = useToast()
  const navigate = useNavigate()
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('ativas')
  const [aberto, setAberto] = useState(false)

  const carregar = async () => {
    const [obras, resumo] = await Promise.all([
      supabase.from('obras').select('*, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('obras_resumo').select('*'),
    ])
    if (obras.error) toast(obras.error.message, 'erro')
    const porId = Object.fromEntries((resumo.data ?? []).map((r) => [r.id, r]))
    setLista((obras.data ?? []).map((o) => ({ ...o, resumo: porId[o.id] })))
  }
  useEffect(() => { carregar() }, [])

  const filtradas = (lista ?? []).filter((o) => {
    const okBusca = [o.nome, o.endereco, o.clientes?.nome].join(' ').toLowerCase().includes(busca.toLowerCase())
    const okStatus =
      filtroStatus === 'todas' ||
      (filtroStatus === 'ativas' ? ['planejamento', 'em_andamento', 'pausada'].includes(o.status) : ['concluida', 'entregue'].includes(o.status))
    return okBusca && okStatus
  })

  return (
    <>
      <PageHeader
        title="Obras"
        subtitle="Cada obra com seus gastos, notas, funcionários e documentos"
        actions={
          <button className="btn-brand" onClick={() => setAberto(true)}>
            <Plus className="h-4 w-4" /> Nova obra
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className="input !pl-9" placeholder="Buscar obra, endereço ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex rounded-xl border border-zinc-300 bg-white p-1">
          {[['ativas', 'Em andamento'], ['finalizadas', 'Finalizadas'], ['todas', 'Todas']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFiltroStatus(k)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${filtroStatus === k ? 'bg-ink text-white' : 'text-zinc-600'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {lista === null ? (
        <Loading />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma obra aqui"
          text="Cadastre a primeira obra para começar a lançar gastos e notas."
          action={<button className="btn-primary" onClick={() => setAberto(true)}><Plus className="h-4 w-4" /> Nova obra</button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((o) => {
            const r = o.resumo ?? {}
            const gasto = Number(r.saidas_pagas ?? 0)
            const orc = Number(o.orcamento_previsto ?? 0)
            const pct = orc > 0 ? Math.min(100, (gasto / orc) * 100) : 0
            return (
              <Link key={o.id} to={`/obras/${o.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold leading-snug">{o.nome}</p>
                  <StatusBadge status={o.status} />
                </div>
                {o.endereco && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{o.endereco}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">Cliente: {o.clientes?.nome ?? '—'}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-zinc-400">Entradas</p>
                    <p className="text-sm font-bold text-green-700">{money(r.entradas_pagas)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-zinc-400">Gastos</p>
                    <p className="text-sm font-bold text-red-600">{money(r.saidas_pagas)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-zinc-400">Saldo</p>
                    <p className={`text-sm font-bold ${Number(r.saldo) < 0 ? 'text-red-600' : ''}`}>{money(r.saldo)}</p>
                  </div>
                </div>

                {orc > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-zinc-500">
                      <span>Orçamento usado</span>
                      <span className="font-semibold">{pct.toFixed(0)}% de {money(orc)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <ObraModal open={aberto} onClose={() => setAberto(false)} onSaved={(o) => navigate(`/obras/${o.id}`)} />
    </>
  )
}
