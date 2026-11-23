// supabase/functions/crear-administrador/index.ts
// Crea administradores usando la service_role SIN exponerla al navegador.
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las inyecta Supabase automáticamente.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*', // en producción: reemplazar por el dominio de tu app
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MODULOS = ['dashboard','obras','avances','empleados','asistencias','deudas','liquidaciones','auditoria']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  // 1) Identificar al llamador con SU propio JWT (no con la service_role).
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await caller.auth.getUser()
  if (!userData?.user) return json({ error: 'No autenticado' }, 401)

  // 2) Solo un super_admin ACTIVO puede continuar (la función SQL usa auth.uid() del JWT).
  const { data: esSuper } = await caller.rpc('is_super_admin')
  if (esSuper !== true) return json({ error: 'Solo el super administrador puede crear administradores' }, 403)

  // 3) Validar entrada.
  const { email, password, nombre, apellido, permisos } = await req.json().catch(() => ({}))
  if (!email || !password || !nombre || !apellido) return json({ error: 'Faltan datos' }, 400)
  if (typeof password !== 'string' || password.length < 12) return json({ error: 'La contraseña debe tener al menos 12 caracteres' }, 400)
  const permisosOk = (Array.isArray(permisos) ? permisos : []).filter((p: any) => MODULOS.includes(p?.modulo))

  // 4) Con service_role (solo aquí, en el servidor) crear el usuario en Auth.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: created, error: errCreate } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nombre, apellido },
  })
  if (errCreate || !created?.user) return json({ error: errCreate?.message ?? 'No se pudo crear el usuario' }, 400)
  const id = created.user.id

  // El trigger handle_new_user ya creó el perfil (admin, inactivo). Lo habilitamos y cargamos permisos.
  const { error: errPerfil } = await admin.from('profiles').update({ activo: true, nombre, apellido }).eq('id', id)
  let errPerm = null
  if (!errPerfil && permisosOk.length) {
    const rows = permisosOk.map((p: any) => ({
      profile_id: id, modulo: p.modulo,
      puede_ver: !!p.puede_ver, puede_crear: !!p.puede_crear,
      puede_editar: !!p.puede_editar, puede_eliminar: !!p.puede_eliminar,
    }))
    errPerm = (await admin.from('permisos_admin').insert(rows)).error
  }
  if (errPerfil || errPerm) {
    // Reversión: el perfil referencia a auth.users con RESTRICT, se borra primero.
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
    return json({ error: (errPerfil ?? errPerm)!.message }, 400)
  }
  return json({ id, email }, 201)
})
