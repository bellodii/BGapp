import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, PageLoader, Select } from '@/components/ui'
import { fetchAudit } from '@/api/audit'
import { fetchProfiles } from '@/api/admin'
import { fetchObras } from '@/api/obras'
import { fetchEmpleados } from '@/api/empleados'
import { friendlyError } from '@/lib/errors'
import { describeAudit, detallesCambios, ENTIDADES } from '@/lib/audit'
import { formatDateTime } from '@/lib/dates'

const PAGE = 25
const ACCION_TONE: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = { crear: 'green', generar: 'green', pagar: 'green', modificar: 'yellow', modificar_sueldo: 'yellow', eliminar: 'red', anular: 'red', baja: 'red', desactivar_admin: 'red' }

export default function HistorialPage() {
  const [params] = useSearchParams()
  const [entidad, setEntidad] = useState('')
  const [usuario, setUsuario] = useState(params.get('usuario') ?? '')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(0)
  const [abierto, setAbierto] = useState<string | null>(null)

  const auditQ = useQuery({ queryKey: ['audit', entidad, usuario, desde, hasta, page], queryFn: () => fetchAudit({ entidad, usuario, desde, hasta }, page, PAGE), staleTime: 0 })
  const profilesQ = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles })
  const obrasQ = useQuery({ queryKey: ['obras'], queryFn: fetchObras })
  const empQ = useQuery({ queryKey: ['empleados'], queryFn: fetchEmpleados })

  const lookups = useMemo(() => ({
    obras: new Map((obrasQ.data ?? []).map((o) => [o.id, o.nombre])),
    empleados: new Map((empQ.data ?? []).map((e) => [e.id, e.nombre_completo])),
    profiles: new Map((profilesQ.data ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`])),
  }), [obrasQ.data, empQ.data, profilesQ.data])

  const total = auditQ.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0) }

  return (
    <>
      <PageHeader title="Historial" subtitle="Registro de actividad: quién hizo cada operación y cuándo. Solo lectura." />
      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={entidad} onChange={(e) => reset(setEntidad)(e.target.value)} aria-label="Tipo de operación">
          <option value="">Todas las secciones</option>
          {Object.entries(ENTIDADES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Select value={usuario} onChange={(e) => reset(setUsuario)(e.target.value)} aria-label="Administrador">
          <option value="">Todos los administradores</option>
          {(profilesQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
        </Select>
        <Input type="date" value={desde} onChange={(e) => reset(setDesde)(e.target.value)} aria-label="Desde" />
        <Input type="date" value={hasta} onChange={(e) => reset(setHasta)(e.target.value)} aria-label="Hasta" />
      </Card>

      <Card>
        {auditQ.isLoading ? <PageLoader /> : auditQ.error ? <div className="p-4"><ErrorState message={friendlyError(auditQ.error)} onRetry={() => void auditQ.refetch()} /></div> :
          !auditQ.data?.items.length ? <EmptyState title="No hay actividad registrada con esos filtros" /> : (
            <ul className="divide-y divide-steel-100">
              {auditQ.data.items.map((l) => {
                const det = detallesCambios(l)
                const open = abierto === l.id
                return (
                  <li key={l.id}>
                    <button onClick={() => setAbierto(open ? null : l.id)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-steel-50/60" aria-expanded={open}>
                      <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-steel-400 transition ${open ? 'rotate-180' : ''}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900">{describeAudit(l, lookups)}</p>
                        <p className="mt-0.5 text-xs text-steel-500">{l.usuario_id ? lookups.profiles.get(l.usuario_id) ?? 'Administrador' : 'Sistema'} · {formatDateTime(l.fecha)}</p>
                      </div>
                      <span className="hidden gap-1.5 sm:flex"><Badge tone={ACCION_TONE[l.accion] ?? 'gray'}>{l.accion.replace('_', ' ')}</Badge><Badge>{ENTIDADES[l.entidad] ?? l.entidad}</Badge></span>
                    </button>
                    {open && (
                      <div className="bg-steel-50 px-5 py-3 pl-12 text-sm">
                        {det.length > 0 ? (
                          <ul className="space-y-1">{det.map((d) => <li key={d.campo}><span className="font-semibold">{d.campo}:</span> <span className="text-steel-500 line-through">{d.antes}</span> → <span className="font-semibold">{d.despues}</span></li>)}</ul>
                        ) : <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-steel-600">{JSON.stringify(l.metadata, null, 2)}</pre>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        <div className="flex items-center justify-between border-t border-steel-100 px-5 py-3 text-sm text-steel-600">
          <span>{total} registro(s)</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <span>Página {page + 1} de {pages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </>
  )
}
