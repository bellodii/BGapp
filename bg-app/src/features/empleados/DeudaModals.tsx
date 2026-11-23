import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Field, Input, Modal, NumberInput } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { registrarDeuda, registrarPagoDeuda } from '@/api/empleados'
import { friendlyError } from '@/lib/errors'
import { formatARS, parseNum, round2 } from '@/lib/format'
import { todayAR } from '@/lib/dates'
import type { Deuda } from '@/types/db'

export function DeudaFormModal({ empleadoId, onClose }: { empleadoId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [descripcion, setDescripcion] = useState('')
  const [importe, setImporte] = useState('')
  const [fecha, setFecha] = useState(todayAR())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    const monto = parseNum(importe)
    if (!descripcion.trim()) e.descripcion = 'Ingresá una descripción.'
    if (!(monto > 0)) e.importe = 'Ingresá un importe mayor a cero.'
    else if (monto >= 1e11) e.importe = 'El importe es demasiado grande.'
    if (!fecha) e.fecha = 'Ingresá la fecha.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await registrarDeuda({ empleadoId, descripcion: descripcion.trim(), importe: round2(monto), fecha })
      await qc.invalidateQueries()
      toast.success('Deuda registrada.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Registrar deuda" onClose={onClose} busy={saving}
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" form="deuda-form" loading={saving}>Registrar deuda</Button></>}>
      <form id="deuda-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label="Descripción" required error={errors.descripcion} htmlFor="d-desc">
          <Input id="d-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} invalid={!!errors.descripcion} placeholder="Ej.: Adelanto de sueldo" maxLength={200} autoFocus />
        </Field>
        <Field label="Importe (ARS)" required error={errors.importe} htmlFor="d-imp">
          <NumberInput id="d-imp" value={importe} onChange={(e) => setImporte(e.target.value)} invalid={!!errors.importe} placeholder="Ej.: 50000" />
        </Field>
        <Field label="Fecha" required error={errors.fecha} htmlFor="d-fecha">
          <Input id="d-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} invalid={!!errors.fecha} />
        </Field>
      </form>
    </Modal>
  )
}

export function PagoDeudaModal({ deuda, onClose }: { deuda: Deuda; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [importe, setImporte] = useState('')
  const [desc, setDesc] = useState('')
  const [fecha, setFecha] = useState(todayAR())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    const monto = parseNum(importe)
    if (!(monto > 0)) e.importe = 'Ingresá un importe mayor a cero.'
    else if (round2(monto) > deuda.saldo_pendiente) e.importe = `No puede superar el saldo pendiente (${formatARS(deuda.saldo_pendiente)}).`
    if (!fecha) e.fecha = 'Ingresá la fecha.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await registrarPagoDeuda({ deudaId: deuda.id, importe: round2(monto), descripcion: desc.trim() || null, fecha })
      await qc.invalidateQueries()
      toast.success('Pago registrado.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Registrar pago de deuda" onClose={onClose} busy={saving}
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" form="pago-form" loading={saving}>Registrar pago</Button></>}>
      <form id="pago-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <p className="rounded-lg bg-steel-50 px-3 py-2 text-sm">
          <strong>{deuda.descripcion}</strong><br />Saldo pendiente: <strong>{formatARS(deuda.saldo_pendiente)}</strong>
        </p>
        <Field label="Importe del pago (ARS)" required error={errors.importe} htmlFor="p-imp">
          <div className="flex gap-2">
            <NumberInput id="p-imp" value={importe} onChange={(e) => setImporte(e.target.value)} invalid={!!errors.importe} autoFocus />
            <Button variant="outline" onClick={() => setImporte(String(deuda.saldo_pendiente).replace('.', ','))}>Total</Button>
          </div>
        </Field>
        <Field label="Fecha" required error={errors.fecha} htmlFor="p-fecha">
          <Input id="p-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} invalid={!!errors.fecha} />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="p-desc">
          <Input id="p-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej.: Cuota 1 en efectivo" maxLength={200} />
        </Field>
      </form>
    </Modal>
  )
}
