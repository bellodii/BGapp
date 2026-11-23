import { rows, supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types/db'

export interface AuditFilters {
  entidad: string
  usuario: string
  desde: string
  hasta: string
}

export async function fetchAudit(f: AuditFilters, page: number, pageSize: number): Promise<{ items: AuditLog[]; total: number }> {
  let q = supabase.from('audit_logs').select('*', { count: 'exact' }).order('fecha', { ascending: false })
  if (f.entidad) q = q.eq('entidad', f.entidad)
  if (f.usuario) q = q.eq('usuario_id', f.usuario)
  // Argentina es UTC-3 todo el año.
  if (f.desde) q = q.gte('fecha', `${f.desde}T00:00:00-03:00`)
  if (f.hasta) q = q.lte('fecha', `${f.hasta}T23:59:59.999-03:00`)
  const res = await q.range(page * pageSize, page * pageSize + pageSize - 1)
  return { items: rows<AuditLog>(res), total: res.count ?? 0 }
}
