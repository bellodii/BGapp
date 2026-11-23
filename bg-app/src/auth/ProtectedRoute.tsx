import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Accion, Modulo } from './types'

interface Props {
  /** Exige permiso sobre ese módulo (el super_admin siempre pasa). */
  modulo?: Modulo
  accion?: Accion
  /** Solo el administrador principal. */
  soloSuperAdmin?: boolean
}

/**
 * Protege rutas. Ojo: esto es solo experiencia de usuario; la seguridad real
 * la aplican las políticas RLS en la base de datos.
 */
export function ProtectedRoute({ modulo, accion = 'ver', soloSuperAdmin }: Props) {
  const { status, can, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (status === 'loading') return null // el splash de arranque cubre esta espera
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (soloSuperAdmin && !isSuperAdmin) return <Navigate to="/sin-permiso" replace />
  if (modulo && !can(modulo, accion)) return <Navigate to="/sin-permiso" replace />
  return <Outlet />
}
