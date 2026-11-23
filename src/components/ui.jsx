import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Paperclip, X } from 'lucide-react'

export function Spinner({ className = '' }) {
  return (
    <div className={`h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-ink ${className}`} />
  )
}

export function Loading() {
  return (
    <div className="grid place-items-center py-16">
      <Spinner />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand">
          <Icon className="h-6 w-6 text-ink" />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-zinc-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-zinc-900',
    green: 'text-green-700',
    red: 'text-red-600',
    amber: 'text-amber-600',
  }
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

const pilhaModais = []

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  const fechar = useRef(onClose)
  fechar.current = onClose
  useEffect(() => {
    if (!open) return
    const id = Symbol()
    pilhaModais.push(id)
    // Esc fecha só a janela que está por cima
    const esc = (e) => e.key === 'Escape' && pilhaModais.at(-1) === id && fechar.current()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      pilhaModais.splice(pilhaModais.indexOf(id), 1)
      if (!pilhaModais.length) document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Campo de arquivo simples (mostra o nome escolhido) */
export function FileInput({ file, onChange, accept = 'image/*,application/pdf', atual }) {
  const ref = useRef(null)
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button type="button" className="btn-outline w-full justify-start" onClick={() => ref.current?.click()}>
        <Paperclip className="h-4 w-4" />
        <span className="truncate">{file ? file.name : atual ? `Atual: ${atual} (trocar)` : 'Escolher arquivo (foto ou PDF)'}</span>
      </button>
    </div>
  )
}

/** Botão que pede confirmação no segundo clique */
export function ConfirmButton({ onConfirm, children, className = 'btn-ghost', confirmText = 'Confirmar?' }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={armed ? 'btn-danger !px-3 !py-1.5' : className}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmText : children}
    </button>
  )
}
