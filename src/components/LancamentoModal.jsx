import { useEffect, useState } from 'react'
import { supabase, unwrap } from '../lib/supabase'
import { CATEGORIAS, FORMAS_PAGAMENTO } from '../lib/constants'
import { today } from '../lib/format'
import { uploadArquivo, removerArquivo } from '../lib/storage'
import { Field, FileInput, Modal } from './ui'
import { useToast } from './Toast'
import { FornecedorSelect } from '../pages/Fornecedores'

const vazio = (tipo = 'saida') => ({
  tipo,
  categoria: tipo === 'saida' ? 'material' : 'recebimento_cliente',
  descricao: '',
  valor: '',
  data: today(),
  status: 'pago',
  vencimento: '',
  forma_pagamento: 'PIX',
  fornecedor: '',
  fornecedor_id: '',
  funcionario_id: '',
})

/**
 * Cria/edita uma entrada ou saída da obra.
 * `preset` permite abrir já preenchido (ex.: pagamento de um funcionário).
 */
export default function LancamentoModal({ open, onClose, obraId, lancamento, preset, equipe = [], onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(vazio())
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setArquivo(null)
    if (lancamento) {
      setForm({ ...vazio(lancamento.tipo), ...Object.fromEntries(Object.entries(lancamento).map(([k, v]) => [k, v ?? ''])) })
    } else {
      setForm({ ...vazio(preset?.tipo), ...preset })
    }
  }, [open, lancamento, preset])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const trocarTipo = (tipo) =>
    setForm((f) => ({ ...f, tipo, categoria: Object.keys(CATEGORIAS[tipo])[0], funcionario_id: '' }))

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = {
        obra_id: obraId,
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao,
        valor: Number(form.valor),
        data: form.data,
        status: form.status,
        vencimento: form.status === 'pendente' && form.vencimento ? form.vencimento : null,
        forma_pagamento: form.forma_pagamento || null,
        fornecedor: form.tipo === 'entrada' || !form.fornecedor_id ? form.fornecedor || null : null,
        fornecedor_id: form.tipo === 'saida' && form.categoria !== 'mao_de_obra' && form.fornecedor_id ? form.fornecedor_id : null,
        funcionario_id: form.categoria === 'mao_de_obra' && form.funcionario_id ? form.funcionario_id : null,
      }
      if (arquivo) {
        const up = await uploadArquivo(obraId, 'comprovantes', arquivo)
        dados.comprovante_path = up.path
        dados.comprovante_nome = up.nome
        if (lancamento?.comprovante_path && !lancamento.nota_id) await removerArquivo(lancamento.comprovante_path)
      }
      const q = lancamento?.id
        ? supabase.from('lancamentos').update(dados).eq('id', lancamento.id)
        : supabase.from('lancamentos').insert(dados)
      unwrap(await q)
      toast(form.tipo === 'entrada' ? 'Entrada salva' : 'Saída salva')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const ehFuncionario = form.categoria === 'mao_de_obra'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lancamento?.id ? 'Editar lançamento' : form.tipo === 'entrada' ? 'Nova entrada' : 'Nova saída'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" form="form-lanc" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-lanc" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          {[['entrada', 'Entrada (dinheiro que entra)'], ['saida', 'Saída (gasto)']].map(([t, l]) => (
            <button
              key={t}
              type="button"
              onClick={() => trocarTipo(t)}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold ${
                form.tipo === t
                  ? t === 'entrada' ? 'border-green-600 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-600'
                  : 'border-zinc-200 text-zinc-500'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <Field label="Categoria" className="sm:col-span-2">
          <select className="input" value={form.categoria} onChange={set('categoria')}>
            {Object.entries(CATEGORIAS[form.tipo]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>

        {ehFuncionario && (
          <Field label="Funcionário" className="sm:col-span-2">
            <select className="input" required value={form.funcionario_id} onChange={set('funcionario_id')}>
              <option value="">Selecione…</option>
              {equipe.map(({ funcionarios: f }) => f && <option key={f.id} value={f.id}>{f.nome}{f.funcao ? ` — ${f.funcao}` : ''}</option>)}
            </select>
            {equipe.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">Vincule funcionários na aba “Funcionários” da obra primeiro.</p>
            )}
          </Field>
        )}

        <Field label="Descrição *" className="sm:col-span-2">
          <input
            className="input"
            required
            placeholder={ehFuncionario ? 'Ex.: Semana 10/11 a 14/11 (5 diárias)' : form.tipo === 'entrada' ? 'Ex.: 2ª parcela do contrato' : 'Ex.: Cimento e areia'}
            value={form.descricao}
            onChange={set('descricao')}
          />
        </Field>
        <Field label="Valor (R$) *">
          <input className="input" required type="number" step="0.01" min="0.01" inputMode="decimal" value={form.valor} onChange={set('valor')} />
        </Field>
        <Field label="Data">
          <input className="input" type="date" required value={form.data} onChange={set('data')} />
        </Field>
        <Field label="Situação">
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="pago">{form.tipo === 'entrada' ? 'Recebido' : 'Pago'}</option>
            <option value="pendente">{form.tipo === 'entrada' ? 'A receber' : 'A pagar'}</option>
          </select>
        </Field>
        {form.status === 'pendente' ? (
          <Field label="Vencimento">
            <input className="input" type="date" value={form.vencimento} onChange={set('vencimento')} />
          </Field>
        ) : (
          <Field label="Forma de pagamento">
            <select className="input" value={form.forma_pagamento} onChange={set('forma_pagamento')}>
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
        )}
        {form.tipo === 'entrada' && (
          <Field label="Pagador" className="sm:col-span-2">
            <input className="input" value={form.fornecedor} onChange={set('fornecedor')} />
          </Field>
        )}
        {form.tipo === 'saida' && !ehFuncionario && (
          <Field label="Fornecedor / prestador" className="sm:col-span-2">
            <FornecedorSelect value={form.fornecedor_id} onChange={(v) => setForm((f) => ({ ...f, fornecedor_id: v }))} />
          </Field>
        )}
        <Field label="Comprovante" className="sm:col-span-2">
          <FileInput file={arquivo} onChange={setArquivo} atual={lancamento?.comprovante_nome} />
        </Field>
      </form>
    </Modal>
  )
}
