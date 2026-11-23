import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Banknote, Calculator, CheckCircle2, Clock, Eye, Wallet, XCircle } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, PageHeader, PageLoader, Select, StatCard } from '@/components/ui'
import { fetchEmpleados } from '@/api/empleados'
import { fetchLiquidacionesPeriodo, fetchResumenPeriodo } from '@/api/liquidaciones'
import { friendlyError } from '@/lib/errors'
import { formatARS } from '@/lib/format'
import { MESES, currentPeriod, daysInMonth, toIso } from '@/lib/dates'
import type { EmpleadoResumen, LiquidacionResumen } from '@/types/db'
import { LiquidarModal } from '@/features/sueldos/LiquidarModal'
import { AnularLiquidacionModal, DetalleLiquidacionModal, PagarLiquidacionModal } from '@/features/sueldos/LiquidacionModals'

export default function SueldosPage() {
  const { can } = useAuth()
  const cur = currentPeriod()
  const [anio, setAnio] = useState(cur.anio)
  const [mes, setMes] = useState(cur.mes)

  const empQ = useQuery({ queryKey: ['empleados'], queryFn: fetchEmpleados })
  const liqQ = useQuery({ queryKey: ['liq-periodo', anio, mes], queryFn: () => fetchLiquidacionesPeriodo(anio, mes) })
  const resQ = useQuery({ queryKey: ['res-periodo', anio, mes], queryFn: () => fetchResumenPeriodo(anio, mes) })

  const [liquidando, setLiquidando] = useState<EmpleadoResumen | null>(null)
  const [detalle, setDetalle] = useState<LiquidacionResumen | null>(null)
  const [pagando, setPagando] = useState<LiquidacionResumen | null>(null)
  const [anulando, setAnulando] = useState<LiquidacionResumen | null>(null)

  const finMes = toIso(anio, mes, daysInMonth(anio, mes))
  const liqPorEmp = useMemo(() => new Map((liqQ.data ?? []).map((l) => [l.empleado_id, l])), [liqQ.data])
  const lista = useMemo(
    () => (empQ.data ?? []).filter((e) => e.fecha_ingreso <= finMes && (e.activo || liqPorEmp.has(e.id))),
    [empQ.data, finMes, liqPorEmp],
  )
  const anios = Array.from({ length: 6 }, (_, i) => cur.anio - 4 + i)
  const loading = empQ.isLoading || liqQ.isLoading
  const error = empQ.error ?? liqQ.error
  const r = resQ.data

  return (
    <>
      <PageHeader title="Sueldos" subtitle="Liquidación mensual con cálculo automático. Podés consultar meses anteriores." />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <Select className="!w-auto" value={mes} onChange={(e) => setMes(Number(e.target.value))} aria-label="Mes">{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
        <Select className="!w-auto" value={anio} onChange={(e) => setAnio(Number(e.target.value))} aria-label="Año">{anios.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
        <span className="text-sm text-steel-500">Período: <strong className="text-ink-900">{MESES[mes - 1]} {anio}</strong></span>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Total neto del mes" value={formatARS(r?.total_neto ?? 0)} sub={`${r?.liquidaciones ?? 0} liquidación(es)`} accent />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Pagado" value={formatARS(r?.total_pagado ?? 0)} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Pendiente de pago" value={formatARS(r?.total_pendiente ?? 0)} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Descuento de deudas" value={formatARS(r?.total_desc_deudas ?? 0)} sub={`Ausencias: ${formatARS(r?.total_desc_ausencias ?? 0)}`} />
      </div>

      <Card>
        {loading ? <PageLoader /> : error ? <div className="p-4"><ErrorState message={friendlyError(error)} onRetry={() => { void empQ.refetch(); void liqQ.refetch() }} /></div> :
          lista.length === 0 ? <EmptyState title="No hay empleados para liquidar en este período" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                  <tr><th className="px-5 py-3">Empleado</th><th className="px-3 py-3">Remuneración</th><th className="px-3 py-3">Deuda pendiente</th><th className="px-3 py-3">Neto</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {lista.map((e) => {
                    const l = liqPorEmp.get(e.id)
                    return (
                      <tr key={e.id} className="hover:bg-steel-50/60">
                        <td className="px-5 py-3"><Link to={`/empleados/${e.id}`} className="font-semibold hover:underline">{e.nombre_completo}</Link>{!e.activo && <span className="ml-2"><Badge>Inactivo</Badge></span>}</td>
                        <td className="px-3 py-3">{e.tipo_remuneracion === 'mensual' ? `${formatARS(e.sueldo_mensual)} / mes` : `${formatARS(e.valor_diario)} / día`}</td>
                        <td className="px-3 py-3">{e.deuda_total_pendiente > 0 ? <span className="font-semibold text-red-700">{formatARS(e.deuda_total_pendiente)}</span> : '—'}</td>
                        <td className="px-3 py-3 font-extrabold">{l ? formatARS(l.sueldo_neto) : '—'}</td>
                        <td className="px-3 py-3">{!l ? <Badge>Sin liquidar</Badge> : l.estado === 'pagado' ? <Badge tone="green">Pagado</Badge> : <Badge tone="yellow">Pendiente de pago</Badge>}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          {!l && can('liquidaciones', 'crear') && <Button size="sm" icon={<Calculator className="h-4 w-4" />} onClick={() => setLiquidando(e)}>Liquidar</Button>}
                          {l && <IconButton label="Ver detalle" icon={<Eye className="h-4 w-4" />} onClick={() => setDetalle(l)} />}
                          {l?.estado === 'pendiente' && can('liquidaciones', 'editar') && <Button size="sm" variant="dark" className="ml-1" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setPagando(l)}>Marcar pagado</Button>}
                          {l?.estado === 'pendiente' && can('liquidaciones', 'editar') && <IconButton label="Anular liquidación" tone="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setAnulando(l)} />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {liquidando && <LiquidarModal empleado={liquidando} anio={anio} mes={mes} onClose={() => setLiquidando(null)} />}
      {detalle && <DetalleLiquidacionModal liq={detalle} onClose={() => setDetalle(null)} />}
      {pagando && <PagarLiquidacionModal liq={pagando} onClose={() => setPagando(null)} />}
      {anulando && <AnularLiquidacionModal liq={anulando} onClose={() => setAnulando(null)} />}
    </>
  )
}
