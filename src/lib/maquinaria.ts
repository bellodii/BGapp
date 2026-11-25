import { addDays, addMonths, diffDays, todayAR } from './dates'
import type { MaquinariaResumen, TipoMaquinaria } from '@/types/db'

export const TIPO_LABEL: Record<TipoMaquinaria, string> = {
  topadora: 'Topadora', tractor: 'Tractor', camion: 'Camión', retroexcavadora: 'Retroexcavadora',
  excavadora: 'Excavadora', motoniveladora: 'Motoniveladora', cargadora: 'Cargadora', otro: 'Otro',
}

/** Intervalos de referencia (horas de motor). El manual del fabricante siempre prevalece. */
export const INTERVALO_DEFECTO: Record<TipoMaquinaria, { horas: number; meses: number; nota: string }> = {
  topadora: { horas: 250, meses: 6, nota: 'Ciclo de 250 h (Caterpillar, Komatsu: 250 h o 6 meses). Servicios mayores a 500 / 1000 / 2000 h.' },
  retroexcavadora: { horas: 250, meses: 6, nota: 'Aceite de motor entre 250 y 500 h según modelo (250 h en uso severo). Hidráulico 1000–2000 h.' },
  tractor: { horas: 250, meses: 6, nota: 'Lo más común: 250 h (hay desde 200 hasta 500 h según modelo). Hidráulico ~1000 h.' },
  camion: { horas: 250, meses: 6, nota: 'Los camiones suelen servicearse por kilómetros (15.000–40.000 km). Por horas de motor, 250 h es solo una referencia.' },
  excavadora: { horas: 250, meses: 6, nota: 'Referencia general de 250 h; confirmar con el manual.' },
  motoniveladora: { horas: 250, meses: 6, nota: 'Referencia general de 250 h; confirmar con el manual.' },
  cargadora: { horas: 250, meses: 6, nota: 'Referencia general de 250 h; confirmar con el manual.' },
  otro: { horas: 250, meses: 6, nota: 'Referencia general de 250 h; confirmar con el manual.' },
}

export type EstadoService = 'vencido' | 'proximo' | 'sin_service' | 'al_dia'

export interface CalculoService {
  horometro: number
  horasDesdeService: number
  horasRestantes: number
  /** Fecha estimada por horas de trabajo (hoy si ya se cumplieron). null si no hay horas/semana cargadas. */
  fechaPorHoras: string | null
  /** Fecha límite por meses desde el último service. null si no aplica. */
  fechaPorMeses: string | null
  fechaProxima: string | null
  motivo: 'horas' | 'meses' | null
  diasHastaProximo: number | null
  horasPorSemana: number
  estado: EstadoService
  sinService: boolean
}

/** Umbral de "próximo": 10 % del intervalo en horas, o 15 días. */
export function calcularService(m: MaquinariaResumen, hoy = todayAR()): CalculoService {
  const horometro = m.horas_iniciales + m.horas_registradas
  const sinService = m.ultimo_service_fecha == null || m.ultimo_service_horometro == null
  const horasDesdeService = sinService ? m.horas_registradas : Math.max(0, horometro - (m.ultimo_service_horometro as number))
  const horasRestantes = m.intervalo_horas - horasDesdeService
  const horasPorSemana = m.horas_por_dia * m.dias_por_semana

  let fechaPorHoras: string | null = null
  if (horasRestantes <= 0) fechaPorHoras = hoy
  else if (horasPorSemana > 0) fechaPorHoras = addDays(hoy, Math.ceil(horasRestantes / (horasPorSemana / 7)))

  const fechaPorMeses = !sinService && m.intervalo_meses ? addMonths(m.ultimo_service_fecha as string, m.intervalo_meses) : null

  let fechaProxima: string | null = null
  let motivo: 'horas' | 'meses' | null = null
  if (fechaPorHoras && fechaPorMeses) {
    if (fechaPorMeses < fechaPorHoras) { fechaProxima = fechaPorMeses; motivo = 'meses' } else { fechaProxima = fechaPorHoras; motivo = 'horas' }
  } else if (fechaPorHoras) { fechaProxima = fechaPorHoras; motivo = 'horas' }
  else if (fechaPorMeses) { fechaProxima = fechaPorMeses; motivo = 'meses' }

  const diasHastaProximo = fechaProxima ? diffDays(hoy, fechaProxima) : null
  const vencidoHoras = horasRestantes <= 0
  const vencidoMeses = fechaPorMeses != null && fechaPorMeses <= hoy
  const cercaHoras = horasRestantes <= Math.max(1, m.intervalo_horas * 0.1)
  const cercaFecha = diasHastaProximo != null && diasHastaProximo <= 15

  let estado: EstadoService
  if (vencidoHoras || vencidoMeses) estado = 'vencido'
  else if (sinService) estado = 'sin_service'
  else if (cercaHoras || cercaFecha) estado = 'proximo'
  else estado = 'al_dia'

  return { horometro, horasDesdeService, horasRestantes, fechaPorHoras, fechaPorMeses, fechaProxima, motivo, diasHastaProximo, horasPorSemana, estado, sinService }
}

const ORDEN: Record<EstadoService, number> = { vencido: 0, proximo: 1, sin_service: 2, al_dia: 3 }

/** Orden por urgencia: vencidas primero, luego por fecha próxima. */
export function compararUrgencia(a: { m: MaquinariaResumen; c: CalculoService }, b: { m: MaquinariaResumen; c: CalculoService }): number {
  if (a.m.activa !== b.m.activa) return a.m.activa ? -1 : 1
  const d = ORDEN[a.c.estado] - ORDEN[b.c.estado]
  if (d) return d
  const fa = a.c.fechaProxima ?? '9999-12-31'
  const fb = b.c.fechaProxima ?? '9999-12-31'
  return fa < fb ? -1 : fa > fb ? 1 : a.m.marca.localeCompare(b.m.marca)
}
