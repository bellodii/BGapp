import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import clsx from 'clsx'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const push = useCallback((type: ToastType, message: string) => {
    const id = ++seq.current
    setItems((l) => [...l.slice(-3), { id, type, message }])
    window.setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000)
  }, [dismiss])

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-white p-3.5 text-sm shadow-xl',
              t.type === 'success' && 'border-emerald-200',
              t.type === 'error' && 'border-red-200',
              t.type === 'info' && 'border-steel-200',
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
            {t.type === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
            {t.type === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-steel-500" />}
            <p className="flex-1 text-ink-800">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-steel-400 hover:text-ink-900" aria-label="Cerrar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
