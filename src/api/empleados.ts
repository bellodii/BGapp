import { affected, ok, one, rows, supabase } from '@/lib/supabase'
import type {
  AsistenciaMensual, Deuda, EmpleadoResumen, LiquidacionResumen, MovimientoDeuda, TipoRemuneracion,
} from '@/types/db'

export const fetchEmpleados = async () =>
  rows<EmpleadoResumen>(await supabase.from('vista_empleados_resumen').select('*').order('apellido').order('nombre'))

export const fetchEmpleado = async (id: string) =>
  one<EmpleadoResumen>(await supabase.from('vista_empleados_resumen').select('*').eq('id', id).maybeSingle())

export interface EmpleadoInput {
  nombre: string
  apellido: string
  fecha_ingreso: string
  tipo_remuneracion: TipoRemuneracion
  sueldo_mensual: number | null
  valor_diario: number | null
  dias_laborales: number[]
  descontar_justificados: boolean
  observaciones: string | null
  activo: boolean
}

export const createEmpleado = async (i: EmpleadoInput) => ok(await supabase.from('empleados').insert(i))
export const updateEmpleado = async (id: string, i: Partial<EmpleadoInput>) =>
  affected(await supabase.from('empleados').update(i).eq('id', id).select('id'))
export const deleteEmpleado = async (id: string) =>
  affected(await supabase.from('empleados').delete().eq('id', id).select('id'))

// ---- Deudas (escritura únicamente por RPC) ----
export const fetchDeudas = async (empleadoId: string) =>
  rows<Deuda>(await supabase.from('deudas_empleados').select('*').eq('empleado_id', empleadoId).order('fecha', { ascending: false }))

export const fetchMovimientos = async (deudaId: string) =>
  rows<MovimientoDeuda>(await supabase.from('movimientos_deudas').select('*').eq('deuda_id', deudaId).order('created_at', { ascending: false }))

export const registrarDeuda = async (p: { empleadoId: string; descripcion: string; importe: number; fecha: string }) =>
  ok(await supabase.rpc('registrar_deuda', {
    p_empleado_id: p.empleadoId, p_descripcion: p.descripcion, p_importe: p.importe, p_fecha: p.fecha,
  }))

export const registrarPagoDeuda = async (p: { deudaId: string; importe: number; descripcion: string | null; fecha: string }) =>
  ok(await supabase.rpc('registrar_movimiento_deuda', {
    p_deuda_id: p.deudaId, p_tipo: 'pago', p_importe: p.importe, p_descripcion: p.descripcion, p_fecha: p.fecha,
  }))

// ---- Historial del empleado ----
export const fetchLiquidacionesEmpleado = async (empleadoId: string) =>
  rows<LiquidacionResumen>(
    await supabase.from('vista_liquidaciones_resumen').select('*').eq('empleado_id', empleadoId)
      .order('anio', { ascending: false }).order('mes', { ascending: false }),
  )

export const fetchAsistenciasMensualesEmpleado = async (empleadoId: string) =>
  rows<AsistenciaMensual>(
    await supabase.from('vista_asistencias_mensuales').select('*').eq('empleado_id', empleadoId)
      .order('anio', { ascending: false }).order('mes', { ascending: false }),
  )
