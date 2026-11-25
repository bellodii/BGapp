import type { AuditLog } from '@/types/db'
import { formatARS, formatNumber } from './format'
import { MESES, formatDate } from './dates'

export const ENTIDADES: Record<string, string> = {
  profile: 'Administradores', permiso_admin: 'Permisos', obra: 'Obras', avance_obra: 'Avances de obras',
  empleado: 'Empleados', asistencia: 'Asistencias', deuda_empleado: 'Deudas', movimiento_deuda: 'Movimientos de deuda', liquidacion: 'Liquidaciones',
  maquinaria: 'Maquinarias', maquinaria_horas: 'Horas de maquinarias', maquinaria_service: 'Services de maquinarias',
}

export interface Lookups {
  obras: Map<string, string>
  empleados: Map<string, string>
  profiles: Map<string, string>
}

type Rec = Record<string, unknown>
const s = (v: unknown) => (v == null ? '' : String(v))
const n = (v: unknown) => Number(v ?? 0)

/** Frase legible para cada operación registrada en la auditoría. */
export function describeAudit(l: AuditLog, lk: Lookups): string {
  const nuevo = (l.metadata.nuevo ?? {}) as Rec
  const anterior = (l.metadata.anterior ?? {}) as Rec
  const cambios = (l.metadata.cambios ?? {}) as Record<string, { antes: unknown; despues: unknown }>
  // En altas hay datos "nuevo"; en bajas, "anterior"; en modificaciones solo "cambios".
  const base: Rec = Object.keys(nuevo).length ? nuevo : anterior
  const emp = (id: unknown) => lk.empleados.get(s(id)) ?? 'un empleado'
  const obra = (id: unknown) => lk.obras.get(s(id)) ?? 'una obra'
  const de = (id: unknown) => { const x = lk.empleados.get(s(id)); return x ? ` de ${x}` : '' }
  const campos = Object.keys(cambios).join(', ')

  switch (l.entidad) {
    case 'obra':
      if (l.accion === 'crear') return `Creó la obra "${s(nuevo.nombre)}" (${formatNumber(n(nuevo.cantidad_total))} ${s(nuevo.unidad_medida)})`
      if (l.accion === 'eliminar') return `Eliminó la obra "${s(anterior.nombre)}"`
      { const nom = lk.obras.get(s(l.entidad_id)); return `Modificó la obra${nom ? ` "${nom}"` : ''} (${campos})` }
    case 'avance_obra':
      if (l.accion === 'crear') return `Registró un avance de ${formatNumber(n(nuevo.cantidad_realizada))} en "${obra(nuevo.obra_id)}" (${formatDate(s(nuevo.fecha))})`
      if (l.accion === 'eliminar') return `Eliminó un avance de ${formatNumber(n(anterior.cantidad_realizada))} de "${obra(anterior.obra_id)}" (${formatDate(s(anterior.fecha))})`
      return `Modificó un avance de la obra (${campos})`
    case 'empleado': {
      const nombre = base.nombre ? `${s(base.nombre)} ${s(base.apellido)}` : emp(l.entidad_id)
      if (l.accion === 'crear') return `Agregó al empleado ${nombre}`
      if (l.accion === 'eliminar') return `Eliminó al empleado ${nombre}`
      if (l.accion === 'alta') return `Activó al empleado ${nombre}`
      if (l.accion === 'baja') return `Desactivó al empleado ${nombre}`
      if (l.accion === 'modificar_sueldo') {
        const c = cambios.sueldo_mensual ?? cambios.valor_diario
        return `Modificó la remuneración de ${nombre}${c ? `: ${c.antes == null ? '—' : formatARS(n(c.antes))} → ${c.despues == null ? '—' : formatARS(n(c.despues))}` : ''}`
      }
      return `Modificó los datos de ${nombre} (${campos})`
    }
    case 'asistencia':
      if (l.accion === 'crear') return `Registró "${s(nuevo.estado)}" para ${emp(nuevo.empleado_id)} el ${formatDate(s(nuevo.fecha))}`
      if (l.accion === 'eliminar') return `Quitó el registro de asistencia de ${emp(anterior.empleado_id)} del ${formatDate(s(anterior.fecha))}`
      return `Cambió una asistencia (${cambios.estado ? `${s(cambios.estado.antes)} → ${s(cambios.estado.despues)}` : campos})`
    case 'deuda_empleado':
      return `Registró una deuda de ${formatARS(n(nuevo.importe_original))} a ${emp(nuevo.empleado_id)} (${s(nuevo.descripcion)})`
    case 'movimiento_deuda':
      if (l.accion === 'descuento') return `Descontó ${formatARS(n(nuevo.importe))} de una deuda en una liquidación`
      if (l.accion === 'pago') return `Registró un pago de ${formatARS(n(nuevo.importe))} de una deuda`
      return `Ajustó una deuda en ${formatARS(n(nuevo.importe))}${nuevo.descripcion ? ` (${s(nuevo.descripcion)})` : ''}`
    case 'liquidacion': {
      const per = `${MESES[n(base.mes) - 1] ?? ''} ${s(base.anio)}`
      const nombre = emp(base.empleado_id)
      if (l.accion === 'generar') return `Generó la liquidación de ${nombre} (${per}) por ${formatARS(n(nuevo.sueldo_neto))}`
      if (l.accion === 'pagar') return `Marcó como pagado un sueldo${de(base.empleado_id)}${cambios.fecha_pago ? ` (${formatDate(s(cambios.fecha_pago.despues))})` : ''}`
      if (l.accion === 'anular') return `Anuló una liquidación${de(base.empleado_id)}`
      return `Modificó una liquidación (${campos})`
    }
    case 'profile': {
      const nombre = base.nombre ? `${s(base.nombre)} ${s(base.apellido)}` : lk.profiles.get(s(l.entidad_id)) ?? 'un administrador'
      if (l.accion === 'crear') return `Se creó el perfil de ${nombre}`
      if (l.accion === 'activar_admin') return `Activó la cuenta de ${nombre}`
      if (l.accion === 'desactivar_admin') return `Desactivó la cuenta de ${nombre}`
      if (l.accion === 'cambio_rol') return `Cambió el rol de ${nombre}`
      return `Modificó el perfil de ${nombre}`
    }
    case 'permiso_admin': {
      const quien = lk.profiles.get(s(base.profile_id))
      return `Cambió los permisos${quien ? ` de ${quien}` : ' de un administrador'}${base.modulo ? ` (módulo ${s(base.modulo)})` : ''}`
    }
    default:
      return l.descripcion ?? `${l.accion} · ${l.entidad}`
  }
}

export function detallesCambios(l: AuditLog): { campo: string; antes: string; despues: string }[] {
  const c = (l.metadata.cambios ?? {}) as Record<string, { antes: unknown; despues: unknown }>
  const fmt = (v: unknown) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))
  return Object.entries(c).map(([campo, v]) => ({ campo, antes: fmt(v.antes), despues: fmt(v.despues) }))
}
