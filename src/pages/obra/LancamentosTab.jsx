import { useState } from 'react'
import { Minus, Plus, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { removerArquivo } from '../../lib/storage'
import { money } from '../../lib/format'
import { EmptyState } from '../../components/ui'
import { useToast } from '../../components/Toast'
import LancamentoModal from '../../components/LancamentoModal'
import LancamentoLista from '../../components/LancamentoLista'

export default function LancamentosTab({ obra, lancamentos, equipe, recarregar }) {
  const toast = useToast()
  const [modal, setModal] = useState({ open: false })
  const [filtro, setFiltro] = useState('todos')

  async function excluir(l) {
    const { error } = await supabase.from('lancamentos').delete().eq('id', l.id)
    if (error) return toast(error.message, 'erro')
    if (l.comprovante_path && !l.nota_id) await removerArquivo(l.comprovante_path)
    toast('Lançamento excluído')
    recarregar()
  }

  const itens = lancamentos.filter((l) =>
    filtro === 'todos' ? true : filtro === 'pendentes' ? l.status === 'pendente' : l.tipo === filtro,
  )
  const total = (t) => itens.filter((l) => l.tipo === t).reduce((s, l) => s + Number(l.valor), 0)

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-x-auto rounded-xl border border-zinc-300 bg-white p-1">
          {[['todos', 'Todos'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['pendentes', 'Pendentes']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${filtro === k ? 'bg-ink text-white' : 'text-zinc-600'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline !border-green-600 !text-green-700" onClick={() => setModal({ open: true, preset: { tipo: 'entrada' } })}>
            <Plus className="h-4 w-4" /> Entrada
          </button>
          <button className="btn-primary" onClick={() => setModal({ open: true, preset: { tipo: 'saida' } })}>
            <Minus className="h-4 w-4" /> Saída
          </button>
        </div>
      </div>

      {itens.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhum lançamento" text="Registre aqui tudo que entra e sai de dinheiro desta obra: compras, serviços, pagamentos e recebimentos." />
      ) : (
        <>
          <LancamentoLista itens={itens} onEditar={(l) => setModal({ open: true, lancamento: l })} onExcluir={excluir} />
          <div className="mt-3 flex justify-end gap-6 px-1 text-sm">
            <span>Entradas: <b className="text-green-700">{money(total('entrada'))}</b></span>
            <span>Saídas: <b className="text-red-600">{money(total('saida'))}</b></span>
          </div>
        </>
      )}

      <LancamentoModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        obraId={obra.id}
        lancamento={modal.lancamento}
        preset={modal.preset}
        equipe={equipe}
        onSaved={recarregar}
      />
    </>
  )
}
