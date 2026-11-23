import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, IconButton, PageHeader, PageLoader, ProgressBar } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { deleteAvance, deleteObra, fetchAvances, fetchObra, updateObra } from '@/api/obras'
import { fetchProfiles } from '@/api/admin'
import { friendlyError } from '@/lib/errors'
import { formatNumber, formatPercent, unidadLabel } from '@/lib/format'
import { formatDate } from '@/lib/dates'
import type { AvanceObra } from '@/types/db'
import { ESTADO_OBRA_LABEL, ObraFormModal } from '@/features/obras/ObraFormModal'
import { AvanceFormModal } from '@/features/obras/AvanceFormModal'
import { ESTADO_TONE } from './ObrasPage'

export default function ObraDetailPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const obraQ = useQuery({ queryKey: ['obra', id], queryFn: () => fetchObra(id) })
  const avancesQ = useQuery({ queryKey: ['avances', id], queryFn: () => fetchAvances(id), enabled: can('avances', 'ver') })
  const profilesQ = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles })

  const [newAvance, setNewAvance] = useState(false)
  const [editAvance, setEditAvance] = useState<AvanceObra | null>(null)
  const [delAvance, setDelAvance] = useState<AvanceObra | null>(null)
  const [editObra, setEditObra] = useState(false)
  const [delObra, setDelObra] = useState(false)

  const obra = obraQ.data
  const back = (
    <Link to="/obras" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-steel-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" /> Volver a obras
    </Link>
  )

  if (obraQ.isLoading) return <PageLoader />
  if (obraQ.error) return <ErrorState message={friendlyError(obraQ.error)} onRetry={() => void obraQ.refetch()} />
  if (!obra) return <>{back}<Card><EmptyState title="La obra no existe o no tenés acceso a ella." /></Card></>

  const unidad = unidadLabel(obra.unidad_medida)
  const nombreDe = (uid: string | null) => {
    const p = profilesQ.data?.find((x) => x.id === uid)
    return p ? `${p.nombre} ${p.apellido}` : '—'
  }

  async function finalizar() {
    try {
      await updateObra(id, { estado: 'finalizada' })
      await qc.invalidateQueries()
      toast.success('Obra marcada como finalizada.')
    } catch (err) { toast.error(friendlyError(err)) }
  }

  return (
    <>
      <PageHeader back={back} title={obra.nombre}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{obra.cliente}<Badge tone={ESTADO_TONE[obra.estado]}>{ESTADO_OBRA_LABEL[obra.estado]}</Badge></span>}
        actions={<>
          {can('obras', 'editar') && <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditObra(true)}>Editar</Button>}
          {can('obras', 'eliminar') && <Button variant="outline" icon={<Trash2 className="h-4 w-4 text-red-600" />} onClick={() => setDelObra(true)}>Eliminar</Button>}
        </>} />

      <Card className="mb-5 p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">Progreso de la obra</p>
            <p className="text-4xl font-extrabold">{formatPercent(obra.porcentaje_completado)}</p>
          </div>
          {obra.porcentaje_completado >= 100 && obra.estado !== 'finalizada' && can('obras', 'editar') && (
            <Button size="sm" variant="dark" icon={<CheckCircle2 className="h-4 w-4" />} onClick={finalizar}>La obra llegó al 100 %: marcar como finalizada</Button>
          )}
        </div>
        <ProgressBar percent={obra.porcentaje_completado} size="lg" />
        <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ['Total contratado', obra.cantidad_contratada],
            ['Realizado', obra.cantidad_realizada],
            ['Pendiente', obra.cantidad_pendiente],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl bg-steel-50 p-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-steel-500">{k}</dt>
              <dd className="mt-1 text-xl font-extrabold">{formatNumber(Number(v))} <span className="text-sm font-semibold text-steel-500">{unidad}</span></dd>
            </div>
          ))}
          <div className="rounded-xl bg-steel-50 p-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-steel-500">Avances registrados</dt>
            <dd className="mt-1 text-xl font-extrabold">{obra.cantidad_avances}</dd>
          </div>
        </dl>
        {obra.cantidad_excedente > 0 && (
          <p className="mt-4 rounded-lg bg-brand-300/20 px-3 py-2 text-sm text-ink-800">
            Se registró un excedente de <strong>{formatNumber(obra.cantidad_excedente)} {unidad}</strong> por encima de lo contratado (la barra se limita al 100 %).
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="h-fit p-5 lg:order-2">
          <h3 className="mb-3 font-bold">Datos de la obra</h3>
          <dl className="space-y-3 text-sm">
            {obra.ubicacion && <div><dt className="flex items-center gap-1 text-xs font-semibold uppercase text-steel-500"><MapPin className="h-3 w-3" />Ubicación</dt><dd>{obra.ubicacion}</dd></div>}
            <div><dt className="text-xs font-semibold uppercase text-steel-500">Inicio</dt><dd>{formatDate(obra.fecha_inicio)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-steel-500">Finalización estimada</dt><dd>{formatDate(obra.fecha_fin_estimada)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-steel-500">Unidad de trabajo</dt><dd className="capitalize">{unidad}</dd></div>
            {obra.descripcion && <div><dt className="text-xs font-semibold uppercase text-steel-500">Descripción</dt><dd className="whitespace-pre-line">{obra.descripcion}</dd></div>}
          </dl>
        </Card>

        <Card className="lg:order-1 lg:col-span-2">
          <CardHeader title="Historial de avances"
            action={can('avances', 'crear') && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setNewAvance(true)}>Registrar avance</Button>} />
          {!can('avances', 'ver') ? <EmptyState title="No tenés permiso para ver los avances." /> :
            avancesQ.isLoading ? <PageLoader /> :
            avancesQ.error ? <div className="p-4"><ErrorState message={friendlyError(avancesQ.error)} onRetry={() => void avancesQ.refetch()} /></div> :
            (avancesQ.data ?? []).length === 0 ? <EmptyState title="Todavía no hay avances registrados" message="Registrá el primer avance diario de esta obra." /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                    <tr><th className="px-5 py-2.5">Fecha</th><th className="px-3 py-2.5">Cantidad</th><th className="px-3 py-2.5">Observaciones</th><th className="px-3 py-2.5">Registró</th><th className="px-3 py-2.5" /></tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100">
                    {avancesQ.data!.map((a) => (
                      <tr key={a.id} className="hover:bg-steel-50/60">
                        <td className="whitespace-nowrap px-5 py-3 font-semibold">{formatDate(a.fecha)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{formatNumber(a.cantidad_realizada)} {unidad}</td>
                        <td className="max-w-xs px-3 py-3 text-steel-600">{a.observaciones || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-steel-600">{nombreDe(a.registrado_por)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          {can('avances', 'editar') && <IconButton label="Editar avance" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditAvance(a)} />}
                          {can('avances', 'eliminar') && <IconButton label="Eliminar avance" tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDelAvance(a)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      </div>

      {newAvance && <AvanceFormModal obra={obra} avance={null} onClose={() => setNewAvance(false)} />}
      {editAvance && <AvanceFormModal obra={obra} avance={editAvance} onClose={() => setEditAvance(null)} />}
      {editObra && <ObraFormModal obra={obra} onClose={() => setEditObra(false)} />}
      {delAvance && (
        <ConfirmDialog danger title="Eliminar avance" confirmLabel="Eliminar"
          message={<>¿Eliminar el avance del <strong>{formatDate(delAvance.fecha)}</strong> ({formatNumber(delAvance.cantidad_realizada)} {unidad})? Los totales y la barra de progreso se recalcularán.</>}
          onCancel={() => setDelAvance(null)}
          onConfirm={async () => {
            try { await deleteAvance(delAvance.id); await qc.invalidateQueries(); toast.success('Avance eliminado.') }
            catch (err) { toast.error(friendlyError(err)) }
            setDelAvance(null)
          }} />
      )}
      {delObra && (
        <ConfirmDialog danger title="Eliminar obra" confirmLabel="Eliminar"
          message={<>¿Eliminar la obra <strong>{obra.nombre}</strong>? Esta acción no se puede deshacer.</>}
          onCancel={() => setDelObra(false)}
          onConfirm={async () => {
            try { await deleteObra(obra.id); await qc.invalidateQueries(); toast.success('Obra eliminada.'); navigate('/obras', { replace: true }) }
            catch (err) {
              toast.error(friendlyError(err, { fk: 'La obra tiene avances registrados y no puede eliminarse. Eliminá primero sus avances o marcala como finalizada.' }))
              setDelObra(false)
            }
          }} />
      )}
    </>
  )
}
