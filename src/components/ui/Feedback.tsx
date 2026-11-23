import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-steel-500', className)} aria-hidden />
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-steel-500" role="status">
      <Spinner /> {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-red-600" />
      <p className="max-w-md text-sm text-red-800">{message}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>}
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox className="h-9 w-9 text-steel-300" />
      <p className="font-semibold text-ink-800">{title}</p>
      {message && <p className="max-w-sm text-sm text-steel-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

type Tone = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'dark'
const TONES: Record<Tone, string> = {
  gray: 'bg-steel-100 text-steel-600',
  yellow: 'bg-brand-300/40 text-brand-600',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  dark: 'bg-ink-900 text-white',
}
export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone])}>{children}</span>
}

/** Barra de progreso animada. Nunca supera visualmente el 100 %. */
export function ProgressBar({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' | 'lg' }) {
  const target = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(target))
    return () => cancelAnimationFrame(id)
  }, [target])
  return (
    <div
      className={clsx('w-full overflow-hidden rounded-full bg-steel-200', size === 'sm' ? 'h-2' : size === 'lg' ? 'h-5' : 'h-3')}
      role="progressbar" aria-valuenow={Math.round(target)} aria-valuemin={0} aria-valuemax={100}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-700 ease-out', target >= 100 ? 'bg-emerald-500' : 'bg-brand-400')}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
