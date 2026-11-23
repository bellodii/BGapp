import { ok, one, rows, supabase } from '@/lib/supabase'
import type {
  CalculoLiquidacion, Deuda, DetalleDescuento, LiquidacionResumen, PeriodoLiquidaciones,
} from '@/types/db'

export const fetchLiquidacionesPeriodo = async (anio: number, mes: number) =>
  rows<LiquidacionResumen>(
    await supabase.from('vista_liquidaciones_resumen').select('*').eq('anio', anio).eq('mes', mes).neq('estado', 'anulada'),
  )

export const fetchResumenPeriodo = async (anio: number, mes: number) =>
  one<PeriodoLiquidaciones>(await supabase.from('vista_liquidaciones_periodo').select('*').eq('anio', anio).eq('mes', mes).maybeSingle())

export const fetchUltimosPeriodos = async (limit = 6) =>
  rows<PeriodoLiquidaciones>(
    await supabase.from('vista_liquidaciones_periodo').select('*')
      .order('anio', { ascending: false }).order('mes', { ascending: false }).limit(limit),
  )

export async function calcularLiquidacion(empleadoId: string, mes: number, anio: number, descontarJustificados: boolean): Promise<CalculoLiquidacion | null> {
  const res = await supabase.rpc('calcular_liquidacion', {
    p_empleado_id: empleadoId, p_mes: mes, p_anio: anio, p_descontar_justificados: descontarJustificados,
  })
  return rows<CalculoLiquidacion>(res)[0] ?? null
}

export const fetchDeudasAbiertas = async (empleadoId: string) =>
  rows<Deuda>(
    await supabase.from('deudas_empleados').select('*').eq('empleado_id', empleadoId).gt('saldo_pendiente', 0).order('fecha'),
  )

export interface GenerarLiquidacionInput {
  empleadoId: string
  mes: number
  anio: number
  descuentos: { deuda_id: string; importe: number }[]
  descontarJustificados: boolean
  ignorarSinRegistro: boolean
}

export const generarLiquidacion = async (i: GenerarLiquidacionInput) =>
  ok(await supabase.rpc('generar_liquidacion', {
    p_empleado_id: i.empleadoId, p_mes: i.mes, p_anio: i.anio, p_descuentos: i.descuentos,
    p_descontar_justificados: i.descontarJustificados, p_ignorar_sin_registro: i.ignorarSinRegistro,
  }))

export const pagarLiquidacion = async (id: string, fechaPago: string) =>
  ok(await supabase.rpc('pagar_liquidacion', { p_id: id, p_fecha_pago: fechaPago }))

export const anularLiquidacion = async (id: string, motivo: string | null) =>
  ok(await supabase.rpc('anular_liquidacion', { p_id: id, p_motivo: motivo }))

export const fetchDetalleDescuentos = async (liquidacionId: string) =>
  rows<DetalleDescuento>(
    await supabase.from('detalle_descuentos_liquidacion').select('id, liquidacion_id, deuda_id, importe, deudas_empleados(descripcion)').eq('liquidacion_id', liquidacionId),
  )

export const fetchLiquidacionCompleta = async (id: string) =>
  one<{ descontar_justificados: boolean }>(
    await supabase.from('liquidaciones_sueldos').select('descontar_justificados').eq('id', id).maybeSingle(),
  )
