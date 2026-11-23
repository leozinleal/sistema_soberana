import { useEffect, useState } from 'react'
import { Pencil, Phone, Plus, Search, Truck } from 'lucide-react'
import { supabase, unwrap } from '../lib/supabase'
import { money } from '../lib/format'
import { ConfirmButton, EmptyState, Field, Loading, Modal, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'

const vazio = { nome: '', cnpj_cpf: '', ramo: '', telefone: '', email: '', chave_pix: '', endereco: '', observacoes: '', ativo: true }

export function FornecedorModal({ open, onClose, fornecedor, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) setForm(fornecedor ? Object.fromEntries(Object.keys(vazio).map((k) => [k, fornecedor[k] ?? vazio[k]])) : vazio)
  }, [open, fornecedor])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    e.stopPropagation() // não envia o formulário de fora (ex.: nota)
    setSalvando(true)
    try {
      const q = fornecedor?.id
        ? supabase.from('fornecedores').update(form).eq('id', fornecedor.id).select().single()
        : supabase.from('fornecedores').insert(form).select().single()
      const salvo = unwrap(await q)
      toast('Fornecedor salvo')
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
      title={fornecedor?.id ? 'Editar fornecedor' : 'Novo fornecedor'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" form="form-fornecedor" disabled={salvando}>Salvar</button>
        </>
      }
    >
      <form id="form-fornecedor" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome / razão social *" className="sm:col-span-2">
          <input className="input" required value={form.nome} onChange={set('nome')} />
        </Field>
        <Field label="CNPJ / CPF">
          <input className="input" value={form.cnpj_cpf} onChange={set('cnpj_cpf')} />
        </Field>
        <Field label="Ramo">
          <input className="input" placeholder="Material, elétrica, locação…" value={form.ramo} onChange={set('ramo')} />
        </Field>
        <Field label="Telefone">
          <input className="input" inputMode="tel" value={form.telefone} onChange={set('telefone')} />
        </Field>
        <Field label="Chave PIX">
          <input className="input" value={form.chave_pix} onChange={set('chave_pix')} />
        </Field>
        <Field label="E-mail" className="sm:col-span-2">
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <input className="input" value={form.endereco} onChange={set('endereco')} />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <textarea className="input" rows={2} value={form.observacoes} onChange={set('observacoes')} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-black" checked={form.ativo} onChange={set('ativo')} />
          Fornecedor ativo
        </label>
      </form>
    </Modal>
  )
}

/** Campo de seleção de fornecedor com botão "+" para cadastrar na hora */
export function FornecedorSelect({ value, onChange, required = false, onModalChange }) {
  const [lista, setLista] = useState([])
  const [novo, setNovo] = useState(false)

  const carregar = () => supabase.from('fornecedores').select('id, nome, ativo').order('nome').then(({ data }) => setLista(data ?? []))
  useEffect(() => { carregar() }, [])

  const abrir = (v) => { setNovo(v); onModalChange?.(v) }

  return (
    <>
      <div className="flex gap-2">
        <select className="input" required={required} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">{required ? 'Selecione o fornecedor…' : '— sem fornecedor —'}</option>
          {lista.filter((f) => f.ativo || f.id === value).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <button type="button" className="btn-outline !px-3" title="Cadastrar fornecedor" onClick={() => abrir(true)}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <FornecedorModal
        open={novo}
        onClose={() => abrir(false)}
        onSaved={(f) => { carregar(); onChange(f.id) }}
      />
    </>
  )
}

export default function Fornecedores() {
  const toast = useToast()
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [aberto, setAberto] = useState(false)

  const carregar = async () => {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*, lancamentos(valor, status, obra_id, obras(nome))')
      .order('nome')
    if (error) toast(error.message, 'erro')
    setLista(data ?? [])
  }
  useEffect(() => { carregar() }, [])

  async function excluir(id) {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (error) return toast(error.message, 'erro')
    toast('Fornecedor excluído')
    carregar()
  }

  const filtrados = (lista ?? []).filter((f) =>
    [f.nome, f.cnpj_cpf, f.ramo, f.telefone].join(' ').toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <>
      <PageHeader
        title="Fornecedores"
        subtitle="Lojas, depósitos e prestadores de serviço"
        actions={
          <button className="btn-brand" onClick={() => { setEditando(null); setAberto(true) }}>
            <Plus className="h-4 w-4" /> Novo fornecedor
          </button>
        }
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input className="input !pl-9" placeholder="Buscar por nome, CNPJ ou ramo" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {lista === null ? (
        <Loading />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Truck} title="Nenhum fornecedor" text="Cadastre os fornecedores para usar nas notas e filtrar o extrato." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((f) => {
            const pago = (f.lancamentos ?? []).filter((l) => l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
            const obras = [...new Map((f.lancamentos ?? []).filter((l) => l.obras).map((l) => [l.obra_id, l.obras.nome])).entries()]
            return (
              <div key={f.id} className={`card p-4 ${f.ativo ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{f.nome}</p>
                    <p className="text-xs text-zinc-500">{[f.ramo, f.cnpj_cpf].filter(Boolean).join(' · ')}{!f.ativo && ' · inativo'}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button className="btn-ghost !p-2" onClick={() => { setEditando(f); setAberto(true) }} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <ConfirmButton className="btn-ghost !p-2 text-red-600" onConfirm={() => excluir(f.id)}>Excluir</ConfirmButton>
                  </div>
                </div>
                {f.telefone && (
                  <a href={`tel:${f.telefone}`} className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600">
                    <Phone className="h-3.5 w-3.5" /> {f.telefone}
                  </a>
                )}
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase text-zinc-400">Total pago</p>
                  <p className="font-bold">{money(pago)}</p>
                </div>
                {obras.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {obras.map(([id, nome]) => <span key={id} className="badge bg-zinc-100 text-zinc-700">{nome}</span>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FornecedorModal open={aberto} onClose={() => setAberto(false)} fornecedor={editando} onSaved={carregar} />
    </>
  )
}
