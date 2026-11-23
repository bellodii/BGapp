import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-400 text-ink-950 hover:bg-brand-300 active:bg-brand-500',
  dark: 'bg-ink-900 text-white hover:bg-ink-700',
  outline: 'border border-steel-300 bg-white text-ink-900 hover:bg-steel-50',
  ghost: 'text-ink-800 hover:bg-steel-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  tone?: 'default' | 'danger'
}

/** Botón de ícono accesible (acciones de tablas). */
export function IconButton({ label, icon, tone = 'default', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-steel-600 hover:bg-steel-100 hover:text-ink-900',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
