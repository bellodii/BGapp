import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { History, KeyRound, Plus, Power } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import type { Profile } from '@/auth/types'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, PageHeader, PageLoader } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { fetchProfiles, setProfileActivo } from '@/api/admin'
import { friendlyError } from '@/lib/errors'
import { formatDate } from '@/lib/dates'
import { CrearAdminModal, PermisosModal } from '@/features/admin/AdminModals'

export default function AdministradoresPage() {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles, staleTime: 0 })
  const [creating, setCreating] = useState(false)
  const [permisos, setPermisos] = useState<Profile | null>(null)
  const [toggling, setToggling] = useState<Profile | null>(null)

  return (
    <>
      <PageHeader title="Administradores" subtitle="Solo visible para el administrador principal."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nuevo administrador</Button>} />
      <Card>
        {isLoading ? <PageLoader /> : error ? <div className="p-4"><ErrorState message={friendlyError(error)} onRetry={() => void refetch()} /></div> :
          !data?.length ? <EmptyState title="No hay administradores" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                  <tr><th className="px-5 py-3">Administrador</th><th className="px-3 py-3">Rol</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Alta</th><th className="px-3 py-3 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {data.map((p) => {
                    const yo = p.id === user?.id
                    const principal = p.rol === 'super_admin'
                    return (
                      <tr key={p.id} className="hover:bg-steel-50/60">
                        <td className="px-5 py-3"><p className="font-semibold">{p.nombre} {p.apellido}{yo && <span className="ml-2 text-xs font-normal text-steel-500">(vos)</span>}</p><p className="text-xs text-steel-500">{p.email}</p></td>
                        <td className="px-3 py-3"><Badge tone={principal ? 'dark' : 'blue'}>{principal ? 'Administrador principal' : 'Administrador'}</Badge></td>
                        <td className="px-3 py-3"><Badge tone={p.activo ? 'green' : 'red'}>{p.activo ? 'Activo' : 'Desactivado'}</Badge></td>
                        <td className="px-3 py-3">{formatDate(p.created_at)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <Link to={`/historial?usuario=${p.id}`}><IconButton label="Ver actividad" icon={<History className="h-4 w-4" />} /></Link>
                          {!principal && <IconButton label="Permisos" icon={<KeyRound className="h-4 w-4" />} onClick={() => setPermisos(p)} />}
                          {!yo && <IconButton label={p.activo ? 'Desactivar cuenta' : 'Activar cuenta'} tone={p.activo ? 'danger' : 'default'} icon={<Power className="h-4 w-4" />} onClick={() => setToggling(p)} />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      <p className="mt-3 text-xs text-steel-500">Las cuentas no se eliminan: se desactivan para conservar el registro de quién realizó cada operación.</p>

      {creating && <CrearAdminModal onClose={() => setCreating(false)} />}
      {permisos && <PermisosModal perfil={permisos} onClose={() => setPermisos(null)} />}
      {toggling && (
        <ConfirmDialog danger={toggling.activo} title={toggling.activo ? 'Desactivar cuenta' : 'Activar cuenta'} confirmLabel={toggling.activo ? 'Desactivar' : 'Activar'}
          message={toggling.activo ? <>¿Desactivar la cuenta de <strong>{toggling.nombre} {toggling.apellido}</strong>? Perderá el acceso de inmediato, aunque tenga una sesión abierta.</> : <>¿Activar la cuenta de <strong>{toggling.nombre} {toggling.apellido}</strong>?</>}
          onCancel={() => setToggling(null)}
          onConfirm={async () => {
            try { await setProfileActivo(toggling.id, !toggling.activo); await qc.invalidateQueries(); toast.success(toggling.activo ? 'Cuenta desactivada.' : 'Cuenta activada.') }
            catch (err) { toast.error(friendlyError(err)) }
            setToggling(null)
          }} />
      )}
    </>
  )
}
