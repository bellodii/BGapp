import { createClient, type PostgrestError } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Creá el archivo .env.local (ver .env.example). Usá solo la clave anon/publishable, NUNCA la service_role.',
  )
}

// La sesión (JWT + refresh token) la guarda y renueva supabase-js: sobrevive a F5.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

type Res = { data: unknown; error: PostgrestError | null }

/** Devuelve las filas o lanza el error de Postgrest. */
export function rows<T>(res: Res): T[] {
  if (res.error) throw res.error
  return (res.data ?? []) as T[]
}
export function one<T>(res: Res): T | null {
  if (res.error) throw res.error
  return (res.data ?? null) as T | null
}
export function ok(res: { error: PostgrestError | null }): void {
  if (res.error) throw res.error
}
/** UPDATE/DELETE bajo RLS no falla si no hay permiso: afecta 0 filas. Esto lo convierte en error. */
export function affected(res: Res, mensaje = 'No se pudo completar la operación (sin permisos o el registro ya no existe).'): void {
  const r = rows<unknown>(res)
  if (r.length === 0) throw new Error(mensaje)
}
