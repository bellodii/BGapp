import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarCheck, HardHat, History, Truck, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/auth/AuthContext'
import type { Modulo } from '@/auth/types'
import { Logo } from '@/components/Logo'

interface NavItem { to: string; label: string; icon: LucideIcon; modulo?: Modulo; soloSuper?: boolean; end?: boolean }

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, modulo: 'dashboard', end: true },
  { to: '/obras', label: 'Obras', icon: HardHat, modulo: 'obras' },
  { to: '/maquinarias', label: 'Maquinarias', icon: Truck, modulo: 'maquinarias' },
  { to: '/empleados', label: 'Empleados', icon: Users, modulo: 'empleados' },
  { to: '/asistencia', label: 'Asistencia', icon: CalendarCheck, modulo: 'asistencias' },
  { to: '/sueldos', label: 'Sueldos', icon: Wallet, modulo: 'liquidaciones' },
  { to: '/administradores', label: 'Administradores', icon: ShieldCheck, soloSuper: true },
  { to: '/historial', label: 'Historial', icon: History, modulo: 'auditoria' },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export function AppLayout() {
  const { profile, can, isSuperAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => setOpen(false), [location.pathname])

  const items = NAV.filter((n) => (n.soloSuper ? isSuperAdmin : n.modulo ? can(n.modulo) : true))

  async function logout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-950 text-steel-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo size={42} />
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-tight text-white">BG</p>
          <p className="text-[11px] uppercase tracking-widest text-steel-500">Gestión interna</p>
        </div>
      </div>
      <div className="hazard mx-5 h-1 rounded-full opacity-80" />
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => clsx(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
              isActive ? 'bg-brand-400 text-ink-950' : 'hover:bg-ink-800 hover:text-white',
            )}>
            <Icon className="h-5 w-5 shrink-0" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ink-800 p-4">
        <p className="truncate text-sm font-semibold text-white">{profile?.nombre} {profile?.apellido}</p>
        <p className="mb-3 truncate text-xs text-steel-500">
          {isSuperAdmin ? 'Administrador principal' : 'Administrador'}
        </p>
        <button onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-sm font-semibold text-steel-300 transition hover:bg-ink-800 hover:text-white">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-full">
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Móvil / tablet */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink-950/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85%] animate-slide-up">
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-steel-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-steel-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-lg p-2 text-ink-900 hover:bg-steel-100">
            <Menu className="h-5 w-5" />
          </button>
          <Logo size={32} />
          <span className="font-extrabold tracking-tight">BG</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
