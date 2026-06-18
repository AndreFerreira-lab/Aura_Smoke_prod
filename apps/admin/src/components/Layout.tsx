import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ShoppingBag, Package, Users, LogOut, Menu
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, exact: false },
  { to: '/produtos', label: 'Produtos', icon: Package, exact: false },
  { to: '/usuarios', label: 'Usuários', icon: Users, exact: false },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    toast.success('Até logo!')
    navigate('/login')
  }

  const Sidebar = () => (
    <aside className="flex h-full w-60 flex-col glass-strong border-r border-border/50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <img src="/bolaaia.png" alt="Bola AI" className="h-9 w-9 rounded-xl" onError={e => { e.currentTarget.style.display = 'none' }} />
        <div>
          <p className="font-bold text-gradient leading-none">Bola AI</p>
          <p className="text-xs text-muted-foreground">Painel Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary flex-shrink-0">
            {user?.profile?.nome?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.profile?.nome || 'Admin'}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative flex h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 md:px-6">
          <button onClick={() => setOpen(true)} className="md:hidden rounded-lg p-2 hover:bg-secondary transition">
            <Menu className="h-5 w-5" />
          </button>
          <div />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Sistema online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
