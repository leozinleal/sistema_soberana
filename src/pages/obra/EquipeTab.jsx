import { useEffect, useState } from 'react'
import { Banknote, HardHat, Plus, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { VINCULOS } from '../../lib/constants'
import { money, today } from '../../lib/format'
import { ConfirmButton, EmptyState, Field, Modal, StatCard } from '../../components/ui'
import { useToast } from '../../components/Toast'
import LancamentoModal from '../../components/LancamentoModal'
import LancamentoLista from '../../components/LancamentoLista'
import { FuncionarioModal } from '../Funcionarios'

function VincularModal({ open, onClose, obraId, jaVinculados, onSaved }) {
  const toast = useToast()
  const [todos, setTodos] = useState([])
  const [funcId, setFuncId] = useState('')
  const [funcao, setFuncao] = useState('')
  const [novo, setNovo] = useState(false)

  const carregar = () =>
    supabase.from('funcionarios').select('*').eq('ativo', true).order('nome').then(({ data }) => setTodos(data ?? []))

  useEffect(() => {
    if (open) { carregar(); setFuncId(''); setFuncao('') }
  }, [open])

  const disponiveis = todos.filter((f) => !jaVinculados.includes(f.id))

  async function vincular(e) {
    e.preventDefault()
    const { error } = await supabase.from('obra_funcionarios').insert({
      obra_id: obraId, funcionario_id: funcId, funcao_na_obra: funcao || null, data_inicio: today(),
    })
    if (error) return toast(error.message, 'erro')
    toast('Funcionário vinculado à obra')
    onSaved()
    onClose()
  }

  return (
    <>
      <Modal
        open={open && !novo}
        onClose={onClose}
        title="Vincular funcionário à obra"
        footer={
          <>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" form="form-vinc" disabled={!funcId}>Vincular</button>
          </>
        }
      >
        <form id="form-vinc" onSubmit={vincular} className="space-y-4">
          <Field label="Funcionário">
            <div className="flex gap-2">
              <select className="input" required value={funcId} onChange={(e) => setFuncId(e.target.value)}>
                <option value="">Selecione…</option>
                {disponiveis.map((f) => <option key={f.id} value={f.id}>{f.nome}{f.funcao ? ` — ${f.funcao}` : ''}</option>)}
              </select>
              <button type="button" className="btn-outline !px-3" title="Cadastrar novo" onClick={() => setNovo(true)}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Field label="Função nesta obra (opcional)">
            <input className="input" value={funcao} onChange={(e) => setFuncao(e.target.value)} />
          </Field>
        </form>
      </Modal>
      <FuncionarioModal
        open={open && novo}
        onClose={() => setNovo(false)}
        onSaved={(f) => { carregar(); setFuncId(f.id) }}
      />
    </>
  )
}

export default function EquipeTab({ obra, equipe, lancamentos, recarregar }) {
  const toast = useToast()
  const [vincular, setVincular] = useState(false)
  const [pagamento, setPagamento] = useState({ open: false })

  const pagamentos = lancamentos.filter((l) => l.categoria === 'mao_de_obra')
  const pagoPor = (id) => pagamentos.filter((l) => l.funcionarios?.id === id && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalPago = pagamentos.filter((l) => l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const totalPendente = pagamentos.filter((l) => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)

  async function desvincular(funcId) {
    const { error } = await supabase.from('obra_funcionarios').delete().eq('obra_id', obra.id).eq('funcionario_id', funcId)
    if (error) return toast(error.message, 'erro')
    toast('Removido da obra (os pagamentos continuam registrados)')
    recarregar()
  }

  async function excluirPagamento(l) {
    const { error } = await supabase.from('lancamentos').delete().eq('id', l.id)
    if (error) return toast(error.message, 'erro')
    toast('Pagamento excluído')
    recarregar()
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Funcionários na obra" value={equipe.length} />
        <StatCard label="Pago em mão de obra" value={money(totalPago)} tone="red" />
        <StatCard label="A pagar" value={money(totalPendente)} tone="amber" />
        <div className="col-span-2 flex flex-col gap-2 sm:flex-row lg:col-span-1 lg:flex-col lg:justify-center">
          <button className="btn-brand" onClick={() => setPagamento({ open: true, preset: { tipo: 'saida', categoria: 'mao_de_obra' } })} disabled={!equipe.length}>
            <Banknote className="h-4 w-4" /> Registrar pagamento
          </button>
          <button className="btn-outline" onClick={() => setVincular(true)}>
            <UserPlus className="h-4 w-4" /> Vincular funcionário
          </button>
        </div>
      </div>

      {equipe.length === 0 ? (
        <EmptyState icon={HardHat} title="Nenhum funcionário nesta obra" text="Vincule os funcionários que trabalham aqui para registrar os pagamentos, que saem do valor da obra." />
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {equipe.map(({ funcionarios: f, funcao_na_obra }) => f && (
            <div key={f.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{f.nome}</p>
                  <p className="text-xs text-zinc-500">{[funcao_na_obra || f.funcao, VINCULOS[f.tipo_vinculo]].filter(Boolean).join(' · ')}</p>
                  {f.chave_pix && <p className="mt-1 truncate text-xs text-zinc-500">PIX: {f.chave_pix}</p>}
                </div>
                <ConfirmButton className="btn-ghost !px-2 !py-1 text-xs text-zinc-400" confirmText="Remover?" onConfirm={() => desvincular(f.id)}>
                  Remover
                </ConfirmButton>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-zinc-100 pt-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-zinc-400">Recebeu nesta obra</p>
                  <p className="font-extrabold">{money(pagoPor(f.id))}</p>
                </div>
                <button
                  className="btn-primary !px-3 !py-1.5 text-xs"
                  onClick={() =>
                    setPagamento({
                      open: true,
                      preset: { tipo: 'saida', categoria: 'mao_de_obra', funcionario_id: f.id, valor: f.valor_diaria ?? '' },
                    })
                  }
                >
                  <Banknote className="h-3.5 w-3.5" /> Pagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagamentos.length > 0 && (
        <>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Pagamentos de funcionários</h3>
          <LancamentoLista itens={pagamentos} onEditar={(l) => setPagamento({ open: true, lancamento: l })} onExcluir={excluirPagamento} />
        </>
      )}

      <VincularModal
        open={vincular}
        onClose={() => setVincular(false)}
        obraId={obra.id}
        jaVinculados={equipe.map((e) => e.funcionario_id)}
        onSaved={recarregar}
      />
      <LancamentoModal
        open={pagamento.open}
        onClose={() => setPagamento({ open: false })}
        obraId={obra.id}
        lancamento={pagamento.lancamento}
        preset={pagamento.preset}
        equipe={equipe}
        onSaved={recarregar}
      />
    </>
  )
}
