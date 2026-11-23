import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

const base =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-steel-100 disabled:text-steel-500'

export function Field({ label, error, hint, required, htmlFor, children, className }: {
  label: string; error?: string; hint?: string; required?: boolean; htmlFor?: string; children: ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink-800">
        {label}{required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>
        : hint ? <p className="mt-1 text-xs text-steel-500">{hint}</p> : null}
    </div>
  )
}

type InvalidProps = { invalid?: boolean }

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & InvalidProps) {
  return <input className={clsx(base, invalid ? 'border-red-400' : 'border-steel-300', className)} aria-invalid={invalid || undefined} {...rest} />
}

/** Número con coma o punto decimal (texto, para poder validar sin que el navegador lo altere). */
export function NumberInput({ invalid, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & InvalidProps) {
  return <input type="text" inputMode="decimal" autoComplete="off" className={clsx(base, invalid ? 'border-red-400' : 'border-steel-300', className)} aria-invalid={invalid || undefined} {...rest} />
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & InvalidProps) {
  return <select className={clsx(base, invalid ? 'border-red-400' : 'border-steel-300', className)} aria-invalid={invalid || undefined} {...rest}>{children}</select>
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProps) {
  return <textarea rows={3} className={clsx(base, invalid ? 'border-red-400' : 'border-steel-300', className)} aria-invalid={invalid || undefined} {...rest} />
}

export function Checkbox({ label, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-2 text-sm text-ink-800', className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-steel-300 accent-brand-500" {...rest} />
      <span>{label}</span>
    </label>
  )
}
