import { NavLink, Outlet } from 'react-router-dom'
import { Building2, HardHat, LayoutDashboard, LogOut, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/obras', label: 'Obras', icon: Building2 },
  { to: '/funcionarios', label: 'Funcionários', icon: HardHat },
  { to: '/clientes', label: 'Clientes', icon: Users },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-full lg:flex">
      {/* Menu lateral (computador) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex lg:fixed lg:inset-y-0">
        <div className="px-6 pt-7 pb-6">
          <img src="/logo-soberana.png" alt="Soberana Imobiliária e Construtora" className="w-44" />
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Gestão de obras</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-ink text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-brand' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-100 p-4">
          <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          <button onClick={signOut} className="btn-ghost mt-2 w-full justify-start !px-2">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <img src="/logo-soberana.png" alt="Soberana" className="h-8" />
        <button onClick={signOut} className="btn-ghost !p-2" aria-label="Sair">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 px-4 pt-5 pb-28 sm:px-6 lg:ml-64 lg:px-10 lg:pt-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Menu inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-ink' : 'text-zinc-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-brand' : ''}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
