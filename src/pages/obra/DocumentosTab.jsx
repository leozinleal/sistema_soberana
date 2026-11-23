import { useEffect, useState } from 'react'
import { Download, FileImage, FileText, FolderOpen, Plus } from 'lucide-react'
import { supabase, unwrap } from '../../lib/supabase'
import { TIPOS_DOCUMENTO } from '../../lib/constants'
import { date } from '../../lib/format'
import { abrirArquivo, removerArquivo, uploadArquivo } from '../../lib/storage'
import { ConfirmButton, EmptyState, Field, FileInput, Modal } from '../../components/ui'
import { useToast } from '../../components/Toast'

function DocumentoModal({ open, onClose, obraId, tipoInicial, onSaved }) {
  const toast = useToast()
  const [tipo, setTipo] = useState('planta')
  const [nome, setNome] = useState('')
  const [obs, setObs] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) { setTipo(tipoInicial || 'planta'); setNome(''); setObs(''); setArquivo(null) }
  }, [open, tipoInicial])

  async function salvar(e) {
    e.preventDefault()
    if (!arquivo) return toast('Escolha o arquivo', 'erro')
    setSalvando(true)
    try {
      const up = await uploadArquivo(obraId, `documentos/${tipo}`, arquivo)
      unwrap(
        await supabase.from('documentos').insert({
          obra_id: obraId, tipo, nome: nome || arquivo.name, arquivo_path: up.path, arquivo_nome: up.nome, observacoes: obs || null,
        }),
      )
      toast('Documento anexado')
      onSaved()
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
      title="Anexar documento"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" form="form-doc" disabled={salvando}>{salvando ? 'Enviando…' : 'Anexar'}</button>
        </>
      }
    >
      <form id="form-doc" onSubmit={salvar} className="space-y-4">
        <Field label="Tipo de documento">
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_DOCUMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Arquivo *">
          <FileInput file={arquivo} onChange={setArquivo} accept="image/*,application/pdf,.doc,.docx,.dwg,.xls,.xlsx" />
        </Field>
        <Field label="Nome (opcional)">
          <input className="input" placeholder="Ex.: Planta baixa térreo" value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="Observações">
          <textarea className="input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}

export default function DocumentosTab({ obra, documentos, recarregar }) {
  const toast = useToast()
  const [modal, setModal] = useState({ open: false })

  async function excluir(d) {
    const { error } = await supabase.from('documentos').delete().eq('id', d.id)
    if (error) return toast(error.message, 'erro')
    await removerArquivo(d.arquivo_path)
    toast('Documento excluído')
    recarregar()
  }

  const porTipo = Object.keys(TIPOS_DOCUMENTO).map((t) => [t, documentos.filter((d) => d.tipo === t)])

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn-brand" onClick={() => setModal({ open: true })}>
          <Plus className="h-4 w-4" /> Anexar documento
        </button>
      </div>

      {documentos.length === 0 && (
        <div className="mb-4">
          <EmptyState icon={FolderOpen} title="Nenhum documento ainda" text="Guarde aqui plantas, escritura, matrícula, contrato, documentos pessoais, memorial descritivo e carta de entrega." />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {porTipo.map(([tipo, docs]) => (
          <div key={tipo} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{TIPOS_DOCUMENTO[tipo]}</p>
              <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setModal({ open: true, tipo })}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
            {docs.length === 0 ? (
              <p className="text-xs text-zinc-400">Nenhum arquivo</p>
            ) : (
              <ul className="space-y-1">
                {docs.map((d) => {
                  const Icon = /\.(png|jpe?g|webp|heic)$/i.test(d.arquivo_nome ?? '') ? FileImage : FileText
                  return (
                    <li key={d.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50">
                      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                      <button className="min-w-0 flex-1 text-left" onClick={() => abrirArquivo(d.arquivo_path)}>
                        <p className="truncate text-sm font-medium">{d.nome}</p>
                        <p className="text-[11px] text-zinc-400">{date(d.created_at)}{d.observacoes ? ` · ${d.observacoes}` : ''}</p>
                      </button>
                      <button className="btn-ghost !p-1.5" title="Abrir" onClick={() => abrirArquivo(d.arquivo_path)}>
                        <Download className="h-4 w-4" />
                      </button>
                      <ConfirmButton className="btn-ghost !px-1.5 !py-1 text-[11px] text-red-600" confirmText="Excluir?" onConfirm={() => excluir(d)}>
                        Excluir
                      </ConfirmButton>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <DocumentoModal open={modal.open} onClose={() => setModal({ open: false })} obraId={obra.id} tipoInicial={modal.tipo} onSaved={recarregar} />
    </>
  )
}
