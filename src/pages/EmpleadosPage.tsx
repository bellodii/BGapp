import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Input, PageHeader, PageLoader, Select } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { deleteEmpleado, fetchEmpleados, updateEmpleado } from '@/api/empleados'
import { friendlyError } from '@/lib/errors'
import { formatARS, norm } from '@/lib/format'
import { DIAS_CORTOS, DIAS_LARGOS } from '@/lib/dates'
import type { EmpleadoResumen } from '@/types/db'
import { EmpleadoFormModal } from '@/features/empleados/EmpleadoFormModal'

export function DiasChips({ dias }: { dias: number[] }) {
  return (
    <div className="flex gap-0.5">
      {DIAS_CORTOS.map((c, i) => (
        <span key={c} title={DIAS_LARGOS[i]}
          className={dias.includes(i + 1) ? 'flex h-5 w-5 items-center justify-center rounded bg-brand-400 text-[10px] font-bold text-ink-950' : 'flex h-5 w-5 items-center justify-center rounded bg-steel-100 text-[10px] text-steel-400'}>
          {c}
        </span>
      ))}
    </div>
  )
}

export default function EmpleadosPage() {
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['empleados'], queryFn: fetchEmpleados })

  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos')
  const [tipo, setTipo] = useState<'todos' | 'mensual' | 'diario'>('todos')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<EmpleadoResumen | null>(null)
  const [toggling, setToggling] = useState<EmpleadoResumen | null>(null)
  const [deleting, setDeleting] = useState<EmpleadoResumen | null>(null)

  const filtrados = useMemo(() => {
    const n = norm(q)
    return (data ?? []).filter((e) =>
      (estado === 'todos' || (estado === 'activos') === e.activo) &&
      (tipo === 'todos' || e.tipo_remuneracion === tipo) &&
      (!n || norm(e.nombre_completo).includes(n)))
  }, [data, q, estado, tipo])

  return (
    <>
      <PageHeader title="Empleados" subtitle="Altas, bajas lógicas, remuneración y deudas."
        actions={can('empleados', 'crear') && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nuevo empleado</Button>} />

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
          <Input className="pl-9" placeholder="Buscar por nombre o apellido…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar empleados" />
        </div>
        <Select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} aria-label="Filtrar por estado">
          <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
        </Select>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Filtrar por remuneración">
          <option value="todos">Toda remuneración</option><option value="mensual">Sueldo mensual</option><option value="diario">Pago por día</option>
        </Select>
      </Card>

      <Card>
        {isLoading ? <PageLoader /> : error ? <div className="p-4"><ErrorState message={friendlyError(error)} onRetry={() => void refetch()} /></div> :
          filtrados.length === 0 ? (
            <EmptyState title={(data ?? []).length === 0 ? 'Todavía no hay empleados registrados' : 'No hay empleados que coincidan'}
              action={(data ?? []).length === 0 && can('empleados', 'crear') ? <Button onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" />}>Nuevo empleado</Button> : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                  <tr><th className="px-5 py-3">Empleado</th><th className="px-3 py-3">Remuneración</th><th className="px-3 py-3">Días</th><th className="px-3 py-3">Deuda pendiente</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {filtrados.map((e) => (
                    <tr key={e.id} className="hover:bg-steel-50/60">
                      <td className="px-5 py-3"><Link to={`/empleados/${e.id}`} className="font-semibold hover:underline">{e.nombre_completo}</Link></td>
                      <td className="px-3 py-3">
                        {e.tipo_remuneracion === 'mensual'
                          ? <><span className="font-semibold">{formatARS(e.sueldo_mensual)}</span><span className="block text-xs text-steel-500">Sueldo mensual</span></>
                          : <><span className="font-semibold">{formatARS(e.valor_diario)}</span><span className="block text-xs text-steel-500">Por día trabajado</span></>}
                      </td>
                      <td className="px-3 py-3"><DiasChips dias={e.dias_laborales} /></td>
                      <td className="px-3 py-3">{e.deuda_total_pendiente > 0 ? <span className="font-semibold text-red-700">{formatARS(e.deuda_total_pendiente)}</span> : <span className="text-steel-400">—</span>}</td>
                      <td className="px-3 py-3"><Badge tone={e.activo ? 'green' : 'gray'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Link to={`/empleados/${e.id}`}><IconButton label="Ver ficha" icon={<Eye className="h-4 w-4" />} /></Link>
                        {can('empleados', 'editar') && <IconButton label="Editar" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(e)} />}
                        {can('empleados', 'editar') && <IconButton label={e.activo ? 'Desactivar' : 'Activar'} icon={<Power className="h-4 w-4" />} onClick={() => setToggling(e)} />}
                        {can('empleados', 'eliminar') && <IconButton label="Eliminar" tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(e)} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {creating && <EmpleadoFormModal empleado={null} onClose={() => setCreating(false)} />}
      {editing && <EmpleadoFormModal empleado={editing} onClose={() => setEditing(null)} />}
      {toggling && (
        <ConfirmDialog title={toggling.activo ? 'Desactivar empleado' : 'Activar empleado'} confirmLabel={toggling.activo ? 'Desactivar' : 'Activar'} danger={toggling.activo}
          message={toggling.activo
            ? <>¿Desactivar a <strong>{toggling.nombre_completo}</strong>? Se conserva todo su historial (asistencias, deudas y liquidaciones).</>
            : <>¿Volver a activar a <strong>{toggling.nombre_completo}</strong>?</>}
          onCancel={() => setToggling(null)}
          onConfirm={async () => {
            try { await updateEmpleado(toggling.id, { activo: !toggling.activo }); await qc.invalidateQueries(); toast.success(toggling.activo ? 'Empleado desactivado.' : 'Empleado activado.') }
            catch (err) { toast.error(friendlyError(err)) }
            setToggling(null)
          }} />
      )}
      {deleting && (
        <ConfirmDialog danger title="Eliminar empleado" confirmLabel="Eliminar"
          message={<>¿Eliminar definitivamente a <strong>{deleting.nombre_completo}</strong>? Solo es posible si no tiene asistencias, deudas ni liquidaciones; en caso contrario, usá <em>Desactivar</em>.</>}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try { await deleteEmpleado(deleting.id); await qc.invalidateQueries(); toast.success('Empleado eliminado.') }
            catch (err) { toast.error(friendlyError(err, { fk: 'Este empleado tiene historial (asistencias, deudas o liquidaciones) y no puede eliminarse. Desactivalo para conservar los registros.' })) }
            setDeleting(null)
          }} />
      )}
    </>
  )
}
