import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, HandCoins, Pencil, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageLoader } from '@/components/ui'
import { fetchAsistenciasMensualesEmpleado, fetchDeudas, fetchEmpleado, fetchLiquidacionesEmpleado, fetchMovimientos } from '@/api/empleados'
import { friendlyError } from '@/lib/errors'
import { formatARS } from '@/lib/format'
import { formatDate, MESES } from '@/lib/dates'
import type { Deuda } from '@/types/db'
import { EmpleadoFormModal } from '@/features/empleados/EmpleadoFormModal'
import { DeudaFormModal, PagoDeudaModal } from '@/features/empleados/DeudaModals'
import { DiasChips } from './EmpleadosPage'

type Tab = 'resumen' | 'deudas' | 'liquidaciones' | 'asistencia'
const DEUDA_TONE = { pendiente: 'red', parcial: 'yellow', pagada: 'green' } as const
const LIQ_TONE = { pendiente: 'yellow', pagado: 'green', anulada: 'gray' } as const

function MovimientosDeuda({ deudaId }: { deudaId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['movimientos', deudaId], queryFn: () => fetchMovimientos(deudaId) })
  if (isLoading) return <p className="px-5 py-3 text-sm text-steel-500">Cargando movimientos…</p>
  if (error) return <p className="px-5 py-3 text-sm text-red-700">{friendlyError(error)}</p>
  if (!data?.length) return <p className="px-5 py-3 text-sm text-steel-500">Sin movimientos todavía.</p>
  return (
    <ul className="divide-y divide-steel-100 bg-steel-50 px-5 text-sm">
      {data.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><Badge tone={m.tipo === 'descuento' ? 'blue' : m.tipo === 'pago' ? 'green' : 'gray'}>{m.tipo === 'descuento' ? 'Descuento de sueldo' : m.tipo === 'pago' ? 'Pago' : 'Ajuste'}</Badge> <span className="ml-1 text-steel-600">{m.descripcion ?? ''}</span></span>
          <span className="font-semibold">{formatDate(m.fecha)} · {formatARS(m.importe)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function EmpleadoDetailPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('resumen')
  const [editing, setEditing] = useState(false)
  const [newDeuda, setNewDeuda] = useState(false)
  const [pagando, setPagando] = useState<Deuda | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)

  const empQ = useQuery({ queryKey: ['empleado', id], queryFn: () => fetchEmpleado(id) })
  const deudasQ = useQuery({ queryKey: ['deudas', id], queryFn: () => fetchDeudas(id), enabled: tab === 'deudas' || tab === 'resumen' })
  const liqQ = useQuery({ queryKey: ['liq-emp', id], queryFn: () => fetchLiquidacionesEmpleado(id), enabled: tab === 'liquidaciones' })
  const asisQ = useQuery({ queryKey: ['asis-emp', id], queryFn: () => fetchAsistenciasMensualesEmpleado(id), enabled: tab === 'asistencia' })

  const back = (
    <Link to="/empleados" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-steel-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" /> Volver a empleados
    </Link>
  )
  if (empQ.isLoading) return <PageLoader />
  if (empQ.error) return <ErrorState message={friendlyError(empQ.error)} onRetry={() => void empQ.refetch()} />
  const e = empQ.data
  if (!e) return <>{back}<Card><EmptyState title="El empleado no existe o no tenés acceso." /></Card></>

  const TABS: [Tab, string][] = [['resumen', 'Ficha'], ['deudas', 'Deudas'], ['liquidaciones', 'Liquidaciones'], ['asistencia', 'Asistencia']]

  return (
    <>
      <PageHeader back={back} title={e.nombre_completo}
        subtitle={<span className="inline-flex items-center gap-2"><Badge tone={e.activo ? 'green' : 'gray'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge>Ingresó el {formatDate(e.fecha_ingreso)}</span>}
        actions={can('empleados', 'editar') && <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>Editar</Button>} />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-steel-200" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={clsx('whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition', tab === k ? 'bg-ink-900 text-white' : 'text-steel-600 hover:bg-steel-100')}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 font-bold">Datos del empleado</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-steel-500">Tipo de remuneración</dt><dd className="font-semibold">{e.tipo_remuneracion === 'mensual' ? 'Sueldo mensual fijo' : 'Pago por día trabajado'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-steel-500">{e.tipo_remuneracion === 'mensual' ? 'Sueldo mensual' : 'Valor por día'}</dt><dd className="font-semibold">{formatARS(e.tipo_remuneracion === 'mensual' ? e.sueldo_mensual : e.valor_diario)}</dd></div>
              <div className="col-span-2"><dt className="mb-1 text-xs font-semibold uppercase text-steel-500">Días habituales de trabajo</dt><dd><DiasChips dias={e.dias_laborales} /></dd></div>
              <div className="col-span-2"><dt className="text-xs font-semibold uppercase text-steel-500">Días justificados</dt><dd>{e.descontar_justificados ? 'Se descuentan como ausencias' : 'No se descuentan'}</dd></div>
              {e.observaciones && <div className="col-span-2"><dt className="text-xs font-semibold uppercase text-steel-500">Observaciones</dt><dd className="whitespace-pre-line">{e.observaciones}</dd></div>}
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 font-bold">Deudas con la empresa</h3>
            <p className="text-3xl font-extrabold">{formatARS(e.deuda_total_pendiente)}</p>
            <p className="mt-1 text-sm text-steel-500">{e.deudas_pendientes_cantidad} deuda(s) con saldo pendiente</p>
            <Button className="mt-4" variant="dark" size="sm" onClick={() => setTab('deudas')}>Ver detalle de deudas</Button>
          </Card>
        </div>
      )}

      {tab === 'deudas' && (
        <Card>
          <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
            <h3 className="font-bold">Deudas</h3>
            {can('deudas', 'crear') && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setNewDeuda(true)}>Registrar deuda</Button>}
          </div>
          {!can('deudas', 'ver') ? <EmptyState title="No tenés permiso para ver las deudas." /> :
            deudasQ.isLoading ? <PageLoader /> : deudasQ.error ? <div className="p-4"><ErrorState message={friendlyError(deudasQ.error)} /></div> :
            !deudasQ.data?.length ? <EmptyState title="Este empleado no tiene deudas registradas" /> : (
              <ul className="divide-y divide-steel-100">
                {deudasQ.data.map((d) => (
                  <li key={d.id}>
                    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <button onClick={() => setAbierta(abierta === d.id ? null : d.id)} className="text-steel-500 hover:text-ink-900" aria-label="Ver movimientos" aria-expanded={abierta === d.id}>
                        {abierta === d.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{d.descripcion}</p>
                        <p className="text-xs text-steel-500">{formatDate(d.fecha)} · Original {formatARS(d.importe_original)}</p>
                      </div>
                      <div className="text-right"><p className="font-extrabold">{formatARS(d.saldo_pendiente)}</p><p className="text-xs text-steel-500">saldo</p></div>
                      <Badge tone={DEUDA_TONE[d.estado]}>{d.estado === 'pendiente' ? 'Pendiente' : d.estado === 'parcial' ? 'Parcial' : 'Pagada'}</Badge>
                      {can('deudas', 'editar') && d.saldo_pendiente > 0 && (
                        <Button size="sm" variant="outline" icon={<HandCoins className="h-4 w-4" />} onClick={() => setPagando(d)}>Registrar pago</Button>
                      )}
                    </div>
                    {abierta === d.id && <MovimientosDeuda deudaId={d.id} />}
                  </li>
                ))}
              </ul>
            )}
          <p className="border-t border-steel-100 px-5 py-3 text-xs text-steel-500">Los descuentos de sueldo se aplican al generar una liquidación, desde la sección Sueldos.</p>
        </Card>
      )}

      {tab === 'liquidaciones' && (
        <Card>
          {!can('liquidaciones', 'ver') ? <EmptyState title="No tenés permiso para ver las liquidaciones." /> :
            liqQ.isLoading ? <PageLoader /> : liqQ.error ? <div className="p-4"><ErrorState message={friendlyError(liqQ.error)} /></div> :
            !liqQ.data?.length ? <EmptyState title="Todavía no hay liquidaciones" message="Se generan desde la sección Sueldos." /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                    <tr><th className="px-5 py-3">Período</th><th className="px-3 py-3">Bruto</th><th className="px-3 py-3">Desc. ausencias</th><th className="px-3 py-3">Desc. deudas</th><th className="px-3 py-3">Neto</th><th className="px-3 py-3">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100">
                    {liqQ.data.map((l) => (
                      <tr key={l.id}>
                        <td className="px-5 py-3 font-semibold">{MESES[l.mes - 1]} {l.anio}</td>
                        <td className="px-3 py-3">{formatARS(l.sueldo_bruto)}</td>
                        <td className="px-3 py-3">{formatARS(l.descuentos_ausencias)}</td>
                        <td className="px-3 py-3">{formatARS(l.descuentos_deudas)}</td>
                        <td className="px-3 py-3 font-extrabold">{formatARS(l.sueldo_neto)}</td>
                        <td className="px-3 py-3"><Badge tone={LIQ_TONE[l.estado]}>{l.estado === 'pagado' ? `Pagado ${formatDate(l.fecha_pago)}` : l.estado === 'pendiente' ? 'Pendiente de pago' : 'Anulada'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}

      {tab === 'asistencia' && (
        <Card>
          {!can('asistencias', 'ver') ? <EmptyState title="No tenés permiso para ver las asistencias." /> :
            asisQ.isLoading ? <PageLoader /> : asisQ.error ? <div className="p-4"><ErrorState message={friendlyError(asisQ.error)} /></div> :
            !asisQ.data?.length ? <EmptyState title="Todavía no hay asistencias registradas" /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                    <tr><th className="px-5 py-3">Mes</th><th className="px-3 py-3">Trabajados</th><th className="px-3 py-3">Ausentes</th><th className="px-3 py-3">Justificados</th><th className="px-3 py-3">No laborables</th><th className="px-3 py-3" /></tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100">
                    {asisQ.data.map((a) => (
                      <tr key={`${a.anio}-${a.mes}`}>
                        <td className="px-5 py-3 font-semibold">{MESES[a.mes - 1]} {a.anio}</td>
                        <td className="px-3 py-3">{a.dias_trabajados}</td><td className="px-3 py-3">{a.dias_ausentes}</td>
                        <td className="px-3 py-3">{a.dias_justificados}</td><td className="px-3 py-3">{a.dias_no_laborables}</td>
                        <td className="px-3 py-3 text-right"><Link to={`/asistencia?empleado=${id}&anio=${a.anio}&mes=${a.mes}`}><Button size="sm" variant="outline" icon={<CalendarDays className="h-4 w-4" />}>Calendario</Button></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}

      {editing && <EmpleadoFormModal empleado={e} onClose={() => setEditing(false)} />}
      {newDeuda && <DeudaFormModal empleadoId={id} onClose={() => setNewDeuda(false)} />}
      {pagando && <PagoDeudaModal deuda={pagando} onClose={() => setPagando(null)} />}
    </>
  )
}
