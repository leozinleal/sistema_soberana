import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await signIn(email, senha)
    setEnviando(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="card overflow-hidden">
          <div className="h-2 bg-brand" />
          <div className="px-7 pt-8 pb-7">
            <img src="/logo-soberana.png" alt="Soberana Imobiliária e Construtora" className="mx-auto w-56" />
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Gestão de obras</p>

            <form onSubmit={entrar} className="mt-8 space-y-4">
              <label className="block">
                <span className="label">E-mail</span>
                <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Senha</span>
                <input className="input" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
              </label>
              {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
              <button className="btn-primary w-full !py-3" disabled={enviando}>
                {enviando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
