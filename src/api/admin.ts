import { FunctionsHttpError } from '@supabase/supabase-js'
import { affected, ok, rows, supabase } from '@/lib/supabase'
import type { Profile } from '@/auth/types'
import type { PermisoAdmin } from '@/types/db'

const COLS = 'id, nombre, apellido, email, rol, activo, created_at'

export const fetchProfiles = async () =>
  rows<Profile>(await supabase.from('profiles').select(COLS).order('created_at'))

export const fetchPermisos = async (profileId: string) =>
  rows<PermisoAdmin>(await supabase.from('permisos_admin').select('*').eq('profile_id', profileId))

export interface PermisoFila {
  modulo: string
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

/** Guarda la matriz de permisos: filas con todo en false se eliminan. */
export async function savePermisos(profileId: string, filas: PermisoFila[]) {
  const conAcceso = filas.filter((f) => f.puede_ver || f.puede_crear || f.puede_editar || f.puede_eliminar)
  const sinAcceso = filas.filter((f) => !conAcceso.includes(f)).map((f) => f.modulo)

  if (conAcceso.length > 0) {
    ok(await supabase.from('permisos_admin').upsert(
      conAcceso.map((f) => ({ profile_id: profileId, ...f })),
      { onConflict: 'profile_id,modulo' },
    ))
  }
  if (sinAcceso.length > 0) {
    ok(await supabase.from('permisos_admin').delete().eq('profile_id', profileId).in('modulo', sinAcceso))
  }
}

export const setProfileActivo = async (id: string, activo: boolean) =>
  affected(await supabase.from('profiles').update({ activo }).eq('id', id).select('id'))

export const updateMyProfile = async (id: string, nombre: string, apellido: string) =>
  affected(await supabase.from('profiles').update({ nombre, apellido }).eq('id', id).select('id'))

export const changeMyPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export interface NuevoAdmin {
  email: string
  password: string
  nombre: string
  apellido: string
  permisos: PermisoFila[]
}

/**
 * La creación de usuarios requiere la service_role, que NUNCA vive en el navegador:
 * se hace en la Edge Function "crear-administrador" (supabase/functions).
 */
export async function crearAdministrador(body: NuevoAdmin): Promise<void> {
  const { error } = await supabase.functions.invoke('crear-administrador', { body })
  if (!error) return
  if (error instanceof FunctionsHttpError) {
    try {
      const j = await error.context.json()
      if (j?.error) throw new Error(String(j.error))
    } catch (e) {
      if (e instanceof Error && e.message !== error.message) throw e
    }
  }
  throw new Error(
    'No se pudo crear el administrador. Verificá que la función "crear-administrador" esté desplegada en Supabase (ver README).',
  )
}
