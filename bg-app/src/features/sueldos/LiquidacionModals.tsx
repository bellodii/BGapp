import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, ErrorState, Field, Input, Modal, PageLoader, Textarea, Badge } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { useBusy } from '@/providers/BusyProvider'
import { anularLiquidacion, fetchDetalleDescuentos, pagarLiquidacion } from '@/api/liquidaciones'
import { friendlyError } from '@/lib/errors'
import { formatARS } from '@/lib/format'
import { MESES, formatDate, todayAR } from '@/lib/dates'
import type { LiquidacionResumen } from '@/types/db'

export function DetalleLiquidacionModal({ liq, onClose }: { liq: LiquidacionResumen; onClose: () => void }) {
  const detQ = useQuery({ queryKey: ['detalle-liq', liq.id], queryFn: () => fetchDetalleDescuentos(liq.id) })
  const rows: [string, string, boolean?][] = [
    [liq.tipo_remuneracion === 'mensual' ? 'Sueldo mensual del período' : 'Valor diario × días programados', formatARS(liq.sueldo_base)],
    ['Días programados', String(liq.dias_programados)],
    ['Días trabajados', String(liq.dias_trabajados)],
    ['Ausencias', String(liq.dias_ausentes)],
    ['Justificados', String(liq.dias_justificados)],
    ['Valor diario aplicado', formatARS(liq.valor_diario_aplicado)],
    ['Descuento por ausencias', formatARS(liq.descuentos_ausencias), true],
    ['Sueldo bruto', formatARS(liq.sueldo_bruto)],
    ['Descuentos de deudas', formatARS(liq.descuentos_deudas), true],
  ]
  return (
    <Modal title={`${liq.nombre_completo} · ${MESES[liq.mes - 1]} ${liq.anio}`} onClose={onClose} size="md" footer={<Button variant="outline" onClick={onClose}>Cerrar</Button>}>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Badge tone={liq.estado === 'pagado' ? 'green' : 'yellow'}>{liq.estado === 'pagado' ? `Pagado el ${formatDate(liq.fecha_pago)}` : 'Pendiente de pago'}</Badge>
        <span className="text-steel-500">Valores congelados al generar la liquidación.</span>
      </div>
      <div className="rounded-xl bg-steel-50 px-4 py-2 text-sm">
        {rows.map(([k, v, minus]) => (
          <div key={k} className="flex justify-between py-1.5"><span className="text-steel-600">{k}</span><span className={minus ? 'font-semibold text-red-700' : 'font-semibold'}>{minus ? '− ' : ''}{v}</span></div>
        ))}
        <div className="mt-1 flex justify-between border-t border-steel-300 pt-2.5 text-base font-extrabold"><span>Total neto</span><span>{formatARS(liq.sueldo_neto)}</span></div>
      </div>
      <h4 className="mb-2 mt-4 text-sm font-bold">Deudas descontadas</h4>
      {detQ.isLoading ? <PageLoader /> : detQ.error ? <ErrorState message={friendlyError(detQ.error)} /> :
        !detQ.data?.length ? <p className="text-sm text-steel-500">No se descontaron deudas en esta liquidación.</p> : (
          <ul className="divide-y divide-steel-100 text-sm">
            {detQ.data.map((d) => <li key={d.id} className="flex justify-between py-2"><span>{d.deudas_empleados?.descripcion ?? 'Deuda'}</span><span className="font-semibold">{formatARS(d.importe)}</span></li>)}
          </ul>
        )}
    </Modal>
  )
}

export function PagarLiquidacionModal({ liq, onClose }: { liq: LiquidacionResumen; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { run } = useBusy()
  const [fecha, setFecha] = useState(todayAR())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function pagar() {
    if (!fecha) { setError('Ingresá la fecha de pago.'); return }
    setSaving(true)
    try {
      await run('Registrando pago…', () => pagarLiquidacion(liq.id, fecha))
      await qc.invalidateQueries()
      toast.success('Sueldo marcado como pagado.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Marcar sueldo como pagado" onClose={onClose} busy={saving} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={pagar} loading={saving}>Confirmar pago</Button></>}>
      <div className="grid gap-4">
        <p className="text-sm">Pagar <strong>{formatARS(liq.sueldo_neto)}</strong> a <strong>{liq.nombre_completo}</strong> por {MESES[liq.mes - 1]} {liq.anio}. Una vez pagado, la liquidación y las asistencias del mes quedan bloqueadas.</p>
        <Field label="Fecha de pago" required error={error} htmlFor="pg-fecha"><Input id="pg-fecha" type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setError('') }} invalid={!!error} /></Field>
      </div>
    </Modal>
  )
}

export function AnularLiquidacionModal({ liq, onClose }: { liq: LiquidacionResumen; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { run } = useBusy()
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  async function anular() {
    setSaving(true)
    try {
      await run('Anulando liquidación…', () => anularLiquidacion(liq.id, motivo.trim() || null))
      await qc.invalidateQueries()
      toast.success('Liquidación anulada. Las deudas descontadas fueron repuestas.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Anular liquidación" onClose={onClose} busy={saving} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="danger" onClick={anular} loading={saving}>Anular liquidación</Button></>}>
      <div className="grid gap-4">
        <p className="text-sm">Se anulará la liquidación de <strong>{liq.nombre_completo}</strong> ({MESES[liq.mes - 1]} {liq.anio}). Los descuentos de deuda aplicados se reponen y podrás generarla nuevamente. Queda constancia en el historial.</p>
        <Field label="Motivo (opcional)" htmlFor="an-motivo"><Textarea id="an-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} rows={2} /></Field>
      </div>
    </Modal>
  )
}
