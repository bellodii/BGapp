import { Cog } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  /** Texto debajo de la barra. */
  label?: string
  /** Versión reducida para overlays de operaciones. */
  compact?: boolean
  /** 'fill': la barra se llena en `duration` ms. 'loop': indeterminada. */
  mode?: 'fill' | 'loop'
  duration?: number
}

/** Loader de BG: engranajes (maquinaria), marca y barra de progreso de franjas de obra. */
export function BGLoader({ label, compact = false, mode = 'loop', duration = 1400 }: Props) {
  return (
    <div className="flex flex-col items-center text-center" role="status">
      <div className="relative flex items-center gap-3">
        <Cog className={clsx('animate-spin-slow text-brand-400', compact ? 'h-8 w-8' : 'h-14 w-14')} strokeWidth={1.6} />
        <div className={clsx('font-black tracking-tight text-white', compact ? 'text-4xl' : 'text-7xl')}>
          B<span className="text-brand-400">G</span>
        </div>
        <Cog className={clsx('animate-spin-rev text-steel-500', compact ? 'h-6 w-6 self-end' : 'h-10 w-10 self-end')} strokeWidth={1.6} />
      </div>
      {!compact && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-steel-400">
          Movimientos de suelo y montaje
        </p>
      )}
      <div className={clsx('mt-6 overflow-hidden rounded-full bg-ink-700', compact ? 'h-1.5 w-48' : 'h-2 w-64')}>
        {mode === 'fill' ? (
          <div className="hazard h-full animate-bar-fill rounded-full" style={{ ['--bar-duration' as string]: `${duration}ms` }} />
        ) : (
          <div className="hazard h-full animate-bar-loop rounded-full" />
        )}
      </div>
      {label && <p className="mt-3 text-sm text-steel-300">{label}</p>}
    </div>
  )
}
