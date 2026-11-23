import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Accion, Modulo, Permiso, Profile } from './types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  user: User | null
  profile: Profile | null
  permisos: Permiso[]
  /** Mensaje cuando el login fue válido pero la cuenta no puede usar el sistema. */
  authError: string | null
  isSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  can: (modulo: Modulo, accion?: Accion) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const MSG_NO_HABILITADA =
  'Tu cuenta todavía no está habilitada en el sistema. Contactá al administrador principal.'
const MSG_ERROR_PERFIL = 'No se pudo verificar tu cuenta. Intentá de nuevo en unos minutos.'
const PROFILE_COLS = 'id, nombre, apellido, email, rol, activo, created_at'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [authError, setAuthError] = useState<string | null>(null)

  // 1) Sesión: se recupera al cargar (persiste al refrescar) y se mantiene sincronizada.
  //    El callback solo guarda la sesión; NO se llama a Supabase desde adentro.
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setSessionReady(true)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // 2) Perfil + permisos: una vez por usuario (no en cada refresh de token).
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setPermisos([])
      return
    }
    let cancelled = false

    const rechazar = async (mensaje: string) => {
      setAuthError(mensaje)
      await supabase.auth.signOut()
    }

    void (async () => {
      try {
        const { data: p, error } = await supabase
          .from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle()
        if (cancelled) return
        if (error) return await rechazar(MSG_ERROR_PERFIL)
        if (!p || !p.activo) return await rechazar(MSG_NO_HABILITADA)

        const { data: perms, error: errPerms } = await supabase.rpc('mis_permisos')
        if (cancelled) return
        if (errPerms) return await rechazar(MSG_ERROR_PERFIL)

        setProfile(p as Profile)
        setPermisos((perms ?? []) as Permiso[])
      } catch {
        if (!cancelled) await rechazar(MSG_ERROR_PERFIL)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      // Mensaje genérico: no revela si el correo existe.
      if (error.status === 429) return { error: 'Demasiados intentos. Esperá unos minutos.' }
      return { error: 'Correo o contraseña incorrectos.' }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setPermisos([])
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle()
    if (data) setProfile(data as Profile)
  }, [userId])

  const can = useCallback(
    (modulo: Modulo, accion: Accion = 'ver') => {
      if (!profile) return false
      if (profile.rol === 'super_admin') return true
      const p = permisos.find((x) => x.modulo === modulo)
      if (!p) return false
      switch (accion) {
        case 'ver': return p.puede_ver
        case 'crear': return p.puede_crear
        case 'editar': return p.puede_editar
        case 'eliminar': return p.puede_eliminar
      }
    },
    [profile, permisos],
  )

  const status: AuthStatus = !sessionReady
    ? 'loading'
    : !session
      ? 'unauthenticated'
      : profile
        ? 'authenticated'
        : 'loading'

  const value = useMemo<AuthContextValue>(
    () => ({
      status, session, user: session?.user ?? null, profile, permisos, authError,
      isSuperAdmin: profile?.rol === 'super_admin',
      signIn, signOut, refreshProfile, can,
    }),
    [status, session, profile, permisos, authError, signIn, signOut, refreshProfile, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
