# BG · Sistema de gestión administrativa

React + TypeScript + Tailwind CSS + Supabase (Auth + Database). Software interno: no tiene landing ni registro público.

## 1. Requisitos
- Node.js 20 o superior.
- El proyecto de Supabase con las **10 migraciones SQL ya ejecutadas** (carpeta `bg-supabase/`). **Esta app no requiere ningún cambio en la base de datos.**

## 2. Instalación
```bash
npm install
cp .env.example .env.local      # en Windows: copy .env.example .env.local
```
Editá `.env.local` con los datos de *Project Settings → API*:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<clave anon / publishable>
```
> ⚠️ Solo la clave **anon**. Jamás la `service_role` (todo lo que empieza con `VITE_` se publica en el navegador).

```bash
npm run dev        # desarrollo  → http://localhost:5173
npm run build      # compila y verifica tipos
```

## 3. Crear el administrador principal (una sola vez)
1. Supabase → **Authentication → Users → Add user** (correo + contraseña elegida por el dueño, *Auto Confirm User*).
2. SQL Editor: `select public.bootstrap_primer_super_admin('correo@empresa.com', 'Nombre', 'Apellido');`
3. Entrá a la app con ese correo. Desactivá **"Allow new users to sign up"** en Authentication → Sign In / Providers.

## 4. Crear otros administradores (Edge Function)
Crear usuarios exige la `service_role`, que **no puede estar en el navegador**. Por eso la sección *Administradores → Nuevo administrador* llama a una función de servidor:
```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy crear-administrador
```
Supabase le inyecta las claves automáticamente; no las copies a ningún archivo. La función verifica que quien llama sea super administrador activo.
Antes de producción, en `supabase/functions/crear-administrador/index.ts` cambiá `Access-Control-Allow-Origin: '*'` por el dominio real de la app.
(Sin desplegar la función, todo lo demás funciona; solo falla "Nuevo administrador" con un mensaje claro.)

## 5. Publicar
Vercel o Netlify: build `npm run build`, carpeta `dist`, y las dos variables `VITE_...`. Ya incluye `vercel.json` y `public/_redirects` para que las rutas funcionen al recargar.

## 6. Qué incluye (según tu pedido)
| Sección | Qué hace |
|---|---|
| **Login** | Supabase Auth, mostrar/ocultar contraseña, errores claros, sin registro. Sesión persistente, rutas protegidas, cierre de sesión. |
| **Loader** | Pantalla de arranque con marca BG, engranajes y barra de franjas. Durante operaciones importantes (liquidar, pagar, anular, crear admin, cargas masivas) aparece solo si tardan más de ~0,3 s. |
| **Dashboard** | Obras activas/finalizadas, hectáreas y vanos realizados/pendientes (por separado), empleados activos, sueldos del mes, 4 gráficos y actividad reciente. |
| **Obras** | Alta/edición/baja, buscador y filtros, tarjetas con barra animada. Detalle con total, realizado, pendiente, % (tope visual 100 %, el excedente se informa aparte) e historial de avances editable con quién lo registró. |
| **Empleados** | Alta, edición, activar/desactivar, eliminar (solo sin historial), ficha con deudas, liquidaciones y asistencia. Mensual o por día, días habituales configurables. |
| **Asistencia** | Calendario mensual por empleado (trabajado / ausente / justificado / no laborable), resumen, carga rápida y "Feriado general". |
| **Sueldos** | Cálculo automático, descuento de deudas **que decide el administrador**, marcar pagado con fecha, anular, consultar meses anteriores. |
| **Administradores** | Solo el principal: crear, matriz de permisos, activar/desactivar, ver actividad de cada uno. |
| **Historial** | Auditoría legible con filtros (sección, administrador, fechas) y detalle de cambios. |
| **Configuración** | Editar nombre, cambiar contraseña, cerrar sesión. |

Todo en pesos argentinos (ARS, formato `$ 1.234,56`) y con fechas en hora de Argentina.

## 7. Decisiones que conviene conocer
- **Seguridad real en la base:** ocultar botones es solo comodidad; los permisos los aplican RLS y las funciones SQL. Un admin sin permiso recibe "No tenés permisos".
- **Deudas:** se registran y pagan desde la **ficha del empleado**; los descuentos de sueldo se aplican al generar la liquidación. No hay edición directa de saldos (siempre por movimientos).
- **Empleados con historial** no se pueden eliminar físicamente: se desactivan.
- **Liquidación:** los valores quedan congelados; si se cambia el sueldo después, los meses anteriores no cambian. Si hay días programados sin asistencia cargada, se avisa y se exige completarlos o considerarlos trabajados.
- **Mes pagado:** sus asistencias quedan bloqueadas.
- **Primer avance** de una obra "pendiente": la pasa automáticamente a "en ejecución".
- **Dashboard de un admin común:** muestra ceros en lo que no tiene permiso de lectura (obras, empleados, asistencias, deudas, sueldos).
- Hectáreas y vanos nunca se suman entre sí.

## 8. Verificación realizada
- `tsc` en modo estricto y `vite build`: sin errores.
- **7 pruebas de integración** que ejecutan las funciones reales de `src/api` contra PostgreSQL + PostgREST con el esquema real: alta de obras/avances (ejemplo 20 ha → 9 ha = 45 %), excedente, claves foráneas, empleados, asistencias sin duplicados, deudas, liquidación (ejemplo $10.000 × 5 días con 1 ausencia), duplicados, pago, bloqueos, anulación, permisos y RLS con un admin limitado, auditoría y dashboard.
- **14 pruebas de renderizado** de todas las pantallas, redirección sin sesión y bloqueo por permisos.
- **No verificado:** el aspecto visual en navegadores y celulares reales, el login contra tu Supabase real, ni la Edge Function desplegada. Probalos tras la primera instalación y contame qué ajustar.
