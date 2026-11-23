const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

/** Pesos argentinos. */
export const formatARS = (n: number | null | undefined) => ars.format(n ?? 0)
export const formatNumber = (n: number | null | undefined) => num.format(n ?? 0)
export const formatPercent = (n: number | null | undefined) => `${num.format(n ?? 0)}%`

export const UNIDAD_LABEL = { hectareas: 'hectáreas', vanos: 'vanos' } as const
export const unidadLabel = (u: keyof typeof UNIDAD_LABEL) => UNIDAD_LABEL[u]

/** Acepta "1234,56" o "1234.56". Devuelve NaN si no es un número válido. */
export function parseNum(s: string): number {
  const t = s.trim().replace(',', '.')
  if (t === '') return NaN
  return Number(t)
}
export const round2 = (n: number) => Math.round(n * 100) / 100

/** Normaliza para búsquedas (sin tildes, minúsculas). */
export const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
