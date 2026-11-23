import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button, ErrorState, Field, Input, Modal, PageLoader } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { useBusy } from '@/providers/BusyProvider'
import { crearAdministrador, fetchPermisos, savePermisos, type PermisoFila } from '@/api/admin'
import { friendlyError } from '@/lib/errors'
import type { Profile } from '@/auth/types'

export const MODULOS: { k: string; label: string }[] = [
  { k: 'dashboard', label: 'Dashboard' },
  { k: 'obras', label: 'Obras' },
  { k: 'avances', label: 'Avances de obras' },
  { k: 'empleados', label: 'Empleados' },
  { k: 'asistencias', label: 'Asistencias' },
  { k: 'deudas', label: 'Deudas' },
  { k: 'liquidaciones', label: 'Sueldos / liquidaciones' },
  { k: 'auditoria', label: 'Historial (auditoría)' },
]
const ACCIONES = [
  ['puede_ver', 'Ver'], ['puede_crear', 'Crear'], ['puede_editar', 'Editar'], ['puede_eliminar', 'Eliminar'],
] as const

const vacia = (): PermisoFila[] => MODULOS.map((m) => ({ modulo: m.k, puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false }))

function Matriz({ valor, onChange }: { valor: PermisoFila[]; onChange: (v: PermisoFila[]) => void }) {
  function toggle(modulo: string, campo: (typeof ACCIONES)[number][0], on: boolean) {
    onChange(valor.map((f) => {
      if (f.modulo !== modulo) return f
      const n = { ...f, [campo]: on }
      if (campo === 'puede_ver' && !on) { n.puede_crear = false; n.puede_editar = false; n.puede_eliminar = false } // sin "ver" no hay nada más
      if (campo !== 'puede_ver' && on) n.puede_ver = true
      return n
    }))
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-steel-200">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="bg-steel-50 text-xs uppercase text-steel-500"><tr><th className="px-3 py-2 text-left">Módulo</th>{ACCIONES.map(([, l]) => <th key={l} className="px-2 py-2">{l}</th>)}</tr></thead>
        <tbody className="divide-y divide-steel-100">
          {MODULOS.map((m) => {
            const f = valor.find((x) => x.modulo === m.k)!
            return (
              <tr key={m.k}>
                <td className="px-3 py-2 font-semibold">{m.label}</td>
                {ACCIONES.map(([c, l]) => (
                  <td key={c} className="px-2 py-2 text-center">
                    <input type="checkbox" checked={f[c]} onChange={(e) => toggle(m.k, c, e.target.checked)} aria-label={`${l} ${m.label}`} className="h-4 w-4 accent-brand-500" />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const NOTA = 'Para que el Dashboard muestre todos los datos, el administrador necesita permiso de lectura en obras, empleados, asistencias, deudas y sueldos.'

export function PermisosModal({ perfil, onClose }: { perfil: Profile; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['permisos', perfil.id], queryFn: () => fetchPermisos(perfil.id), staleTime: 0 })
  const [valor, setValor] = useState<PermisoFila[]>(vacia())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!q.data) return
    setValor(vacia().map((f) => {
      const e = q.data.find((p) => p.modulo === f.modulo)
      return e ? { modulo: f.modulo, puede_ver: e.puede_ver, puede_crear: e.puede_crear, puede_editar: e.puede_editar, puede_eliminar: e.puede_eliminar } : f
    }))
  }, [q.data])

  async function guardar() {
    setSaving(true)
    try {
      await savePermisos(perfil.id, valor)
      await qc.invalidateQueries()
      toast.success('Permisos actualizados.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title={`Permisos · ${perfil.nombre} ${perfil.apellido}`} onClose={onClose} busy={saving} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={guardar} loading={saving} disabled={q.isLoading || !!q.error}>Guardar permisos</Button></>}>
      {q.isLoading ? <PageLoader /> : q.error ? <ErrorState message={friendlyError(q.error)} /> : (
        <>
          <Matriz valor={valor} onChange={setValor} />
          <p className="mt-3 text-xs text-steel-500">{NOTA} Los permisos se aplican en la base de datos: no alcanza con ocultar botones.</p>
        </>
      )}
    </Modal>
  )
}

function generarClave(): string {
  const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_'
  const buf = new Uint32Array(18)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => set[n % set.length]).join('')
}

export function CrearAdminModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { run } = useBusy()
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [permisos, setPermisos] = useState<PermisoFila[]>(vacia())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Ingresá el nombre.'
    if (!apellido.trim()) e.apellido = 'Ingresá el apellido.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Ingresá un correo válido.'
    if (password.length < 12) e.password = 'La contraseña debe tener al menos 12 caracteres.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await run('Creando administrador…', () => crearAdministrador({ email: email.trim().toLowerCase(), password, nombre: nombre.trim(), apellido: apellido.trim(), permisos }))
      await qc.invalidateQueries()
      toast.success('Administrador creado. Entregale la contraseña de forma segura.')
      onClose()
    } catch (err) { toast.error(friendlyError(err)) } finally { setSaving(false) }
  }

  return (
    <Modal title="Nuevo administrador" onClose={onClose} busy={saving} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" form="admin-form" loading={saving}>Crear administrador</Button></>}>
      <form id="admin-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={errors.nombre} htmlFor="n-nombre"><Input id="n-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} invalid={!!errors.nombre} autoFocus /></Field>
        <Field label="Apellido" required error={errors.apellido} htmlFor="n-ape"><Input id="n-ape" value={apellido} onChange={(e) => setApellido(e.target.value)} invalid={!!errors.apellido} /></Field>
        <Field label="Correo electrónico" required error={errors.email} htmlFor="n-mail" className="sm:col-span-2"><Input id="n-mail" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} /></Field>
        <Field label="Contraseña inicial" required error={errors.password} htmlFor="n-pass" className="sm:col-span-2" hint="Mínimo 12 caracteres. Se guarda cifrada por Supabase Auth; el sistema nunca la almacena.">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input id="n-pass" type={ver ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} className="pr-10" />
              <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-steel-500">{ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <Button variant="outline" icon={<KeyRound className="h-4 w-4" />} onClick={() => { setPassword(generarClave()); setVer(true) }}>Generar</Button>
          </div>
        </Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-ink-800">Permisos</span>
          <Matriz valor={permisos} onChange={setPermisos} />
          <p className="mt-2 text-xs text-steel-500">{NOTA} Un administrador común nunca puede otorgarse permisos a sí mismo.</p>
        </div>
      </form>
    </Modal>
  )
}
