import { ArrowDownLeft, ArrowUpRight, Paperclip, Pencil } from 'lucide-react'
import { TODAS_CATEGORIAS } from '../lib/constants'
import { date, money } from '../lib/format'
import { abrirArquivo } from '../lib/storage'
import { ConfirmButton } from './ui'

/** Lista de lançamentos: cartões no celular, tabela no computador */
export default function LancamentoLista({ itens, onEditar, onExcluir }) {
  const Valor = ({ l }) => (
    <span className={`whitespace-nowrap font-bold ${l.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
      {l.tipo === 'entrada' ? '+' : '−'} {money(l.valor)}
    </span>
  )
  const Status = ({ l }) =>
    l.status === 'pago' ? (
      <span className="badge bg-zinc-100 text-zinc-600">{l.tipo === 'entrada' ? 'Recebido' : 'Pago'}</span>
    ) : (
      <span className="badge bg-amber-100 text-amber-800">
        {l.tipo === 'entrada' ? 'A receber' : 'A pagar'}{l.vencimento ? ` · ${date(l.vencimento)}` : ''}
      </span>
    )
  const Detalhe = ({ l }) => (
    <span className="text-xs text-zinc-500">
      {[TODAS_CATEGORIAS[l.categoria], l.funcionarios?.nome, l.fornecedor, l.notas?.numero && `NF ${l.notas.numero}`].filter(Boolean).join(' · ')}
    </span>
  )
  const Acoes = ({ l }) => (
    <div className="flex items-center justify-end">
      {l.comprovante_path && (
        <button className="btn-ghost !p-2" title="Ver comprovante" onClick={() => abrirArquivo(l.comprovante_path)}>
          <Paperclip className="h-4 w-4" />
        </button>
      )}
      {onEditar && (
        <button className="btn-ghost !p-2" title="Editar" onClick={() => onEditar(l)}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onExcluir && <ConfirmButton className="btn-ghost !px-2 !py-1.5 text-xs text-red-600" onConfirm={() => onExcluir(l)}>Excluir</ConfirmButton>}
    </div>
  )

  return (
    <>
      {/* celular */}
      <div className="space-y-2 md:hidden">
        {itens.map((l) => (
          <div key={l.id} className="card p-3.5">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${l.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {l.tipo === 'entrada' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{l.descricao}</p>
                  <Valor l={l} />
                </div>
                <Detalhe l={l} />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">{date(l.data)} <Status l={l} /></div>
                  <Acoes l={l} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* computador */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="table-th w-28">Data</th>
              <th className="table-th">Descrição</th>
              <th className="table-th w-40">Situação</th>
              <th className="table-th w-36 text-right">Valor</th>
              <th className="table-th w-36" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {itens.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50">
                <td className="table-td text-zinc-500">{date(l.data)}</td>
                <td className="table-td">
                  <p className="font-semibold">{l.descricao}</p>
                  <Detalhe l={l} />
                </td>
                <td className="table-td"><Status l={l} /></td>
                <td className="table-td text-right"><Valor l={l} /></td>
                <td className="table-td !py-1"><Acoes l={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
