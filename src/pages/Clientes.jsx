import { useEffect, useState } from 'react'
import { Pencil, Phone, Plus, Search, Users } from 'lucide-react'
import { supabase, unwrap } from '../lib/supabase'
import { ConfirmButton, EmptyState, Field, Loading, Modal, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'

const vazio = { nome: '', cpf_cnpj: '', telefone: '', email: '', endereco: '', observacoes: '' }

export function ClienteModal({ open, onClose, cliente, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) setForm(cliente ? { ...vazio, ...cliente } : vazio)
  }, [open, cliente])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { id, created_at, ...dados } = form
      const q = id
        ? supabase.from('clientes').update(dados).eq('id', id).select().single()
        : supabase.from('clientes').insert(dados).select().single()
      const salvo = unwrap(await q)
      toast('Cliente salvo')
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
      title={cliente?.id ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" form="form-cliente" disabled={salvando}>Salvar</button>
        </>
      }
    >
      <form id="form-cliente" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <input className="input" required value={form.nome} onChange={set('nome')} />
        </Field>
        <Field label="CPF / CNPJ">
          <input className="input" value={form.cpf_cnpj ?? ''} onChange={set('cpf_cnpj')} />
        </Field>
        <Field label="Telefone">
          <input className="input" inputMode="tel" value={form.telefone ?? ''} onChange={set('telefone')} />
        </Field>
        <Field label="E-mail" className="sm:col-span-2">
          <input className="input" type="email" value={form.email ?? ''} onChange={set('email')} />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <input className="input" value={form.endereco ?? ''} onChange={set('endereco')} />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <textarea className="input" rows={3} value={form.observacoes ?? ''} onChange={set('observacoes')} />
        </Field>
      </form>
    </Modal>
  )
}

export default function Clientes() {
  const toast = useToast()
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [aberto, setAberto] = useState(false)

  const carregar = async () => {
    const { data, error } = await supabase.from('clientes').select('*, obras(id, nome)').order('nome')
    if (error) toast(error.message, 'erro')
    setLista(data ?? [])
  }
  useEffect(() => { carregar() }, [])

  async function excluir(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) return toast(error.message, 'erro')
    toast('Cliente excluído')
    carregar()
  }

  const filtrados = (lista ?? []).filter((c) =>
    [c.nome, c.cpf_cnpj, c.telefone].join(' ').toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Donos / compradores de cada obra"
        actions={
          <button className="btn-brand" onClick={() => { setEditando(null); setAberto(true) }}>
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        }
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input className="input !pl-9" placeholder="Buscar por nome, CPF ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {lista === null ? (
        <Loading />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente" text="Cadastre o cliente para vincular às obras." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.nome}</p>
                  {c.cpf_cnpj && <p className="text-xs text-zinc-500">{c.cpf_cnpj}</p>}
                </div>
                <div className="flex shrink-0">
                  <button className="btn-ghost !p-2" onClick={() => { setEditando(c); setAberto(true) }} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton className="btn-ghost !p-2 text-red-600" onConfirm={() => excluir(c.id)}>Excluir</ConfirmButton>
                </div>
              </div>
              {c.telefone && (
                <a href={`tel:${c.telefone}`} className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600">
                  <Phone className="h-3.5 w-3.5" /> {c.telefone}
                </a>
              )}
              {c.obras?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.obras.map((o) => <span key={o.id} className="badge bg-zinc-100 text-zinc-700">{o.nome}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ClienteModal open={aberto} onClose={() => setAberto(false)} cliente={editando} onSaved={carregar} />
    </>
  )
}
