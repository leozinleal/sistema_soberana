import { supabase } from './supabase'

const BUCKET = 'arquivos'
const LIMITE_MB = 50 // limite por arquivo do Supabase gratuito

const limpar = (nome) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')

/**
 * Reduz fotos antes do envio (lado maior até 2000px, JPEG 80%).
 * Uma foto de celular de ~3 MB costuma cair para ~300–500 KB, ainda legível.
 * PDFs e outros arquivos são enviados como estão.
 */
async function comprimirImagem(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // fundo branco para PNG transparente
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
    if (!blob || blob.size >= file.size) return file
    const nome = file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg'
    return new File([blob], nome, { type: 'image/jpeg' })
  } catch {
    return file // se o navegador não conseguir comprimir, envia o original
  }
}

/** Envia um arquivo e devolve { path, nome } */
export async function uploadArquivo(obraId, pasta, original) {
  const file = await comprimirImagem(original)
  if (file.size > LIMITE_MB * 1024 * 1024) {
    throw new Error(`Arquivo muito grande (${(file.size / 1048576).toFixed(0)} MB). O limite é ${LIMITE_MB} MB.`)
  }
  const path = `obras/${obraId}/${pasta}/${crypto.randomUUID()}-${limpar(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return { path, nome: file.name }
}

/** Abre o arquivo numa nova aba (link temporário de 1h) */
export async function abrirArquivo(path) {
  // abre a aba antes de buscar o link, senão o celular bloqueia como pop-up
  const aba = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) {
    aba?.close()
    throw error
  }
  if (aba) {
    aba.opener = null
    aba.location.href = data.signedUrl
  } else {
    window.location.href = data.signedUrl
  }
}

export async function removerArquivo(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
