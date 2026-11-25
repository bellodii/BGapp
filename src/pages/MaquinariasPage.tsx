import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Clock, Pencil, Plus, Search, Trash2, Truck, Wrench } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Input, PageHeader, PageLoader, Select, StatCard } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { deleteMaquinaria, fetchMaquinarias } from '@/api/maquinarias'
import { friendlyError } from '@/lib/errors'
import { formatNumber, norm } from '@/lib/format'
import { formatDate } from '@/lib/dates'
import { calcularService, compararUrgencia, TIPO_LABEL, type EstadoService } from '@/lib/maquinaria'
import type { MaquinariaResumen, TipoMaquinaria } from '@/types/db'
import { MaquinariaFormModal } from '@/features/maquinarias/MaquinariaFormModal'
import { HorasModal, ServiceModal } from '@/features/maquinarias/MaquinariaModals'
import { ESTADO_SERVICE_LABEL, ESTADO_SERVICE_TONE } from '@/features/maquinarias/shared'

export default function MaquinariasPage() {
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['maquinarias'], queryFn: fetchMaquinarias })

  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<'todos' | TipoMaquinaria>('todos')
  const [estado, setEstado] = useState<'todos' | EstadoService>('todos')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<MaquinariaResumen | null>(null)
  const [deleting, setDeleting] = useState<MaquinariaResumen | null>(null)
  const [horasDe, setHorasDe] = useState<MaquinariaResumen | null>(null)
  const [serviceDe, setServiceDe] = useState<MaquinariaResumen | null>(null)

  const items = useMemo(() => (data ?? []).map((m) => ({ m, c: calcularService(m) })).sort(compararUrgencia), [data])
  const activas = items.filter((x) => x.m.activa)
  const vencidas = activas.filter((x) => x.c.estado === 'vencido').length
  const proximas = activas.filter((x) => x.c.estado === 'proximo').length

  const filtradas = useMemo(() => {
    const n = norm(q)
    return items.filter(({ m, c }) =>
      (tipo === 'todos' || m.tipo === tipo) &&
      (estado === 'todos' || c.estado === estado) &&
      (!n || norm(`${m.marca} ${m.modelo} ${m.identificador} ${TIPO_LABEL[m.tipo]}`).includes(n)))
  }, [items, q, tipo, estado])

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteMaquinaria(deleting.id)
      await qc.invalidateQueries()
      toast.success('Maquinaria eliminada.')
    } catch (err) {
      toast.error(friendlyError(err))
    }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader title="Maquinarias" subtitle="Horas de trabajo y control de services."
        actions={can('maquinarias', 'crear') && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nueva maquinaria</Button>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Truck className="h-5 w-5" />} label="Activas" value={activas.length} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Services vencidos" value={vencidas} accent={vencidas > 0} />
        <StatCard icon={<Wrench className="h-5 w-5" />} label="Services próximos" value={proximas} />
      </div>

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input className="pl-9" placeholder="Buscar por marca, modelo, patente o tipo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar maquinarias" />
        </div>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'todos' | TipoMaquinaria)} aria-label="Filtrar por tipo">
          <option value="todos">Todos los tipos</option>
          {(Object.keys(TIPO_LABEL) as TipoMaquinaria[]).map((k) => <option key={k} value={k}>{TIPO_LABEL[k]}</option>)}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value as 'todos' | EstadoService)} aria-label="Filtrar por estado">
          <option value="todos">Todos los estados</option>
          {(Object.keys(ESTADO_SERVICE_LABEL) as EstadoService[]).map((k) => <option key={k} value={k}>{ESTADO_SERVICE_LABEL[k]}</option>)}
        </Select>
      </Card>

      {isLoading ? <PageLoader /> : error ? <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} /> :
        filtradas.length === 0 ? (
          <Card><EmptyState title={items.length === 0 ? 'Todavía no hay maquinarias registradas' : 'No hay maquinarias que coincidan con la búsqueda'}
            message={items.length === 0 ? 'Agregá la primera para controlar sus horas y services.' : 'Probá con otros filtros.'}
            action={items.length === 0 && can('maquinarias', 'crear') ? <Button onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" />}>Nueva maquinaria</Button> : undefined} /></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtradas.map(({ m, c }) => (
              <Card key={m.id} className="flex animate-fade-in flex-col p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/maquinarias/${m.id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-ink-900 hover:underline">{m.marca} {m.modelo}</h3>
                    <p className="truncate text-sm text-steel-500">{TIPO_LABEL[m.tipo]}{m.identificador ? ` · ${m.identificador}` : ''}</p>
                  </Link>
                  {m.activa ? <Badge tone={ESTADO_SERVICE_TONE[c.estado]}>{ESTADO_SERVICE_LABEL[c.estado]}</Badge> : <Badge tone="dark">Inactiva</Badge>}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-steel-500">Horómetro</dt><dd className="font-bold">{formatNumber(c.horometro)} h</dd></div>
                  <div><dt className="text-xs text-steel-500">Desde último service</dt><dd className="font-bold">{formatNumber(c.horasDesdeService)} / {formatNumber(m.intervalo_horas)} h</dd></div>
                  <div className="col-span-2">
                    <dt className="text-xs text-steel-500">Próximo service</dt>
                    <dd className="font-bold">
                      {c.fechaProxima ? `${formatDate(c.fechaProxima)}${c.motivo ? ` (por ${c.motivo})` : ''}` : '—'}
                      {c.horasRestantes > 0
                        ? <span className="ml-1 text-xs font-normal text-steel-500">faltan {formatNumber(c.horasRestantes)} h</span>
                        : <span className="ml-1 text-xs font-normal text-red-600">pasado por {formatNumber(-c.horasRestantes)} h</span>}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-steel-100 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {can('maquinarias', 'editar') && <Button size="sm" variant="dark" icon={<Clock className="h-4 w-4" />} onClick={() => setHorasDe(m)}>Horas</Button>}
                    {can('maquinarias', 'editar') && <Button size="sm" variant="outline" icon={<Wrench className="h-4 w-4" />} onClick={() => setServiceDe(m)}>Service</Button>}
                    {!can('maquinarias', 'editar') && <Link to={`/maquinarias/${m.id}`}><Button size="sm" variant="outline">Ver detalle</Button></Link>}
                  </div>
                  <div className="flex">
                    {can('maquinarias', 'editar') && <IconButton label="Editar" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(m)} />}
                    {can('maquinarias', 'eliminar') && <IconButton label="Eliminar" tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(m)} />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {creating && <MaquinariaFormModal maquinaria={null} onClose={() => setCreating(false)} />}
      {editing && <MaquinariaFormModal maquinaria={editing} onClose={() => setEditing(null)} />}
      {horasDe && <HorasModal maquinaria={horasDe} onClose={() => setHorasDe(null)} />}
      {serviceDe && <ServiceModal maquinaria={serviceDe} onClose={() => setServiceDe(null)} />}
      {deleting && (
        <ConfirmDialog danger title="Eliminar maquinaria" confirmLabel="Eliminar"
          message={<>¿Eliminar <strong>{deleting.marca} {deleting.modelo}</strong>? Se borran también sus horas y services. Si solo está fuera de servicio, es mejor marcarla como inactiva.</>}
          onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
      )}
    </>
  )
}
