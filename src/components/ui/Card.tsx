import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-2xl border border-steel-200 bg-white shadow-sm', className)}>{children}</div>
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-steel-100 px-5 py-4">
      <h3 className="font-bold text-ink-900">{title}</h3>
      {action}
    </div>
  )
}

export function StatCard({ icon, label, value, sub, accent = false }: {
  icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; accent?: boolean
}) {
  return (
    <Card className={clsx('animate-fade-in p-5', accent && 'border-ink-900 bg-ink-900 text-white')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={clsx('text-xs font-semibold uppercase tracking-wide', accent ? 'text-steel-400' : 'text-steel-500')}>{label}</p>
          <p className="mt-1.5 truncate text-2xl font-extrabold">{value}</p>
          {sub && <p className={clsx('mt-1 text-xs', accent ? 'text-steel-400' : 'text-steel-500')}>{sub}</p>}
        </div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent ? 'bg-brand-400 text-ink-950' : 'bg-brand-300/40 text-brand-600')}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function PageHeader({ title, subtitle, actions, back }: {
  title: string; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode
}) {
  return (
    <div className="mb-6">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-steel-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
