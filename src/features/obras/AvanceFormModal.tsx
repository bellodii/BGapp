import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Button, Field, Input, Modal, NumberInput, Textarea } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { createAvance, updateAvance, updateObra } from '@/api/obras'
import { friendlyError } from '@/lib/errors'
import { formatNumber, parseNum, round2, unidadLabel } from '@/lib/format'
import { todayAR } from '@/lib/dates'
import type { AvanceObra, ObraResumen } from '@/types/db'

export function AvanceFormModal({ obra, avance, onClose }: { obra: ObraResumen; avance: AvanceObra | null; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [fecha, setFecha] = useState(avance?.fecha ?? todayAR())
  const [cantidad, setCantidad] = useState(avance ? String(avance.cantidad_realizada).replace('.', ',') : '')
  const [obs, setObs] = useState(avance?.observaciones ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const unidad = unidadLabel(obra.unidad_medida)
  const cant = parseNum(cantidad)
  // Pendiente "sin contar este avance" (si se edita, se descuenta su valor anterior).
  const pendienteBase = obra.cantidad_contratada - (obra.cantidad_realizada - (avance?.cantidad_realizada ?? 0))
  const excedente = cant > 0 ? round2(cant - Math.max(pendienteBase, 0)) : 0

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!fecha) e.fecha = 'Ingresá la fecha del avance.'
    else if (fecha > todayAR()) e.fecha = 'La fecha no puede ser futura.'
    if (!(cant > 0)) e.cantidad = 'Ingresá una cantidad mayor a cero.'
    else if (cant >= 1e11) e.cantidad = 'La cantidad es demasiado grande.'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    try {
      const payload = { fecha, cantidad_realizada: round2(cant), observaciones: obs.trim() || null }
      if (avance) await updateAvance(avance.id, payload)
      else {
        await createAvance({ obra_id: obra.id, ...payload })
        // Primer avance de una obra pendiente: pasa a "en ejecución" (si el usuario puede editar obras).
        if (obra.estado === 'pendiente') {
          try { await updateObra(obra.id, { estado: 'en_ejecucion' }) } catch { /* sin permiso: se deja como está */ }
        }
      }
      await qc.invalidateQueries()
      toast.success(avance ? 'Avance actualizado.' : 'Avance registrado.')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={avance ? 'Editar avance' : 'Registrar avance'} onClose={onClose} busy={saving}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="avance-form" loading={saving}>{avance ? 'Guardar cambios' : 'Registrar'}</Button>
      </>}>
      <form id="avance-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <p className="rounded-lg bg-steel-50 px-3 py-2 text-sm text-steel-600">
          <strong className="text-ink-900">{obra.nombre}</strong> · Pendiente actual: {formatNumber(obra.cantidad_pendiente)} {unidad}
        </p>
        <Field label="Fecha del avance" required error={errors.fecha} htmlFor="a-fecha">
          <Input id="a-fecha" type="date" value={fecha} max={todayAR()} onChange={(e) => setFecha(e.target.value)} invalid={!!errors.fecha} />
        </Field>
        <Field label={`Cantidad realizada (${unidad})`} required error={errors.cantidad} htmlFor="a-cant">
          <NumberInput id="a-cant" value={cantidad} onChange={(e) => setCantidad(e.target.value)} invalid={!!errors.cantidad} placeholder="Ej.: 4" autoFocus />
        </Field>
        {excedente > 0 && (
          <div className="flex gap-2 rounded-lg border border-brand-500/40 bg-brand-300/20 px-3 py-2 text-sm text-ink-800" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>Este avance supera lo pendiente por <strong>{formatNumber(excedente)} {unidad}</strong>. Se guardará como excedente para dejar constancia; la barra no pasará del 100 %.</span>
          </div>
        )}
        <Field label="Observaciones" htmlFor="a-obs">
          <Textarea id="a-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
        </Field>
      </form>
    </Modal>
  )
}
