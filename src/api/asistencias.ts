import { affected, ok, rows, supabase } from '@/lib/supabase'
import { daysInMonth, toIso } from '@/lib/dates'
import type { Asistencia, EstadoAsistencia } from '@/types/db'

export const fetchAsistenciasMes = async (empleadoId: string, anio: number, mes: number) =>
  rows<Asistencia>(
    await supabase.from('asistencias').select('*').eq('empleado_id', empleadoId)
      .gte('fecha', toIso(anio, mes, 1)).lte('fecha', toIso(anio, mes, daysInMonth(anio, mes))),
  )

export interface AsistenciaInput {
  empleado_id: string
  fecha: string
  estado: EstadoAsistencia
  observaciones: string | null
}

/** Alta o modificación (la restricción única empleado+fecha evita duplicados). */
export const upsertAsistencias = async (items: AsistenciaInput[]) =>
  ok(await supabase.from('asistencias').upsert(items, { onConflict: 'empleado_id,fecha' }))

export const deleteAsistencia = async (id: string) =>
  affected(await supabase.from('asistencias').delete().eq('id', id).select('id'))
