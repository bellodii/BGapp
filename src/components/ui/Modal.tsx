import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Mientras está ocupado no se puede cerrar. */
  busy?: boolean
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ title, onClose, children, footer, size = 'md', busy = false }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, busy])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label={title}
        className={clsx('flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', SIZES[size])}>
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-4">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} disabled={busy} aria-label="Cerrar"
            className="rounded-lg p-1.5 text-steel-500 hover:bg-steel-100 hover:text-ink-900 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-steel-200 bg-steel-50 px-5 py-3 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

/** Confirmación previa a operaciones destructivas. */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }: ConfirmProps) {
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }
  return (
    <Modal title={title} onClose={onCancel} size="sm" busy={loading}
      footer={<>
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'dark'} onClick={handle} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="text-sm text-ink-800">{message}</div>
    </Modal>
  )
}
