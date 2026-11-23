import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/auth/AuthContext'
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Select, Textarea } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { useBusy } from '@/providers/BusyProvider'
import { fetchEmpleados } from '@/api/empleados'
import { deleteAsistencia, fetchAsistenciasMes, upsertAsistencias } from '@/api/asistencias'
import { friendlyError } from '@/lib/errors'
import { DIAS_CORTOS, MESES, currentPeriod, daysInMonth, formatDate, isoDow, toIso, todayAR } from '@/lib/dates'
import type { Asistencia, EmpleadoResumen, EstadoAsistencia } from '@/types/db'

const ESTADOS: { k: EstadoAsistencia; label: string; cell: string; dot: string }[] = [
  { k: 'trabajado', label: 'Trabajado', cell: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-500' },
  { k: 'ausente', label: 'Ausente', cell: 'bg-red-100 text-red-900 border-red-300', dot: 'bg-red-500' },
  { k: 'justificado', label: 'Justificado', cell: 'bg-sky-100 text-sky-900 border-sky-300', dot: 'bg-sky-500' },
  { k: 'no_laborable', label: 'No laborable', cell: 'bg-steel-200 text-steel-600 border-steel-300', dot: 'bg-steel-400' },
]
const ESTADO_MAP = Object.fromEntries(ESTADOS.map((e) => [e.k, e])) as Record<EstadoAsistencia, (typeof ESTADOS)[number]>

function DiaModal({ empleado, fecha, registro, onClose }: { empleado: EmpleadoResumen; fecha: string; registro: Asistencia | undefined; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [estado, setEstado] = useState<EstadoAsistencia>(registro?.estado ?? 'trabajado')
  const [obs, setObs] = useState(registro?.observaciones ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function guardar() {
    setSaving(true)
    try {
      await upsertAsistencias([{ empleado_id: empleado.id, fecha, estado, observaciones: obs.trim() || null }])
      await qc.invalidateQueries()
      toast.success('Asistencia guardada.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }
  async function quitar() {
    if (!registro) return
    setRemoving(true)
    try {
      await deleteAsistencia(registro.id)
      await qc.invalidateQueries()
      toast.success('Registro eliminado.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setRemoving(false) }
  }

  return (
    <Modal title={`${empleado.nombre_completo} · ${formatDate(fecha)}`} onClose={onClose} busy={saving || removing} size="sm"
      footer={<>
        {registro && <Button variant="outline" className="mr-auto" onClick={quitar} loading={removing} disabled={saving}>Quitar registro</Button>}
        <Button variant="outline" onClick={onClose} disabled={saving || removing}>Cancelar</Button>
        <Button onClick={guardar} loading={saving} disabled={removing}>Guardar</Button>
      </>}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Estado del día">
          {ESTADOS.map((s) => (
            <button key={s.k} type="button" role="radio" aria-checked={estado === s.k} onClick={() => setEstado(s.k)}
              className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition', estado === s.k ? 'border-ink-900 ring-2 ring-brand-400' : 'border-steel-300 hover:bg-steel-50')}>
              <span className={clsx('h-3 w-3 rounded-full', s.dot)} /> {s.label}
            </button>
          ))}
        </div>
        <Field label="Observaciones (opcional)" htmlFor="as-obs"><Textarea id="as-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} rows={2} /></Field>
      </div>
    </Modal>
  )
}

function FeriadoModal({ empleados, onClose }: { empleados: EmpleadoResumen[]; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { run } = useBusy()
  const [fecha, setFecha] = useState(todayAR())
  const [obs, setObs] = useState('Feriado')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const aplica = empleados.filter((e) => e.activo && e.fecha_ingreso <= fecha)

  async function aplicar() {
    if (!fecha) { setError('Ingresá la fecha.'); return }
    if (aplica.length === 0) { setError('No hay empleados activos para esa fecha.'); return }
    setSaving(true)
    try {
      await run('Registrando día no laborable…', () =>
        upsertAsistencias(aplica.map((e) => ({ empleado_id: e.id, fecha, estado: 'no_laborable' as const, observaciones: obs.trim() || null }))))
      await qc.invalidateQueries()
      toast.success(`Día no laborable registrado para ${aplica.length} empleado(s).`)
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Feriado / día no laborable general" onClose={onClose} busy={saving} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={aplicar} loading={saving}>Aplicar a todos</Button></>}>
      <div className="grid gap-4">
        <Field label="Fecha" required error={error} htmlFor="f-fecha"><Input id="f-fecha" type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setError('') }} invalid={!!error} /></Field>
        <Field label="Motivo" htmlFor="f-obs"><Input id="f-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={100} /></Field>
        <p className="text-sm text-steel-600">Se marcará como <strong>no laborable</strong> a <strong>{aplica.length}</strong> empleado(s) activo(s). Si ya tenían otro estado ese día, se reemplaza. No cuenta como ausencia.</p>
      </div>
    </Modal>
  )
}

export default function AsistenciaPage() {
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { run } = useBusy()
  const [params, setParams] = useSearchParams()
  const cur = currentPeriod()

  const anio = Number(params.get('anio')) || cur.anio
  const mes = Number(params.get('mes')) || cur.mes
  const empleadoId = params.get('empleado') ?? ''

  const empQ = useQuery({ queryKey: ['empleados'], queryFn: fetchEmpleados })
  const empleado = empQ.data?.find((e) => e.id === empleadoId)
  const asisQ = useQuery({
    queryKey: ['asistencias', empleadoId, anio, mes],
    queryFn: () => fetchAsistenciasMes(empleadoId, anio, mes),
    enabled: !!empleadoId,
  })

  const [dia, setDia] = useState<string | null>(null)
  const [feriado, setFeriado] = useState(false)
  const [completar, setCompletar] = useState(false)

  const setParam = (k: string, v: string) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p, { replace: true }) }
  const moverMes = (d: number) => {
    let m = mes + d, a = anio
    if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ }
    const p = new URLSearchParams(params); p.set('mes', String(m)); p.set('anio', String(a)); setParams(p, { replace: true })
  }

  const hoy = todayAR()
  const porFecha = useMemo(() => new Map((asisQ.data ?? []).map((a) => [a.fecha, a])), [asisQ.data])
  const editable = can('asistencias', 'crear') && can('asistencias', 'editar')

  const calc = useMemo(() => {
    if (!empleado) return null
    const total = daysInMonth(anio, mes)
    let programados = 0, trabajados = 0, ausentes = 0, justificados = 0
    const pendientesCompletar: string[] = []
    for (let d = 1; d <= total; d++) {
      const iso = toIso(anio, mes, d)
      const reg = porFecha.get(iso)
      const programado = empleado.dias_laborales.includes(isoDow(iso)) && reg?.estado !== 'no_laborable'
      if (!programado || iso < empleado.fecha_ingreso) continue
      programados++
      if (reg?.estado === 'trabajado') trabajados++
      else if (reg?.estado === 'ausente') ausentes++
      else if (reg?.estado === 'justificado') justificados++
      else if (iso <= hoy) pendientesCompletar.push(iso)
    }
    const sinRegistro = programados - trabajados - ausentes - justificados
    return { programados, trabajados, ausentes, justificados, sinRegistro, pendientesCompletar }
  }, [empleado, porFecha, anio, mes, hoy])

  const offset = isoDow(toIso(anio, mes, 1)) - 1
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth(anio, mes) }, (_, i) => i + 1)]

  const anios = Array.from({ length: 6 }, (_, i) => cur.anio - 4 + i)

  return (
    <>
      <PageHeader title="Asistencia" subtitle="Calendario mensual por empleado."
        actions={can('asistencias', 'crear') && can('asistencias', 'editar') && (
          <Button variant="outline" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setFeriado(true)} disabled={!empQ.data?.length}>Feriado general</Button>
        )} />

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <Select value={empleadoId} onChange={(e) => setParam('empleado', e.target.value)} aria-label="Empleado">
          <option value="">Seleccioná un empleado…</option>
          {(empQ.data ?? []).filter((e) => e.activo || e.id === empleadoId).map((e) => <option key={e.id} value={e.id}>{e.nombre_completo}</option>)}
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" onClick={() => moverMes(-1)} aria-label="Mes anterior" className="px-2.5"><ChevronLeft className="h-4 w-4" /></Button>
          <Select value={mes} onChange={(e) => setParam('mes', e.target.value)} aria-label="Mes">{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
          <Button variant="outline" onClick={() => moverMes(1)} aria-label="Mes siguiente" className="px-2.5"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Select value={anio} onChange={(e) => setParam('anio', e.target.value)} aria-label="Año">{anios.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
      </Card>

      {empQ.isLoading ? <PageLoader /> : empQ.error ? <ErrorState message={friendlyError(empQ.error)} onRetry={() => void empQ.refetch()} /> :
        !empleado ? <Card><EmptyState title="Elegí un empleado para ver su calendario" message={(empQ.data ?? []).length === 0 ? 'Primero registrá empleados en la sección Empleados.' : undefined} /></Card> : (
          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <Card className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">{MESES[mes - 1]} {anio}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel-600">
                  {ESTADOS.map((s) => <span key={s.k} className="flex items-center gap-1.5"><span className={clsx('h-2.5 w-2.5 rounded-full', s.dot)} />{s.label}</span>)}
                </div>
              </div>
              {asisQ.isLoading ? <PageLoader /> : asisQ.error ? <ErrorState message={friendlyError(asisQ.error)} onRetry={() => void asisQ.refetch()} /> : (
                <>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase text-steel-500 sm:gap-2">
                    {DIAS_CORTOS.map((d) => <div key={d} className="pb-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {celdas.map((d, i) => {
                      if (d === null) return <div key={`v${i}`} />
                      const iso = toIso(anio, mes, d)
                      const reg = porFecha.get(iso)
                      const programado = empleado.dias_laborales.includes(isoDow(iso))
                      const previo = iso < empleado.fecha_ingreso
                      return (
                        <button key={iso} disabled={previo || !editable} onClick={() => setDia(iso)}
                          title={previo ? 'Anterior a la fecha de ingreso' : reg ? ESTADO_MAP[reg.estado].label : programado ? 'Sin registro' : 'Día no habitual de trabajo'}
                          className={clsx('flex aspect-square flex-col items-center justify-center rounded-lg border text-sm font-bold transition disabled:cursor-not-allowed',
                            reg ? ESTADO_MAP[reg.estado].cell : programado ? 'border-steel-300 bg-white hover:border-brand-500 hover:bg-brand-300/20' : 'border-dashed border-steel-200 bg-steel-50 text-steel-400 hover:bg-steel-100',
                            previo && 'opacity-40', iso === hoy && 'ring-2 ring-brand-500')}>
                          {d}
                          {reg && <span className="hidden text-[9px] font-semibold uppercase sm:block">{ESTADO_MAP[reg.estado].label.slice(0, 4)}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs text-steel-500">Tocá un día para marcarlo. Los días con borde punteado no son días habituales de trabajo de este empleado y no se computan en el sueldo.</p>
                </>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="p-5">
                <h3 className="mb-3 font-bold">Resumen del mes</h3>
                {calc && (
                  <dl className="space-y-2 text-sm">
                    {([['Días programados', calc.programados], ['Trabajados', calc.trabajados], ['Ausentes', calc.ausentes], ['Justificados', calc.justificados], ['Sin registro', calc.sinRegistro]] as const).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-steel-100 pb-2 last:border-0"><dt className="text-steel-600">{k}</dt><dd className={clsx('font-extrabold', k === 'Sin registro' && v > 0 && 'text-brand-600')}>{v}</dd></div>
                    ))}
                  </dl>
                )}
                <p className="mt-3 text-xs text-steel-500">Valores orientativos: el cálculo definitivo se hace en Sueldos.</p>
              </Card>
              {editable && calc && calc.pendientesCompletar.length > 0 && (
                <Card className="p-5">
                  <h3 className="mb-1 font-bold">Carga rápida</h3>
                  <p className="mb-3 text-sm text-steel-600">Hay {calc.pendientesCompletar.length} día(s) programado(s) ya transcurridos sin registro.</p>
                  <Button variant="dark" className="w-full" icon={<CheckCheck className="h-4 w-4" />} onClick={() => setCompletar(true)}>Marcarlos como trabajados</Button>
                </Card>
              )}
            </div>
          </div>
        )}

      {dia && empleado && <DiaModal empleado={empleado} fecha={dia} registro={porFecha.get(dia)} onClose={() => setDia(null)} />}
      {feriado && <FeriadoModal empleados={empQ.data ?? []} onClose={() => setFeriado(false)} />}
      {completar && empleado && calc && (
        <ConfirmDialog title="Completar asistencia" confirmLabel="Marcar como trabajados"
          message={<>Se marcarán como <strong>trabajados</strong> {calc.pendientesCompletar.length} día(s) programado(s) de <strong>{empleado.nombre_completo}</strong> que no tienen registro. Podés corregir cada día después.</>}
          onCancel={() => setCompletar(false)}
          onConfirm={async () => {
            try {
              await run('Guardando asistencias…', () => upsertAsistencias(calc.pendientesCompletar.map((f) => ({ empleado_id: empleado.id, fecha: f, estado: 'trabajado' as const, observaciones: null }))))
              await qc.invalidateQueries()
              toast.success('Asistencias registradas.')
            } catch (err) { toast.error(friendlyError(err)) }
            setCompletar(false)
          }} />
      )}
    </>
  )
}
