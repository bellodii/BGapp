import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Gauge, Pencil, Trash2, Wrench } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, IconButton, PageHeader, PageLoader, ProgressBar, StatCard } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { deleteHoras, deleteMaquinaria, deleteService, fetchHoras, fetchMaquinaria, fetchServices } from '@/api/maquinarias'
import { friendlyError } from '@/lib/errors'
import { formatNumber } from '@/lib/format'
import { formatDate } from '@/lib/dates'
import { calcularService, INTERVALO_DEFECTO, TIPO_LABEL } from '@/lib/maquinaria'
import type { MaquinariaHoras, MaquinariaService } from '@/types/db'
import { MaquinariaFormModal } from '@/features/maquinarias/MaquinariaFormModal'
import { HorasModal, HorometroModal, ServiceModal } from '@/features/maquinarias/MaquinariaModals'
import { ESTADO_SERVICE_LABEL, ESTADO_SERVICE_TONE } from '@/features/maquinarias/shared'

export default function MaquinariaDetailPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const maqQ = useQuery({ queryKey: ['maquinaria', id], queryFn: () => fetchMaquinaria(id) })
  const horasQ = useQuery({ queryKey: ['maquinaria-horas', id], queryFn: () => fetchHoras(id) })
  const servQ = useQuery({ queryKey: ['maquinaria-services', id], queryFn: () => fetchServices(id) })

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [horas, setHoras] = useState(false)
  const [service, setService] = useState(false)
  const [horometro, setHorometro] = useState(false)
  const [delHoras, setDelHoras] = useState<MaquinariaHoras | null>(null)
  const [delServ, setDelServ] = useState<MaquinariaService | null>(null)

  const m = maqQ.data
  const c = useMemo(() => (m ? calcularService(m) : null), [m])

  const back = (
    <Link to="/maquinarias" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-steel-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" /> Volver a maquinarias
    </Link>
  )

  if (maqQ.isLoading) return <PageLoader />
  if (maqQ.error) return <ErrorState message={friendlyError(maqQ.error)} onRetry={() => void maqQ.refetch()} />
  if (!m || !c) return <>{back}<Card><EmptyState title="La maquinaria no existe o no tenés acceso a ella." /></Card></>

  const puedeEditar = can('maquinarias', 'editar')
  const pct = m.intervalo_horas > 0 ? (c.horasDesdeService / m.intervalo_horas) * 100 : 0

  async function run(fn: () => Promise<void>, okMsg: string) {
    try { await fn(); await qc.invalidateQueries(); toast.success(okMsg) } catch (err) { toast.error(friendlyError(err)) }
  }

  return (
    <>
      <PageHeader back={back} title={`${m.marca} ${m.modelo}`}
        subtitle={<>{TIPO_LABEL[m.tipo]}{m.identificador ? ` · ${m.identificador}` : ''}{m.anio ? ` · ${m.anio}` : ''} {m.activa ? <Badge tone={ESTADO_SERVICE_TONE[c.estado]}>{ESTADO_SERVICE_LABEL[c.estado]}</Badge> : <Badge tone="dark">Inactiva</Badge>}</>}
        actions={<>
          {puedeEditar && <Button icon={<Clock className="h-4 w-4" />} onClick={() => setHoras(true)}>Cargar horas</Button>}
          {puedeEditar && <Button variant="dark" icon={<Wrench className="h-4 w-4" />} onClick={() => setService(true)}>Registrar service</Button>}
          {puedeEditar && <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>Editar</Button>}
          {can('maquinarias', 'eliminar') && <Button variant="outline" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(true)}>Eliminar</Button>}
        </>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Gauge className="h-5 w-5" />} label="Horómetro" value={`${formatNumber(c.horometro)} h`}
          sub={puedeEditar ? <button className="font-semibold underline" onClick={() => setHorometro(true)}>Ajustar lectura</button> : undefined} />
        <StatCard icon={<Wrench className="h-5 w-5" />} label="Último service"
          value={m.ultimo_service_fecha ? formatDate(m.ultimo_service_fecha) : 'Nunca'}
          sub={m.ultimo_service_horometro != null ? `a las ${formatNumber(m.ultimo_service_horometro)} h` : 'Sin service registrado'} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Próximo service" accent={c.estado === 'vencido'}
          value={c.fechaProxima ? formatDate(c.fechaProxima) : '—'}
          sub={c.motivo ? `Por ${c.motivo}${c.diasHastaProximo != null ? (c.diasHastaProximo < 0 ? ` · hace ${-c.diasHastaProximo} días` : ` · en ${c.diasHastaProximo} días`) : ''}` : 'Cargá horas por semana para estimarlo'} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Horas reales" value={`${formatNumber(m.horas_7d)} h`} sub={`últimos 7 días · ${formatNumber(m.horas_30d)} h en 30 días`} />
      </div>

      <Card className="mb-5 p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-bold">Desde el último service: {formatNumber(c.horasDesdeService)} de {formatNumber(m.intervalo_horas)} h
            {m.intervalo_meses ? ` (o ${m.intervalo_meses} meses)` : ''}</p>
          <p className={c.horasRestantes > 0 ? 'text-sm text-steel-500' : 'text-sm font-semibold text-red-600'}>
            {c.horasRestantes > 0 ? `Faltan ${formatNumber(c.horasRestantes)} h` : `Pasado por ${formatNumber(-c.horasRestantes)} h`}
          </p>
        </div>
        <ProgressBar percent={pct} size="lg" />
        <p className="mt-3 text-xs text-steel-500">
          Estimación con {formatNumber(m.horas_por_dia)} h/día × {formatNumber(m.dias_por_semana)} días/semana = {formatNumber(c.horasPorSemana)} h/semana.
          {c.fechaPorHoras && c.fechaPorMeses && ` Por horas: ${formatDate(c.fechaPorHoras)} · por meses: ${formatDate(c.fechaPorMeses)} (se toma la primera).`}
          {c.sinService && ' Todavía no hay un service registrado: se cuentan las horas cargadas en la app.'}
        </p>
        {m.tipo === 'camion' && <p className="mt-2 rounded-lg bg-brand-300/20 px-3 py-2 text-xs text-ink-800">{INTERVALO_DEFECTO.camion.nota}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Historial de services" />
          {(servQ.data ?? []).length === 0 ? <EmptyState title="Sin services registrados" /> : (
            <ul className="divide-y divide-steel-100">
              {(servQ.data ?? []).map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{formatDate(s.fecha)} · {formatNumber(s.horometro)} h</p>
                    {s.descripcion && <p className="text-sm text-steel-500">{s.descripcion}</p>}
                  </div>
                  {puedeEditar && <IconButton label="Eliminar service" tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDelServ(s)} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Horas trabajadas (últimos registros)" />
          {(horasQ.data ?? []).length === 0 ? <EmptyState title="Sin horas cargadas" message="Cargá las horas de cada día para que el horómetro y el aviso de service se mantengan al día." /> : (
            <ul className="max-h-96 divide-y divide-steel-100 overflow-y-auto">
              {(horasQ.data ?? []).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold">{formatDate(h.fecha)} · {formatNumber(h.horas)} h</p>
                    {h.observaciones && <p className="truncate text-xs text-steel-500">{h.observaciones}</p>}
                  </div>
                  {puedeEditar && <IconButton label="Eliminar registro" tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDelHoras(h)} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {m.notas && <p className="mt-4 text-sm text-steel-500"><strong className="text-ink-900">Notas:</strong> {m.notas}</p>}

      {editing && <MaquinariaFormModal maquinaria={m} onClose={() => setEditing(false)} />}
      {horas && <HorasModal maquinaria={m} onClose={() => setHoras(false)} />}
      {service && <ServiceModal maquinaria={m} onClose={() => setService(false)} />}
      {horometro && <HorometroModal maquinaria={m} onClose={() => setHorometro(false)} />}
      {delHoras && <ConfirmDialog danger title="Eliminar registro de horas" confirmLabel="Eliminar"
        message={<>¿Eliminar las {formatNumber(delHoras.horas)} h del {formatDate(delHoras.fecha)}? El horómetro bajará esa cantidad.</>}
        onConfirm={async () => { await run(() => deleteHoras(delHoras.id), 'Registro eliminado.'); setDelHoras(null) }} onCancel={() => setDelHoras(null)} />}
      {delServ && <ConfirmDialog danger title="Eliminar service" confirmLabel="Eliminar"
        message={<>¿Eliminar el service del {formatDate(delServ.fecha)}? El próximo aviso se calculará desde el service anterior.</>}
        onConfirm={async () => { await run(() => deleteService(delServ.id), 'Service eliminado.'); setDelServ(null) }} onCancel={() => setDelServ(null)} />}
      {deleting && <ConfirmDialog danger title="Eliminar maquinaria" confirmLabel="Eliminar"
        message={<>¿Eliminar <strong>{m.marca} {m.modelo}</strong> con todas sus horas y services?</>}
        onConfirm={async () => { try { await deleteMaquinaria(id); await qc.invalidateQueries(); toast.success('Maquinaria eliminada.'); navigate('/maquinarias', { replace: true }) } catch (err) { toast.error(friendlyError(err)); setDeleting(false) } }}
        onCancel={() => setDeleting(false)} />}
    </>
  )
}
