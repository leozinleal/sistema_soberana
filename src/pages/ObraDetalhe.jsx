import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Pencil, Trash2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { date } from '../lib/format'
import { ConfirmButton, Loading } from '../components/ui'
import { useToast } from '../components/Toast'
import { ObraModal, StatusBadge } from './Obras'
import ResumoTab from './obra/ResumoTab'
import LancamentosTab from './obra/LancamentosTab'
import NotasTab from './obra/NotasTab'
import EquipeTab from './obra/EquipeTab'
import DocumentosTab from './obra/DocumentosTab'
import ExtratoTab from './obra/ExtratoTab'

const ABAS = [
  ['', 'Resumo'],
  ['lancamentos', 'Entradas e saídas'],
  ['notas', 'Notas'],
  ['funcionarios', 'Funcionários'],
  ['documentos', 'Documentos'],
  ['extrato', 'Extrato / PDF'],
]

export default function ObraDetalhe() {
  const { id, aba = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [obra, setObra] = useState(null)
  const [dados, setDados] = useState(null)
  const [editando, setEditando] = useState(false)

  const carregar = useCallback(async () => {
    const [o, l, n, d, e] = await Promise.all([
      supabase.from('obras').select('*, clientes(*)').eq('id', id).single(),
      supabase.from('lancamentos').select('*, funcionarios(id, nome), fornecedores(id, nome), notas(id, numero)').eq('obra_id', id).order('data', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('notas').select('*, lancamentos(id), fornecedores(id, nome)').eq('obra_id', id).order('data_emissao', { ascending: false }),
      supabase.from('documentos').select('*').eq('obra_id', id).order('created_at', { ascending: false }),
      supabase.from('obra_funcionarios').select('*, funcionarios(*)').eq('obra_id', id),
    ])
    if (o.error) {
      toast('Obra não encontrada', 'erro')
      return navigate('/obras')
    }
    setObra(o.data)
    setDados({ lancamentos: l.data ?? [], notas: n.data ?? [], documentos: d.data ?? [], equipe: e.data ?? [] })
  }, [id, navigate, toast])

  useEffect(() => { carregar() }, [carregar])

  async function excluirObra() {
    const { error } = await supabase.from('obras').delete().eq('id', id)
    if (error) return toast(error.message, 'erro')
    toast('Obra excluída')
    navigate('/obras')
  }

  if (!obra || !dados) return <Loading />

  const props = { obra, ...dados, recarregar: carregar }

  return (
    <>
      <Link to="/obras" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Obras
      </Link>

      <div className="card mb-5 overflow-hidden">
        <div className="h-1.5 bg-brand" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{obra.nome}</h1>
              <StatusBadge status={obra.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500">
              {obra.endereco && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{obra.endereco}</span>}
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{obra.clientes?.nome ?? 'Sem cliente'}</span>
              {(obra.data_inicio || obra.previsao_entrega) && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {date(obra.data_inicio)} → {date(obra.data_entrega || obra.previsao_entrega)}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="btn-outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <ConfirmButton className="btn-outline !px-3 text-red-600" confirmText="Excluir tudo?" onConfirm={excluirObra}>
              <Trash2 className="h-4 w-4" />
            </ConfirmButton>
          </div>
        </div>

        {/* Abas */}
        <nav className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-3">
          {ABAS.map(([slug, label]) => (
            <NavLink
              key={slug}
              to={`/obras/${id}${slug ? `/${slug}` : ''}`}
              end
              className={({ isActive }) =>
                `whitespace-nowrap border-b-[3px] px-3 py-3 text-sm font-semibold transition ${
                  isActive ? 'border-brand text-ink' : 'border-transparent text-zinc-500 hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {aba === '' && <ResumoTab {...props} />}
      {aba === 'lancamentos' && <LancamentosTab {...props} />}
      {aba === 'notas' && <NotasTab {...props} />}
      {aba === 'funcionarios' && <EquipeTab {...props} />}
      {aba === 'documentos' && <DocumentosTab {...props} />}
      {aba === 'extrato' && <ExtratoTab {...props} />}

      <ObraModal open={editando} onClose={() => setEditando(false)} obra={obra} onSaved={carregar} />
    </>
  )
}
