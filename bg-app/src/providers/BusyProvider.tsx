import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BGLoader } from '@/components/BGLoader'

interface BusyApi {
  /**
   * Ejecuta una operación importante mostrando el loader de BG.
   * Solo aparece si la operación tarda más de ~300 ms (evita parpadeos).
   */
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T>
}

const BusyContext = createContext<BusyApi | null>(null)

export function BusyProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (count === 0) {
      setVisible(false)
      return
    }
    const t = window.setTimeout(() => setVisible(true), 300)
    return () => window.clearTimeout(t)
  }, [count])

  const run = useCallback(async <T,>(l: string, fn: () => Promise<T>): Promise<T> => {
    setLabel(l)
    setCount((c) => c + 1)
    try {
      return await fn()
    } finally {
      setCount((c) => c - 1)
    }
  }, [])

  const api = useMemo(() => ({ run }), [run])

  return (
    <BusyContext.Provider value={api}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-[150] flex animate-fade-in items-center justify-center bg-ink-950/80 backdrop-blur-sm" role="alert" aria-busy="true">
          <BGLoader compact label={label} />
        </div>
      )}
    </BusyContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusy(): BusyApi {
  const ctx = useContext(BusyContext)
  if (!ctx) throw new Error('useBusy debe usarse dentro de <BusyProvider>')
  return ctx
}
