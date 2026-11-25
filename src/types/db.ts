// Tipos que reflejan las tablas / vistas / funciones creadas en Supabase.
export type UnidadMedida = 'hectareas' | 'vanos'
export type EstadoObra = 'pendiente' | 'en_ejecucion' | 'finalizada'
export type TipoRemuneracion = 'mensual' | 'diario'
export type EstadoAsistencia = 'trabajado' | 'ausente' | 'justificado' | 'no_laborable'
export type EstadoDeuda = 'pendiente' | 'parcial' | 'pagada'
export type EstadoLiquidacion = 'pendiente' | 'pagado' | 'anulada'

export interface ObraResumen {
  id: string
  nombre: string
  cliente: string
  ubicacion: string | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  unidad_medida: UnidadMedida
  estado: EstadoObra
  created_by: string | null
  cantidad_contratada: number
  cantidad_realizada: number
  cantidad_pendiente: number
  cantidad_excedente: number
  porcentaje_completado: number
  cantidad_avances: number
  ultimo_avance: string | null
}

export interface AvanceObra {
  id: string
  obra_id: string
  fecha: string
  cantidad_realizada: number
  observaciones: string | null
  registrado_por: string | null
  created_at: string
  updated_at: string
}

export interface EmpleadoResumen {
  id: string
  nombre: string
  apellido: string
  nombre_completo: string
  fecha_ingreso: string
  tipo_remuneracion: TipoRemuneracion
  sueldo_mensual: number | null
  valor_diario: number | null
  dias_laborales: number[]
  descontar_justificados: boolean
  activo: boolean
  observaciones: string | null
  deudas_pendientes_cantidad: number
  deuda_total_pendiente: number
}

export interface Asistencia {
  id: string
  empleado_id: string
  fecha: string
  estado: EstadoAsistencia
  observaciones: string | null
  registrado_por: string | null
}

export interface AsistenciaMensual {
  empleado_id: string
  nombre: string
  apellido: string
  anio: number
  mes: number
  dias_trabajados: number
  dias_ausentes: number
  dias_justificados: number
  dias_no_laborables: number
  total_registros: number
}

export interface Deuda {
  id: string
  empleado_id: string
  descripcion: string
  importe_original: number
  saldo_pendiente: number
  fecha: string
  estado: EstadoDeuda
  registrado_por: string | null
  created_at: string
}

export interface MovimientoDeuda {
  id: string
  deuda_id: string
  liquidacion_id: string | null
  tipo: 'descuento' | 'pago' | 'ajuste'
  importe: number
  descripcion: string | null
  fecha: string
  registrado_por: string | null
  created_at: string
}

export interface LiquidacionResumen {
  id: string
  empleado_id: string
  nombre: string
  apellido: string
  nombre_completo: string
  anio: number
  mes: number
  tipo_remuneracion: TipoRemuneracion
  sueldo_base: number
  valor_diario_aplicado: number
  dias_programados: number
  dias_trabajados: number
  dias_ausentes: number
  dias_justificados: number
  descuentos_ausencias: number
  sueldo_bruto: number
  descuentos_deudas: number
  sueldo_neto: number
  estado: EstadoLiquidacion
  fecha_pago: string | null
  registrado_por: string | null
  created_at: string
}

export interface PeriodoLiquidaciones {
  anio: number
  mes: number
  liquidaciones: number
  total_bruto: number
  total_desc_ausencias: number
  total_desc_deudas: number
  total_neto: number
  total_pagado: number
  total_pendiente: number
}

export interface CalculoLiquidacion {
  empleado_id: string
  mes: number
  anio: number
  tipo_remuneracion: TipoRemuneracion
  sueldo_base: number
  valor_diario_aplicado: number
  dias_programados: number
  dias_trabajados: number
  dias_ausentes: number
  dias_justificados: number
  dias_sin_registro: number
  descontar_justificados: boolean
  descuentos_ausencias: number
  sueldo_bruto: number
}

export interface DetalleDescuento {
  id: string
  liquidacion_id: string
  deuda_id: string
  importe: number
  deudas_empleados: { descripcion: string } | null
}

export interface DashboardResumen {
  obras_total: number
  obras_pendientes: number
  obras_en_ejecucion: number
  obras_finalizadas: number
  avance_promedio_obras_en_ejecucion: number
  empleados_activos: number
  empleados_inactivos: number
  deudas_abiertas: number
  deuda_total_pendiente: number
  liquidaciones_pendientes: number
  monto_liquidaciones_pendientes: number
  pagado_mes_actual: number
  presentes_hoy: number
  ausentes_hoy: number
}

export interface AuditLog {
  id: string
  usuario_id: string | null
  accion: string
  entidad: string
  entidad_id: string | null
  descripcion: string | null
  fecha: string
  metadata: Record<string, unknown>
}

export interface PermisoAdmin {
  id: string
  profile_id: string
  modulo: string
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

// ---------- Maquinarias ----------
export type TipoMaquinaria = 'topadora' | 'tractor' | 'camion' | 'retroexcavadora' | 'excavadora' | 'motoniveladora' | 'cargadora' | 'otro'

export interface MaquinariaResumen {
  id: string
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
  created_at: string
  horas_registradas: number
  horas_7d: number
  horas_30d: number
  ultimo_service_fecha: string | null
  ultimo_service_horometro: number | null
  ultimo_service_descripcion: string | null
}

export interface MaquinariaHoras {
  id: string
  maquinaria_id: string
  fecha: string
  horas: number
  observaciones: string | null
  registrado_por: string | null
  created_at: string
}

export interface MaquinariaService {
  id: string
  maquinaria_id: string
  fecha: string
  horometro: number
  descripcion: string | null
  registrado_por: string | null
  created_at: string
}
