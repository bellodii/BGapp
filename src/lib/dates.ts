const TZ = 'America/Argentina/Buenos_Aires'

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] // ISO 1..7
export const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha de hoy (YYYY-MM-DD) en hora de Argentina. */
export const todayAR = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

export function currentPeriod(): { anio: number; mes: number } {
  const [y, m] = todayAR().split('-').map(Number)
  return { anio: y, mes: m }
}

/** '2026-11-10' -> '10/11/2026' (sin pasar por Date, evita corrimientos de zona horaria). */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export const daysInMonth = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()
export const toIso = (anio: number, mes: number, dia: number) => `${anio}-${pad(mes)}-${pad(dia)}`

/** Día de la semana ISO: 1 = lunes ... 7 = domingo. */
export function isoDow(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return w === 0 ? 7 : w
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Suma meses a una fecha ISO (si el día no existe en el mes destino, usa el último día). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const total = (m - 1) + months
  const yy = y + Math.floor(total / 12)
  const mm = ((total % 12) + 12) % 12 + 1
  const dd = Math.min(d, daysInMonth(yy, mm))
  return toIso(yy, mm, dd)
}

/** Diferencia en días (b - a) entre dos fechas ISO. */
export function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}
