import { useMemo, useState } from 'react'
import { Download, FileSearch, RotateCcw } from 'lucide-react'
import { CATEGORIAS, TODAS_CATEGORIAS } from '../../lib/constants'
import { date, money } from '../../lib/format'
import { EmptyState, Field, StatCard } from '../../components/ui'
import { useToast } from '../../components/Toast'
import LancamentoLista from '../../components/LancamentoLista'

const filtrosVazios = { de: '', ate: '', tipo: '', categoria: '', status: '', funcionario: '', busca: '' }

export default function ExtratoTab({ obra, lancamentos, equipe }) {
  const toast = useToast()
  const [f, setF] = useState(filtrosVazios)
  const [gerando, setGerando] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const linhas = useMemo(
    () =>
      lancamentos
        .filter((l) => {
          if (f.de && l.data < f.de) return false
          if (f.ate && l.data > f.ate) return false
          if (f.tipo && l.tipo !== f.tipo) return false
          if (f.categoria && l.categoria !== f.categoria) return false
          if (f.status && l.status !== f.status) return false
          if (f.funcionario && l.funcionarios?.id !== f.funcionario) return false
          if (f.busca) {
            const txt = [l.descricao, l.fornecedor, l.funcionarios?.nome, l.notas?.numero].join(' ').toLowerCase()
            if (!txt.includes(f.busca.toLowerCase())) return false
          }
          return true
        })
        .sort((a, b) => a.data.localeCompare(b.data)),
    [lancamentos, f],
  )

  const soma = (fn) => linhas.filter(fn).reduce((s, l) => s + Number(l.valor), 0)
  const entradas = soma((l) => l.tipo === 'entrada' && l.status === 'pago')
  const saidas = soma((l) => l.tipo === 'saida' && l.status === 'pago')

  const descFiltros = () => {
    const p = []
    if (f.de || f.ate) p.push(`período ${f.de ? date(f.de) : 'início'} a ${f.ate ? date(f.ate) : 'hoje'}`)
    if (f.tipo) p.push(f.tipo === 'entrada' ? 'somente entradas' : 'somente saídas')
    if (f.categoria) p.push(TODAS_CATEGORIAS[f.categoria])
    if (f.status) p.push(f.status === 'pago' ? 'pagos' : 'pendentes')
    if (f.funcionario) p.push(`funcionário ${equipe.find((e) => e.funcionario_id === f.funcionario)?.funcionarios?.nome ?? ''}`)
    if (f.busca) p.push(`busca "${f.busca}"`)
    return p.length ? p.join(' · ') : 'todos os lançamentos'
  }

  async function baixar() {
    setGerando(true)
    try {
      const { gerarExtratoPDF } = await import('../../lib/pdf') // carrega só quando precisa
      await gerarExtratoPDF(obra, linhas, descFiltros())
    } catch (err) {
      toast('Erro ao gerar PDF: ' + err.message, 'erro')
    } finally {
      setGerando(false)
    }
  }

  const categorias = f.tipo ? CATEGORIAS[f.tipo] : TODAS_CATEGORIAS

  return (
    <>
      <div className="card mb-4 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Field label="De"><input type="date" className="input" value={f.de} onChange={set('de')} /></Field>
          <Field label="Até"><input type="date" className="input" value={f.ate} onChange={set('ate')} /></Field>
          <Field label="Tipo">
            <select className="input" value={f.tipo} onChange={(e) => setF((x) => ({ ...x, tipo: e.target.value, categoria: '' }))}>
              <option value="">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </Field>
          <Field label="Categoria">
            <select className="input" value={f.categoria} onChange={set('categoria')}>
              <option value="">Todas</option>
              {Object.entries(categorias).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Situação">
            <select className="input" value={f.status} onChange={set('status')}>
              <option value="">Todas</option>
              <option value="pago">Pagos / recebidos</option>
              <option value="pendente">Pendentes</option>
            </select>
          </Field>
          <Field label="Funcionário">
            <select className="input" value={f.funcionario} onChange={set('funcionario')}>
              <option value="">Todos</option>
              {equipe.map(({ funcionarios: fu }) => fu && <option key={fu.id} value={fu.id}>{fu.nome}</option>)}
            </select>
          </Field>
          <Field label="Buscar" className="col-span-2 md:col-span-2 xl:col-span-1">
            <input className="input" placeholder="Descrição, fornecedor…" value={f.busca} onChange={set('busca')} />
          </Field>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button className="btn-ghost" onClick={() => setF(filtrosVazios)}>
            <RotateCcw className="h-4 w-4" /> Limpar filtros
          </button>
          <button className="btn-primary" onClick={baixar} disabled={!linhas.length || gerando}>
            <Download className="h-4 w-4" /> {gerando ? 'Gerando…' : 'Baixar extrato em PDF'}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lançamentos" value={linhas.length} />
        <StatCard label="Entradas pagas" value={money(entradas)} tone="green" />
        <StatCard label="Saídas pagas" value={money(saidas)} tone="red" />
        <StatCard label="Saldo do período" value={money(entradas - saidas)} tone={entradas - saidas < 0 ? 'red' : 'default'} />
      </div>

      {linhas.length === 0 ? (
        <EmptyState icon={FileSearch} title="Nada encontrado" text="Ajuste os filtros para ver os lançamentos." />
      ) : (
        <LancamentoLista itens={linhas} />
      )}
    </>
  )
}
