import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Button, Checkbox, ErrorState, Modal, NumberInput, PageLoader } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { useBusy } from '@/providers/BusyProvider'
import { calcularLiquidacion, fetchDeudasAbiertas, generarLiquidacion } from '@/api/liquidaciones'
import { friendlyError } from '@/lib/errors'
import { formatARS, parseNum, round2 } from '@/lib/format'
import { MESES, formatDate } from '@/lib/dates'
import type { EmpleadoResumen } from '@/types/db'

function Row({ label, value, strong, minus }: { label: string; value: string; strong?: boolean; minus?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1.5 text-sm ${strong ? 'border-t border-steel-300 pt-2.5 text-base font-extrabold' : ''}`}>
      <span className={strong ? '' : 'text-steel-600'}>{label}</span>
      <span className={minus ? 'font-semibold text-red-700' : 'font-semibold'}>{minus ? '− ' : ''}{value}</span>
    </div>
  )
}

export function LiquidarModal({ empleado, anio, mes, onClose }: { empleado: EmpleadoResumen; anio: number; mes: number; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { run } = useBusy()
  const [descJust, setDescJust] = useState(empleado.descontar_justificados)
  const [ignorar, setIgnorar] = useState(false)
  const [montos, setMontos] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const calcQ = useQuery({ queryKey: ['calc', empleado.id, anio, mes, descJust], queryFn: () => calcularLiquidacion(empleado.id, mes, anio, descJust) })
  const deudasQ = useQuery({ queryKey: ['deudas-abiertas', empleado.id], queryFn: () => fetchDeudasAbiertas(empleado.id) })
  const c = calcQ.data

  const { total, errores, items } = useMemo(() => {
    const errs: Record<string, string> = {}
    const its: { deuda_id: string; importe: number }[] = []
    let t = 0
    for (const d of deudasQ.data ?? []) {
      const raw = montos[d.id]
      if (raw === undefined || raw.trim() === '') continue
      const v = parseNum(raw)
      if (Number.isNaN(v) || v < 0) errs[d.id] = 'Importe inválido.'
      else if (round2(v) > d.saldo_pendiente) errs[d.id] = `Supera el saldo (${formatARS(d.saldo_pendiente)}).`
      else if (v > 0) { its.push({ deuda_id: d.id, importe: round2(v) }); t += round2(v) }
    }
    return { total: round2(t), errores: errs, items: its }
  }, [montos, deudasQ.data])

  const bruto = c?.sueldo_bruto ?? 0
  const excede = total > bruto
  const neto = round2(bruto - total)
  const sinRegistro = c?.dias_sin_registro ?? 0
  const bloqueado = !c || Object.keys(errores).length > 0 || excede || (sinRegistro > 0 && !ignorar)

  async function generar() {
    if (!c) return
    setSaving(true)
    try {
      await run('Generando liquidación…', () => generarLiquidacion({
        empleadoId: empleado.id, mes, anio, descuentos: items, descontarJustificados: descJust, ignorarSinRegistro: ignorar,
      }))
      await qc.invalidateQueries()
      toast.success('Liquidación generada.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title={`Liquidar · ${empleado.nombre_completo}`} onClose={onClose} busy={saving} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={generar} loading={saving} disabled={bloqueado}>Generar liquidación</Button></>}>
      <p className="mb-4 text-sm text-steel-600">Período: <strong className="text-ink-900">{MESES[mes - 1]} {anio}</strong> · {empleado.tipo_remuneracion === 'mensual' ? `Sueldo mensual ${formatARS(empleado.sueldo_mensual)}` : `Valor por día ${formatARS(empleado.valor_diario)}`}</p>

      {calcQ.isLoading ? <PageLoader label="Calculando…" /> : calcQ.error ? <ErrorState message={friendlyError(calcQ.error)} onRetry={() => void calcQ.refetch()} /> : c && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel-500">Cálculo automático</h3>
            <div className="rounded-xl bg-steel-50 px-4 py-2">
              <Row label="Días que debía trabajar" value={String(c.dias_programados)} />
              <Row label="Días trabajados" value={String(c.dias_trabajados)} />
              <Row label="Ausencias" value={String(c.dias_ausentes)} />
              <Row label="Justificados" value={String(c.dias_justificados)} />
              <Row label="Valor diario aplicado" value={formatARS(c.valor_diario_aplicado)} />
              <Row label="Sueldo base del período" value={formatARS(c.sueldo_base)} />
              <Row label="Descuento por ausencias" value={formatARS(c.descuentos_ausencias)} minus />
              <Row label="Sueldo bruto" value={formatARS(c.sueldo_bruto)} strong />
            </div>
            <Checkbox className="mt-3" checked={descJust} onChange={(e) => setDescJust(e.target.checked)}
              label="Descontar días justificados como ausencias" />
            {sinRegistro > 0 && (
              <div className="mt-3 rounded-lg border border-brand-500/40 bg-brand-300/20 p-3 text-sm" role="alert">
                <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Hay <strong>{sinRegistro}</strong> día(s) programado(s) sin asistencia cargada. Completá el calendario o continuá considerándolos trabajados.</p>
                <Checkbox className="mt-2" checked={ignorar} onChange={(e) => setIgnorar(e.target.checked)} label="Considerarlos trabajados" />
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel-500">Descuento de deudas</h3>
            {deudasQ.isLoading ? <PageLoader /> : !deudasQ.data?.length ? (
              <p className="rounded-xl bg-steel-50 px-4 py-6 text-center text-sm text-steel-500">Sin deudas pendientes.</p>
            ) : (
              <ul className="space-y-3">
                {deudasQ.data.map((d) => (
                  <li key={d.id} className="rounded-xl border border-steel-200 p-3">
                    <p className="text-sm font-semibold">{d.descripcion}</p>
                    <p className="mb-2 text-xs text-steel-500">{formatDate(d.fecha)} · Saldo {formatARS(d.saldo_pendiente)}</p>
                    <div className="flex gap-2">
                      <NumberInput aria-label={`Importe a descontar de ${d.descripcion}`} placeholder="Importe a descontar (0 = no descontar)" value={montos[d.id] ?? ''}
                        onChange={(e) => setMontos((m) => ({ ...m, [d.id]: e.target.value }))} invalid={!!errores[d.id]} />
                      <Button variant="outline" size="sm" onClick={() => {
                        const restante = Math.max(bruto - (total - (items.find((i) => i.deuda_id === d.id)?.importe ?? 0)), 0)
                        setMontos((m) => ({ ...m, [d.id]: String(round2(Math.min(d.saldo_pendiente, restante))).replace('.', ',') }))
                      }}>Máx.</Button>
                    </div>
                    {errores[d.id] && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{errores[d.id]}</p>}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 rounded-xl bg-ink-900 px-4 py-3 text-white">
              <div className="flex justify-between text-sm"><span className="text-steel-300">Sueldo bruto</span><span>{formatARS(bruto)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-steel-300">Descuento de deudas</span><span>− {formatARS(total)}</span></div>
              <div className="mt-2 flex justify-between border-t border-ink-600 pt-2 text-lg font-extrabold"><span>Total neto a pagar</span><span className="text-brand-400">{formatARS(neto)}</span></div>
            </div>
            {excede && <p className="mt-2 text-xs font-medium text-red-600" role="alert">Los descuentos no pueden superar el sueldo bruto.</p>}
            <p className="mt-2 text-xs text-steel-500">Solo se descuenta lo que vos indiques: nada se descuenta automáticamente.</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
