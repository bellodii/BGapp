import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Cog, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'

export default function LoginPage() {
  const { status, signIn, authError } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to={from} replace />

  const busy = submitting || status === 'loading'
  const error = localError ?? authError

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!email.trim() || !password) {
      setLocalError('Ingresá tu correo y tu contraseña.')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    const { error: err } = await signIn(email, password)
    if (err) {
      setLocalError(err)
      setPassword('')
    }
    setSubmitting(false)
  }

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-ink-950 p-4">
      <Cog className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-spin-slow text-ink-800" strokeWidth={1} />
      <Cog className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] animate-spin-rev text-ink-800" strokeWidth={1} />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white">B<span className="text-brand-400">G</span></h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-steel-400">Movimientos de suelo y montaje</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-ink-700 bg-ink-900 p-7 shadow-2xl">
          <div className="hazard mb-6 h-1.5 rounded-full" />
          <h2 className="text-lg font-bold text-white">Acceso para administradores</h2>
          <p className="mb-5 mt-1 text-sm text-steel-400">Ingresá con tu cuenta autorizada.</p>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-steel-200">Correo electrónico</label>
          <div className="relative mb-4">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
            <input id="email" type="email" autoComplete="username" inputMode="email" autoFocus required
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy}
              className="w-full rounded-lg border border-ink-600 bg-ink-800 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-steel-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 disabled:opacity-60"
              placeholder="nombre@empresa.com" />
          </div>

          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-steel-200">Contraseña</label>
          <div className="relative mb-6">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy}
              className="w-full rounded-lg border border-ink-600 bg-ink-800 py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-steel-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 disabled:opacity-60"
              placeholder="••••••••••••" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-steel-400 hover:text-white">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button type="submit" className="w-full py-3" loading={busy} disabled={!email || !password}>
            {busy ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-steel-500">Sistema de uso interno · Acceso restringido</p>
      </div>
    </main>
  )
}
