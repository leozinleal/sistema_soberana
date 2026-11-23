import { useEffect, useState } from 'react'
import { FileText, Paperclip, Pencil, Plus } from 'lucide-react'
import { supabase, unwrap } from '../../lib/supabase'
import { CATEGORIAS } from '../../lib/constants'
import { date, money, today } from '../../lib/format'
import { abrirArquivo, removerArquivo, uploadArquivo } from '../../lib/storage'
import { ConfirmButton, EmptyState, Field, FileInput, Modal, StatCard } from '../../components/ui'
import { useToast } from '../../components/Toast'

const vazio = { numero: '', fornecedor: '', cnpj_fornecedor: '', descricao: '', valor: '', data_emissao: today() }

function NotaModal({ open, onClose, obraId, nota, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(vazio)
  const [arquivo, setArquivo] = useState(null)
  const [lancar, setLancar] = useState(true)
  const [categoria, setCategoria] = useState('material')
  const [status, setStatus] = useState('pago')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setArquivo(null)
    setLancar(true)
    setForm(nota ? Object.fromEntries(Object.keys(vazio).map((k) => [k, nota[k] ?? ''])) : vazio)
  }, [open, nota])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = { ...form, obra_id: obraId, valor: Number(form.valor) }
      if (arquivo) {
        const up = await uploadArquivo(obraId, 'notas', arquivo)
        dados.arquivo_path = up.path
        dados.arquivo_nome = up.nome
        if (nota?.arquivo_path) await removerArquivo(nota.arquivo_path)
      }
      const descricao = `NF ${form.numero || 's/n'}${form.descricao ? ` — ${form.descricao}` : ''}`

      if (nota?.id) {
        unwrap(await supabase.from('notas').update(dados).eq('id', nota.id))
        // mantém o gasto ligado à nota com os mesmos dados
        const upd = { valor: dados.valor, data: dados.data_emissao, fornecedor: dados.fornecedor || null, descricao }
        if (dados.arquivo_path) Object.assign(upd, { comprovante_path: dados.arquivo_path, comprovante_nome: dados.arquivo_nome })
        unwrap(await supabase.from('lancamentos').update(upd).eq('nota_id', nota.id))
      } else {
        const salva = unwrap(await supabase.from('notas').insert(dados).select().single())
        if (lancar) {
          unwrap(
            await supabase.from('lancamentos').insert({
              obra_id: obraId,
              tipo: 'saida',
              categoria,
              status,
              descricao,
              valor: dados.valor,
              data: dados.data_emissao,
              fornecedor: dados.fornecedor || null,
              nota_id: salva.id,
              comprovante_path: dados.arquivo_path ?? null,
              comprovante_nome: dados.arquivo_nome ?? null,
            }),
          )
        }
      }
      toast('Nota salva')
      onSaved?.()
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
      title={nota?.id ? 'Editar nota' : 'Nova nota'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" form="form-nota" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-nota" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Arquivo da nota (foto ou PDF)" className="sm:col-span-2">
          <FileInput file={arquivo} onChange={setArquivo} atual={nota?.arquivo_nome} />
        </Field>
        <Field label="Valor da nota (R$) *">
          <input className="input" required type="number" step="0.01" min="0" inputMode="decimal" value={form.valor} onChange={set('valor')} />
        </Field>
        <Field label="Data de emissão">
          <input className="input" type="date" required value={form.data_emissao} onChange={set('data_emissao')} />
        </Field>
        <Field label="Número da nota">
          <input className="input" value={form.numero} onChange={set('numero')} />
        </Field>
        <Field label="CNPJ do fornecedor">
          <input className="input" value={form.cnpj_fornecedor} onChange={set('cnpj_fornecedor')} />
        </Field>
        <Field label="Fornecedor" className="sm:col-span-2">
          <input className="input" placeholder="Ex.: Madeireira X" value={form.fornecedor} onChange={set('fornecedor')} />
        </Field>
        <Field label="O que foi comprado" className="sm:col-span-2">
          <input className="input" placeholder="Ex.: Tijolos, cimento, ferragem" value={form.descricao} onChange={set('descricao')} />
        </Field>

        {!nota?.id && (
          <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-black" checked={lancar} onChange={(e) => setLancar(e.target.checked)} />
              Lançar esta nota como gasto da obra
            </label>
            {lancar && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {Object.entries(CATEGORIAS.saida).filter(([k]) => k !== 'mao_de_obra').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="pago">Já paga</option>
                  <option value="pendente">A pagar</option>
                </select>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}

export default function NotasTab({ obra, notas, recarregar }) {
  const toast = useToast()
  const [modal, setModal] = useState({ open: false })

  async function excluir(n) {
    // apaga também o gasto gerado pela nota, para não ficar valor solto
    await supabase.from('lancamentos').delete().eq('nota_id', n.id)
    const { error } = await supabase.from('notas').delete().eq('id', n.id)
    if (error) return toast(error.message, 'erro')
    await removerArquivo(n.arquivo_path)
    toast('Nota excluída')
    recarregar()
  }

  const total = notas.reduce((s, n) => s + Number(n.valor), 0)

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total em notas" value={money(total)} />
        <StatCard label="Quantidade" value={notas.length} />
        <div className="col-span-2 flex items-center sm:col-span-1 sm:justify-end">
          <button className="btn-brand w-full sm:w-auto" onClick={() => setModal({ open: true })}>
            <Plus className="h-4 w-4" /> Anexar nota
          </button>
        </div>
      </div>

      {notas.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma nota anexada" text="Tire uma foto ou envie o PDF da nota e informe o valor. Ela já entra como gasto da obra." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notas.map((n) => (
            <div key={n.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{n.fornecedor || 'Fornecedor não informado'}</p>
                  <p className="text-xs text-zinc-500">NF {n.numero || 's/n'} · {date(n.data_emissao)}</p>
                </div>
                <p className="shrink-0 text-lg font-extrabold">{money(n.valor)}</p>
              </div>
              {n.descricao && <p className="mt-2 text-sm text-zinc-600">{n.descricao}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2">
                {n.lancamentos?.length > 0 ? (
                  <span className="badge bg-green-100 text-green-700">Lançada nos gastos</span>
                ) : (
                  <span className="badge bg-zinc-100 text-zinc-500">Só arquivo</span>
                )}
                <div className="flex items-center">
                  {n.arquivo_path && (
                    <button className="btn-ghost !p-2" title="Ver nota" onClick={() => abrirArquivo(n.arquivo_path)}>
                      <Paperclip className="h-4 w-4" />
                    </button>
                  )}
                  <button className="btn-ghost !p-2" title="Editar" onClick={() => setModal({ open: true, nota: n })}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton className="btn-ghost !px-2 !py-1.5 text-xs text-red-600" onConfirm={() => excluir(n)}>Excluir</ConfirmButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NotaModal open={modal.open} onClose={() => setModal({ open: false })} obraId={obra.id} nota={modal.nota} onSaved={recarregar} />
    </>
  )
}
