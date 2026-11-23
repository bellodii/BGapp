import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CheckCircle2, HardHat, Ruler, Target, Users, Wallet } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, StatCard } from '@/components/ui'
import { fetchDashboard } from '@/api/dashboard'
import { fetchAvancesDesde, fetchAvancesRecientes, fetchObras } from '@/api/obras'
import { fetchProfiles } from '@/api/admin'
import { fetchResumenPeriodo, fetchUltimosPeriodos } from '@/api/liquidaciones'
import { friendlyError } from '@/lib/errors'
import { formatARS, formatNumber, unidadLabel } from '@/lib/format'
import { MESES, addDays, currentPeriod, formatDate, todayAR } from '@/lib/dates'

const YELLOW = '#facc15'
const INK = '#111113'
const GRAY = '#9a9aa3'
const GREEN = '#16a34a'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { anio, mes } = currentPeriod()
  const hoy = todayAR()
  const desde = addDays(hoy, -29)

  const dashQ = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })
  const obrasQ = useQuery({ queryKey: ['obras'], queryFn: fetchObras })
  const recientesQ = useQuery({ queryKey: ['avances-recientes'], queryFn: () => fetchAvancesRecientes(8) })
  const avances30Q = useQuery({ queryKey: ['avances-30d', desde], queryFn: () => fetchAvancesDesde(desde) })
  const periodoQ = useQuery({ queryKey: ['res-periodo', anio, mes], queryFn: () => fetchResumenPeriodo(anio, mes) })
  const periodosQ = useQuery({ queryKey: ['ultimos-periodos'], queryFn: () => fetchUltimosPeriodos(6) })
  const profilesQ = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles })

  const obras = obrasQ.data ?? []

  // Total realizado / pendiente por unidad (hectáreas y vanos no se suman entre sí).
  const porUnidad = useMemo(() => {
    const acc = { hectareas: { realizado: 0, pendiente: 0 }, vanos: { realizado: 0, pendiente: 0 } }
    for (const o of obras) {
      acc[o.unidad_medida].realizado += o.cantidad_realizada
      if (o.estado !== 'finalizada') acc[o.unidad_medida].pendiente += o.cantidad_pendiente
    }
    return acc
  }, [obras])

  const progresoObras = useMemo(
    () => obras.filter((o) => o.estado === 'en_ejecucion').slice(0, 8).map((o) => ({ nombre: o.nombre.length > 18 ? `${o.nombre.slice(0, 17)}…` : o.nombre, porcentaje: o.porcentaje_completado })),
    [obras],
  )

  const estados = useMemo(() => [
    { name: 'Pendientes', value: dashQ.data?.obras_pendientes ?? 0, color: GRAY },
    { name: 'En ejecución', value: dashQ.data?.obras_en_ejecucion ?? 0, color: YELLOW },
    { name: 'Finalizadas', value: dashQ.data?.obras_finalizadas ?? 0, color: INK },
  ].filter((e) => e.value > 0), [dashQ.data])

  const unidadPorObra = useMemo(() => new Map(obras.map((o) => [o.id, o.unidad_medida])), [obras])
  const serie30 = useMemo(() => {
    const dias = Array.from({ length: 30 }, (_, i) => addDays(desde, i))
    const m = new Map(dias.map((d) => [d, { dia: d.slice(8) + '/' + d.slice(5, 7), hectareas: 0, vanos: 0 }]))
    for (const a of avances30Q.data ?? []) {
      const u = unidadPorObra.get(a.obra_id)
      const row = m.get(a.fecha)
      if (u && row) row[u] += a.cantidad_realizada
    }
    return [...m.values()]
  }, [avances30Q.data, unidadPorObra, desde])

  const serieSueldos = useMemo(
    () => [...(periodosQ.data ?? [])].reverse().map((p) => ({ periodo: `${MESES[p.mes - 1].slice(0, 3)} ${String(p.anio).slice(2)}`, Pagado: p.total_pagado, Pendiente: p.total_pendiente })),
    [periodosQ.data],
  )

  const nombreDe = (id: string | null) => { const p = profilesQ.data?.find((x) => x.id === id); return p ? `${p.nombre} ${p.apellido}` : '—' }
  const obraDe = (id: string) => obras.find((o) => o.id === id)

  if (dashQ.isLoading || obrasQ.isLoading) return <PageLoader />
  if (dashQ.error) return <ErrorState message={friendlyError(dashQ.error)} onRetry={() => void dashQ.refetch()} />
  const d = dashQ.data
  const p = periodoQ.data

  return (
    <>
      <PageHeader title={`Hola, ${profile?.nombre ?? ''}`} subtitle={`Resumen general de BG · ${formatDate(hoy)}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent icon={<HardHat className="h-5 w-5" />} label="Obras activas" value={d?.obras_en_ejecucion ?? 0} sub={`${d?.obras_pendientes ?? 0} pendientes`} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Obras finalizadas" value={d?.obras_finalizadas ?? 0} sub={`${d?.obras_total ?? 0} obras en total`} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Empleados activos" value={d?.empleados_activos ?? 0} sub={`Hoy: ${d?.presentes_hoy ?? 0} presentes · ${d?.ausentes_hoy ?? 0} ausentes`} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label={`Sueldos de ${MESES[mes - 1]}`} value={formatARS(p?.total_neto ?? 0)} sub={`Pagado ${formatARS(p?.total_pagado ?? 0)} · Pendiente ${formatARS(p?.total_pendiente ?? 0)}`} />
        {(['hectareas', 'vanos'] as const).map((u) => (
          <StatCard key={`r-${u}`} icon={<Ruler className="h-5 w-5" />} label={`${unidadLabel(u)} realizados`} value={formatNumber(porUnidad[u].realizado)} sub="Total acumulado de todas las obras" />
        ))}
        {(['hectareas', 'vanos'] as const).map((u) => (
          <StatCard key={`p-${u}`} icon={<Target className="h-5 w-5" />} label={`${unidadLabel(u)} pendientes`} value={formatNumber(porUnidad[u].pendiente)} sub="De obras no finalizadas" />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Progreso de obras en ejecución" />
          <div className="h-72 p-4">
            {progresoObras.length === 0 ? <EmptyState title="No hay obras en ejecución" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progresoObras} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${formatNumber(Number(v))}%`, 'Completado']} />
                  <Bar dataKey="porcentaje" fill={YELLOW} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Obras por estado" />
          <div className="h-72 p-4">
            {estados.length === 0 ? <EmptyState title="Todavía no hay obras" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={estados} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {estados.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Avances de los últimos 30 días" />
          <div className="h-72 p-4">
            {(avances30Q.data ?? []).length === 0 ? <EmptyState title="Sin avances en los últimos 30 días" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals />
                  <Tooltip /><Legend />
                  <Bar dataKey="hectareas" name="Hectáreas" fill={YELLOW} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vanos" name="Vanos" fill={INK} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Sueldos de los últimos meses" />
          <div className="h-72 p-4">
            {serieSueldos.length === 0 ? <EmptyState title="Todavía no hay liquidaciones" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serieSueldos}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip formatter={(v) => formatARS(Number(v))} /><Legend />
                  <Bar dataKey="Pagado" stackId="s" fill={GREEN} />
                  <Bar dataKey="Pendiente" stackId="s" fill={YELLOW} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Actividad reciente" action={<Activity className="h-4 w-4 text-steel-400" />} />
        {recientesQ.isLoading ? <PageLoader /> : recientesQ.error ? <div className="p-4"><ErrorState message={friendlyError(recientesQ.error)} /></div> :
          !recientesQ.data?.length ? <EmptyState title="Todavía no hay avances registrados" /> : (
            <ul className="divide-y divide-steel-100">
              {recientesQ.data.map((a) => {
                const o = obraDe(a.obra_id)
                return (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <Link to={`/obras/${a.obra_id}`} className="font-semibold hover:underline">{o?.nombre ?? 'Obra'}</Link>
                      <p className="text-xs text-steel-500">Registró {nombreDe(a.registrado_por)}{a.observaciones ? ` · ${a.observaciones}` : ''}</p>
                    </div>
                    <div className="text-right"><p className="font-extrabold">{formatNumber(a.cantidad_realizada)} {o ? unidadLabel(o.unidad_medida) : ''}</p><p className="text-xs text-steel-500">{formatDate(a.fecha)}</p></div>
                  </li>
                )
              })}
            </ul>
          )}
      </Card>
    </>
  )
}
