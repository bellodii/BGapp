import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useAuth } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { BGLoader } from '@/components/BGLoader'
import { PageLoader } from '@/components/ui'
import LoginPage from '@/pages/LoginPage'
import SinPermisoPage from '@/pages/SinPermisoPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ObrasPage = lazy(() => import('@/pages/ObrasPage'))
const ObraDetailPage = lazy(() => import('@/pages/ObraDetailPage'))
const MaquinariasPage = lazy(() => import('@/pages/MaquinariasPage'))
const MaquinariaDetailPage = lazy(() => import('@/pages/MaquinariaDetailPage'))
const EmpleadosPage = lazy(() => import('@/pages/EmpleadosPage'))
const EmpleadoDetailPage = lazy(() => import('@/pages/EmpleadoDetailPage'))
const AsistenciaPage = lazy(() => import('@/pages/AsistenciaPage'))
const SueldosPage = lazy(() => import('@/pages/SueldosPage'))
const AdministradoresPage = lazy(() => import('@/pages/AdministradoresPage'))
const HistorialPage = lazy(() => import('@/pages/HistorialPage'))
const ConfiguracionPage = lazy(() => import('@/pages/ConfiguracionPage'))

/** Loader de arranque: se muestra al iniciar la app hasta recuperar la sesión. */
function Splash({ ready }: { ready: boolean }) {
  const [mounted, setMounted] = useState(true)
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setMounted(false), 450)
    return () => window.clearTimeout(t)
  }, [ready])
  if (!mounted) return null
  return (
    <div className={clsx('fixed inset-0 z-[300] flex items-center justify-center bg-ink-950 transition-opacity duration-500', ready && 'pointer-events-none opacity-0')}>
      <BGLoader mode="fill" duration={1200} label="Cargando sistema…" />
    </div>
  )
}

export default function App() {
  const { status } = useAuth()
  const queryClient = useQueryClient()
  const [minElapsed, setMinElapsed] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), 1200)
    return () => window.clearTimeout(t)
  }, [])

  // Al cerrar sesión se descarta toda la información en caché.
  useEffect(() => {
    if (status === 'unauthenticated') queryClient.clear()
  }, [status, queryClient])

  return (
    <>
      <Splash ready={minElapsed && status !== 'loading'} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="sin-permiso" element={<SinPermisoPage />} />
              <Route path="configuracion" element={<ConfiguracionPage />} />

              <Route element={<ProtectedRoute modulo="dashboard" />}>
                <Route index element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute modulo="obras" />}>
                <Route path="obras" element={<ObrasPage />} />
                <Route path="obras/:id" element={<ObraDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute modulo="maquinarias" />}>
                <Route path="maquinarias" element={<MaquinariasPage />} />
                <Route path="maquinarias/:id" element={<MaquinariaDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute modulo="empleados" />}>
                <Route path="empleados" element={<EmpleadosPage />} />
                <Route path="empleados/:id" element={<EmpleadoDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute modulo="asistencias" />}>
                <Route path="asistencia" element={<AsistenciaPage />} />
              </Route>
              <Route element={<ProtectedRoute modulo="liquidaciones" />}>
                <Route path="sueldos" element={<SueldosPage />} />
              </Route>
              <Route element={<ProtectedRoute soloSuperAdmin />}>
                <Route path="administradores" element={<AdministradoresPage />} />
              </Route>
              <Route element={<ProtectedRoute modulo="auditoria" />}>
                <Route path="historial" element={<HistorialPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
