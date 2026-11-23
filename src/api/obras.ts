import { affected, ok, one, rows, supabase } from '@/lib/supabase'
import type { AvanceObra, EstadoObra, ObraResumen, UnidadMedida } from '@/types/db'

export const fetchObras = async () =>
  rows<ObraResumen>(await supabase.from('vista_obras_resumen').select('*').order('nombre'))

export const fetchObra = async (id: string) =>
  one<ObraResumen>(await supabase.from('vista_obras_resumen').select('*').eq('id', id).maybeSingle())

export interface ObraInput {
  nombre: string
  cliente: string
  ubicacion: string | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  unidad_medida: UnidadMedida
  cantidad_total: number
  estado: EstadoObra
}

export const createObra = async (i: ObraInput) => ok(await supabase.from('obras').insert(i))
export const updateObra = async (id: string, i: Partial<ObraInput>) =>
  affected(await supabase.from('obras').update(i).eq('id', id).select('id'))
export const deleteObra = async (id: string) =>
  affected(await supabase.from('obras').delete().eq('id', id).select('id'))

export const fetchAvances = async (obraId: string) =>
  rows<AvanceObra>(
    await supabase.from('avances_obras').select('*').eq('obra_id', obraId)
      .order('fecha', { ascending: false }).order('created_at', { ascending: false }),
  )

export const fetchAvancesRecientes = async (limit = 8) =>
  rows<AvanceObra>(await supabase.from('avances_obras').select('*').order('created_at', { ascending: false }).limit(limit))

export const fetchAvancesDesde = async (desde: string) =>
  rows<AvanceObra>(await supabase.from('avances_obras').select('*').gte('fecha', desde).order('fecha'))

export interface AvanceInput { obra_id: string; fecha: string; cantidad_realizada: number; observaciones: string | null }
export const createAvance = async (i: AvanceInput) => ok(await supabase.from('avances_obras').insert(i))
export const updateAvance = async (id: string, i: Partial<Omit<AvanceInput, 'obra_id'>>) =>
  affected(await supabase.from('avances_obras').update(i).eq('id', id).select('id'))
export const deleteAvance = async (id: string) =>
  affected(await supabase.from('avances_obras').delete().eq('id', id).select('id'))
