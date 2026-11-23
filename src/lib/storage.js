import { supabase } from './supabase'

const BUCKET = 'arquivos'

const limpar = (nome) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')

/** Envia um arquivo e devolve { path, nome } */
export async function uploadArquivo(obraId, pasta, file) {
  const path = `obras/${obraId}/${pasta}/${crypto.randomUUID()}-${limpar(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return { path, nome: file.name }
}

/** Abre o arquivo numa nova aba (link temporário de 1h) */
export async function abrirArquivo(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener')
}

export async function removerArquivo(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
