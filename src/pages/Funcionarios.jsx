import { useEffect, useState } from 'react'
import { HardHat, Pencil, Plus, Search } from 'lucide-react'
import { supabase, unwrap } from '../lib/supabase'
import { VINCULOS } from '../lib/constants'
import { money } from '../lib/format'
import { ConfirmButton, EmptyState, Field, Loading, Modal, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'

const vazio = { nome: '', cpf: '', funcao: '', tipo_vinculo: 'diarista', valor_diaria: '', telefone: '', chave_pix: '', ativo: true }

export function FuncionarioModal({ open, onClose, funcionario, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) setForm(funcionario ? { ...vazio, ...funcionario, valor_diaria: funcionario.valor_diaria ?? '' } : vazio)
  }, [open, funcionario])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      // eslint-disable-next-line no-unused-vars
      const { id, created_at, obra_funcionarios, lancamentos, ...dados } = form
      dados.valor_diaria = dados.valor_diaria === '' ? null : Number(dados.valor_diaria)
      const q = id
        ? supabase.from('funcionarios').update(dados).eq('id', id).select().single()
        : supabase.from('funcionarios').insert(dados).select().single()
      const salvo = unwrap(await q)
      toast('Funcionário salvo')
      onSaved?.(salvo)
      onClose()
    } catch (err) {
      toast(err.message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={funcionario?.id ? 'Editar funcionário' : 'Novo funcionário'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" form="form-func" disabled={salvando}>Salvar</button>
        </>
      }
    >
      <form id="form-func" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <input className="input" required value={form.nome} onChange={set('nome')} />
        </Field>
        <Field label="Função">
          <input className="input" placeholder="Pedreiro, servente…" value={form.funcao ?? ''} onChange={set('funcao')} />
        </Field>
        <Field label="Vínculo">
          <select className="input" value={form.tipo_vinculo} onChange={set('tipo_vinculo')}>
            {Object.entries(VINCULOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Valor da diária (R$)">
          <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={form.valor_diaria} onChange={set('valor_diaria')} />
        </Field>
        <Field label="CPF">
          <input className="input" value={form.cpf ?? ''} onChange={set('cpf')} />
        </Field>
        <Field label="Telefone">
          <input className="input" inputMode="tel" value={form.telefone ?? ''} onChange={set('telefone')} />
        </Field>
        <Field label="Chave PIX">
          <input className="input" value={form.chave_pix ?? ''} onChange={set('chave_pix')} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-black" checked={form.ativo} onChange={set('ativo')} />
          Funcionário ativo
        </label>
      </form>
    </Modal>
  )
}

export default function Funcionarios() {
  const toast = useToast()
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [aberto, setAberto] = useState(false)

  const carregar = async () => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*, obra_funcionarios(obras(id, nome, status)), lancamentos(valor, status)')
      .order('nome')
    if (error) toast(error.message, 'erro')
    setLista(data ?? [])
  }
  useEffect(() => { carregar() }, [])

  async function excluir(id) {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id)
    if (error) return toast(error.message, 'erro')
    toast('Funcionário excluído')
    carregar()
  }

  const filtrados = (lista ?? []).filter((f) =>
    [f.nome, f.funcao, f.cpf].join(' ').toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <>
      <PageHeader
        title="Funcionários"
        subtitle="Cadastro geral — vincule cada um às obras em que trabalha"
        actions={
          <button className="btn-brand" onClick={() => { setEditando(null); setAberto(true) }}>
            <Plus className="h-4 w-4" /> Novo funcionário
          </button>
        }
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input className="input !pl-9" placeholder="Buscar por nome ou função" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {lista === null ? (
        <Loading />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={HardHat} title="Nenhum funcionário" text="Cadastre os funcionários e depois vincule-os às obras." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((f) => {
            const pago = (f.lancamentos ?? []).filter((l) => l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
            return (
              <div key={f.id} className={`card p-4 ${f.ativo ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{f.nome}</p>
                    <p className="text-xs text-zinc-500">
                      {[f.funcao, VINCULOS[f.tipo_vinculo]].filter(Boolean).join(' · ')}
                      {!f.ativo && ' · inativo'}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button className="btn-ghost !p-2" onClick={() => { setEditando(f); setAberto(true) }} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <ConfirmButton className="btn-ghost !p-2 text-red-600" onConfirm={() => excluir(f.id)}>Excluir</ConfirmButton>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-zinc-400">Total pago</p>
                    <p className="font-bold">{money(pago)}</p>
                  </div>
                  {f.valor_diaria && <p className="text-xs text-zinc-500">Diária {money(f.valor_diaria)}</p>}
                </div>
                {f.obra_funcionarios?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.obra_funcionarios.map(({ obras: o }) => o && (
                      <span key={o.id} className="badge bg-zinc-100 text-zinc-700">{o.nome}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FuncionarioModal open={aberto} onClose={() => setAberto(false)} funcionario={editando} onSaved={carregar} />
    </>
  )
}
