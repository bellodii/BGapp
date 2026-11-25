import { affected, ok, one, rows, supabase } from '@/lib/supabase'
import type { MaquinariaHoras, MaquinariaResumen, MaquinariaService, TipoMaquinaria } from '@/types/db'

export const fetchMaquinarias = async () =>
  rows<MaquinariaResumen>(await supabase.from('vista_maquinarias_resumen').select('*').order('marca'))

export const fetchMaquinaria = async (id: string) =>
  one<MaquinariaResumen>(await supabase.from('vista_maquinarias_resumen').select('*').eq('id', id).maybeSingle())

export interface MaquinariaInput {
  tipo: TipoMaquinaria
  marca: string
  modelo: string
  identificador: string | null
  anio: number | null
  horas_iniciales: number
  horas_por_dia: number
  dias_por_semana: number
  intervalo_horas: number
  intervalo_meses: number | null
  activa: boolean
  notas: string | null
}

export const createMaquinaria = async (i: MaquinariaInput) => ok(await supabase.from('maquinarias').insert(i))
export const updateMaquinaria = async (id: string, i: Partial<MaquinariaInput>) =>
  affected(await supabase.from('maquinarias').update(i).eq('id', id).select('id'))
export const deleteMaquinaria = async (id: string) =>
  affected(await supabase.from('maquinarias').delete().eq('id', id).select('id'))

export const fetchHoras = async (maquinariaId: string) =>
  rows<MaquinariaHoras>(await supabase.from('maquinaria_horas').select('*').eq('maquinaria_id', maquinariaId).order('fecha', { ascending: false }).limit(200))

/** Un registro por máquina y fecha: si ya existe, lo reemplaza. */
export const upsertHoras = async (i: { maquinaria_id: string; fecha: string; horas: number; observaciones: string | null }) =>
  ok(await supabase.from('maquinaria_horas').upsert(i, { onConflict: 'maquinaria_id,fecha' }))
export const deleteHoras = async (id: string) =>
  affected(await supabase.from('maquinaria_horas').delete().eq('id', id).select('id'))

export const fetchServices = async (maquinariaId: string) =>
  rows<MaquinariaService>(await supabase.from('maquinaria_services').select('*').eq('maquinaria_id', maquinariaId).order('horometro', { ascending: false }).order('fecha', { ascending: false }))
export const createService = async (i: { maquinaria_id: string; fecha: string; horometro: number; descripcion: string | null }) =>
  ok(await supabase.from('maquinaria_services').insert(i))
export const deleteService = async (id: string) =>
  affected(await supabase.from('maquinaria_services').delete().eq('id', id).select('id'))
