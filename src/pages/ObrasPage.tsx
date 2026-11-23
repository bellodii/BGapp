import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HardHat, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Input, PageHeader, PageLoader, ProgressBar, Select } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { deleteObra, fetchObras } from '@/api/obras'
import { friendlyError } from '@/lib/errors'
import { formatNumber, formatPercent, norm, unidadLabel } from '@/lib/format'
import type { EstadoObra, ObraResumen } from '@/types/db'
import { ESTADO_OBRA_LABEL, ObraFormModal } from '@/features/obras/ObraFormModal'

export const ESTADO_TONE = { pendiente: 'gray', en_ejecucion: 'yellow', finalizada: 'green' } as const

export default function ObrasPage() {
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['obras'], queryFn: fetchObras })

  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'todos' | EstadoObra>('todos')
  const [unidad, setUnidad] = useState<'todas' | 'hectareas' | 'vanos'>('todas')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ObraResumen | null>(null)
  const [deleting, setDeleting] = useState<ObraResumen | null>(null)

  const filtradas = useMemo(() => {
    const n = norm(q)
    return (data ?? []).filter((o) =>
      (estado === 'todos' || o.estado === estado) &&
      (unidad === 'todas' || o.unidad_medida === unidad) &&
      (!n || norm(`${o.nombre} ${o.cliente} ${o.ubicacion}`).includes(n)))
  }, [data, q, estado, unidad])

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteObra(deleting.id)
      await qc.invalidateQueries()
      toast.success('Obra eliminada.')
      setDeleting(null)
    } catch (err) {
      toast.error(friendlyError(err, { fk: 'La obra tiene avances registrados y no puede eliminarse. Eliminá primero sus avances o marcala como finalizada para conservar el historial.' }))
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader title="Obras" subtitle="Seguimiento de obras, avances y progreso."
        actions={can('obras', 'crear') && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nueva obra</Button>} />

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input className="pl-9" placeholder="Buscar por nombre, cliente o ubicación…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar obras" />
        </div>
        <Select value={estado} onChange={(e) => setEstado(e.target.value as 'todos' | EstadoObra)} aria-label="Filtrar por estado">
          <option value="todos">Todos los estados</option>
          {(Object.keys(ESTADO_OBRA_LABEL) as EstadoObra[]).map((k) => <option key={k} value={k}>{ESTADO_OBRA_LABEL[k]}</option>)}
        </Select>
        <Select value={unidad} onChange={(e) => setUnidad(e.target.value as 'todas' | 'hectareas' | 'vanos')} aria-label="Filtrar por unidad">
          <option value="todas">Hectáreas y vanos</option>
          <option value="hectareas">Hectáreas</option>
          <option value="vanos">Vanos</option>
        </Select>
      </Card>

      {isLoading ? <PageLoader /> : error ? <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} /> :
        filtradas.length === 0 ? (
          <Card><EmptyState title={(data ?? []).length === 0 ? 'Todavía no hay obras registradas' : 'No hay obras que coincidan con la búsqueda'}
            message={(data ?? []).length === 0 ? 'Creá la primera obra para empezar a registrar avances.' : 'Probá con otros filtros.'}
            action={(data ?? []).length === 0 && can('obras', 'crear') ? <Button onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" />}>Nueva obra</Button> : undefined} /></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtradas.map((o) => (
              <Card key={o.id} className="flex animate-fade-in flex-col p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/obras/${o.id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-ink-900 hover:underline">{o.nombre}</h3>
                    <p className="truncate text-sm text-steel-500">{o.cliente}</p>
                  </Link>
                  <Badge tone={ESTADO_TONE[o.estado]}>{ESTADO_OBRA_LABEL[o.estado]}</Badge>
                </div>
                {o.ubicacion && <p className="mt-2 flex items-center gap-1.5 text-xs text-steel-500"><MapPin className="h-3.5 w-3.5" />{o.ubicacion}</p>}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold">{formatPercent(o.porcentaje_completado)}</span>
                    <span className="text-xs text-steel-500">{formatNumber(o.cantidad_realizada)} / {formatNumber(o.cantidad_contratada)} {unidadLabel(o.unidad_medida)}</span>
                  </div>
                  <ProgressBar percent={o.porcentaje_completado} />
                  <p className="mt-1.5 text-xs text-steel-500">Pendiente: {formatNumber(o.cantidad_pendiente)} {unidadLabel(o.unidad_medida)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-steel-100 pt-3">
                  <Link to={`/obras/${o.id}`}><Button variant="dark" size="sm" icon={<HardHat className="h-4 w-4" />}>Ver avances</Button></Link>
                  <div className="flex">
                    {can('obras', 'editar') && <IconButton label="Editar obra" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(o)} />}
                    {can('obras', 'eliminar') && <IconButton label="Eliminar obra" tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(o)} />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {creating && <ObraFormModal obra={null} onClose={() => setCreating(false)} />}
      {editing && <ObraFormModal obra={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog danger title="Eliminar obra" confirmLabel="Eliminar"
          message={<>¿Eliminar la obra <strong>{deleting.nombre}</strong>? Esta acción no se puede deshacer.</>}
          onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
      )}
    </>
  )
}
