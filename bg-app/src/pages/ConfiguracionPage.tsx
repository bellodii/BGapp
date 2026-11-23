import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Badge, Button, Card, Field, Input, PageHeader } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { changeMyPassword, updateMyProfile } from '@/api/admin'
import { friendlyError } from '@/lib/errors'

export default function ConfiguracionPage() {
  const { profile, isSuperAdmin, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState(profile?.nombre ?? '')
  const [apellido, setApellido] = useState(profile?.apellido ?? '')
  const [savingP, setSavingP] = useState(false)
  const [errP, setErrP] = useState<Record<string, string>>({})

  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [savingK, setSavingK] = useState(false)
  const [errK, setErrK] = useState<Record<string, string>>({})

  async function guardarPerfil(ev: FormEvent) {
    ev.preventDefault()
    if (!profile) return
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Ingresá tu nombre.'
    if (!apellido.trim()) e.apellido = 'Ingresá tu apellido.'
    setErrP(e)
    if (Object.keys(e).length) return
    setSavingP(true)
    try { await updateMyProfile(profile.id, nombre.trim(), apellido.trim()); await refreshProfile(); toast.success('Datos actualizados.') }
    catch (err) { toast.error(friendlyError(err)) } finally { setSavingP(false) }
  }

  async function cambiarClave(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (pass.length < 12) e.pass = 'Debe tener al menos 12 caracteres.'
    if (pass2 !== pass) e.pass2 = 'Las contraseñas no coinciden.'
    setErrK(e)
    if (Object.keys(e).length) return
    setSavingK(true)
    try { await changeMyPassword(pass); setPass(''); setPass2(''); toast.success('Contraseña actualizada.') }
    catch (err) { toast.error(friendlyError(err)) } finally { setSavingK(false) }
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Tu cuenta y tu seguridad." />
      <div className="grid max-w-3xl gap-5">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Mi perfil</h2>
            <Badge tone={isSuperAdmin ? 'dark' : 'blue'}>{isSuperAdmin ? 'Administrador principal' : 'Administrador'}</Badge>
          </div>
          <form onSubmit={guardarPerfil} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required error={errP.nombre} htmlFor="c-nombre"><Input id="c-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} invalid={!!errP.nombre} /></Field>
            <Field label="Apellido" required error={errP.apellido} htmlFor="c-ape"><Input id="c-ape" value={apellido} onChange={(e) => setApellido(e.target.value)} invalid={!!errP.apellido} /></Field>
            <Field label="Correo electrónico" htmlFor="c-mail" hint="Se administra desde Supabase Auth." className="sm:col-span-2"><Input id="c-mail" value={profile?.email ?? ''} disabled /></Field>
            <div className="sm:col-span-2"><Button type="submit" loading={savingP}>Guardar cambios</Button></div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">Cambiar contraseña</h2>
          <form onSubmit={cambiarClave} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Nueva contraseña" required error={errK.pass} htmlFor="c-pass" hint="Mínimo 12 caracteres."><Input id="c-pass" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} invalid={!!errK.pass} /></Field>
            <Field label="Repetir contraseña" required error={errK.pass2} htmlFor="c-pass2"><Input id="c-pass2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} invalid={!!errK.pass2} /></Field>
            <div className="sm:col-span-2"><Button type="submit" variant="dark" loading={savingK}>Actualizar contraseña</Button></div>
          </form>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div><h2 className="font-bold">Sesión</h2><p className="text-sm text-steel-500">Cerrá la sesión si usás un equipo compartido.</p></div>
          <Button variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}>Cerrar sesión</Button>
        </Card>
      </div>
    </>
  )
}
