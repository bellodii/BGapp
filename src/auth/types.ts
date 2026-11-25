export type Rol = 'super_admin' | 'admin'

export type Modulo =
  | 'dashboard' | 'obras' | 'avances' | 'empleados'
  | 'asistencias' | 'deudas' | 'liquidaciones' | 'auditoria' | 'maquinarias'

export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar'

/** Fila de public.profiles (id = auth.users.id). */
export interface Profile {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: Rol
  activo: boolean
  created_at?: string
}

/** Fila devuelta por la función SQL public.mis_permisos(). */
export interface Permiso {
  modulo: Modulo
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}
