interface PgLike { code?: string; message?: string }

/** Convierte errores de Supabase/Postgres en mensajes claros para el usuario. */
export function friendlyError(err: unknown, opts?: { fk?: string }): string {
  const e = (err ?? {}) as PgLike
  const msg = e.message ?? 'Ocurrió un error inesperado.'

  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.'
  if (/JWT expired|invalid JWT/i.test(msg)) return 'Tu sesión expiró. Volvé a iniciar sesión.'

  switch (e.code) {
    case '42501':
      return /row-level security|permission denied/i.test(msg) ? 'No tenés permisos para realizar esta acción.' : msg
    case '23503':
      return opts?.fk ?? 'No se puede completar: el registro tiene información relacionada.'
    case '23505':
      return /liquidaci/i.test(msg) ? msg : 'Ya existe un registro con esos datos.'
    case '23514':
      return /violates check constraint/i.test(msg) ? 'Alguno de los datos ingresados no es válido.' : msg
    case '22P02':
    case '22003':
      return 'Alguno de los valores ingresados no es válido.'
    default:
      return msg
  }
}
