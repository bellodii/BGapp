import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Button, Checkbox, Field, Input, Modal, NumberInput, Textarea } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { createEmpleado, updateEmpleado, type EmpleadoInput } from '@/api/empleados'
import { friendlyError } from '@/lib/errors'
import { parseNum, round2 } from '@/lib/format'
import { DIAS_CORTOS, DIAS_LARGOS, todayAR } from '@/lib/dates'
import type { EmpleadoResumen, TipoRemuneracion } from '@/types/db'

export function EmpleadoFormModal({ empleado, onClose }: { empleado: EmpleadoResumen | null; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const editing = !!empleado

  const [nombre, setNombre] = useState(empleado?.nombre ?? '')
  const [apellido, setApellido] = useState(empleado?.apellido ?? '')
  const [ingreso, setIngreso] = useState(empleado?.fecha_ingreso ?? todayAR())
  const [tipo, setTipo] = useState<TipoRemuneracion>(empleado?.tipo_remuneracion ?? 'mensual')
  const [sueldo, setSueldo] = useState(empleado?.sueldo_mensual != null ? String(empleado.sueldo_mensual).replace('.', ',') : '')
  const [valorDia, setValorDia] = useState(empleado?.valor_diario != null ? String(empleado.valor_diario).replace('.', ',') : '')
  const [dias, setDias] = useState<number[]>(empleado?.dias_laborales ?? [1, 2, 3, 4, 5])
  const [descJust, setDescJust] = useState(empleado?.descontar_justificados ?? false)
  const [activo, setActivo] = useState(empleado?.activo ?? true)
  const [obs, setObs] = useState(empleado?.observaciones ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const toggleDia = (d: number) => setDias((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d].sort()))

  function validate(): EmpleadoInput | null {
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Ingresá el nombre.'
    if (!apellido.trim()) e.apellido = 'Ingresá el apellido.'
    if (!ingreso) e.ingreso = 'Ingresá la fecha de ingreso.'
    if (dias.length === 0) e.dias = 'Seleccioná al menos un día laboral.'
    const monto = parseNum(tipo === 'mensual' ? sueldo : valorDia)
    if (!(monto > 0)) e.monto = tipo === 'mensual' ? 'Ingresá un sueldo mensual mayor a cero.' : 'Ingresá un valor por día mayor a cero.'
    else if (monto >= 1e11) e.monto = 'El importe es demasiado grande.'
    setErrors(e)
    if (Object.keys(e).length) return null
    return {
      nombre: nombre.trim(), apellido: apellido.trim(), fecha_ingreso: ingreso,
      tipo_remuneracion: tipo,
      sueldo_mensual: tipo === 'mensual' ? round2(monto) : null,
      valor_diario: tipo === 'diario' ? round2(monto) : null,
      dias_laborales: dias, descontar_justificados: descJust, observaciones: obs.trim() || null, activo,
    }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const input = validate()
    if (!input) return
    setSaving(true)
    try {
      if (empleado) await updateEmpleado(empleado.id, input)
      else await createEmpleado(input)
      await qc.invalidateQueries()
      toast.success(editing ? 'Empleado actualizado.' : 'Empleado registrado.')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar empleado' : 'Nuevo empleado'} onClose={onClose} busy={saving} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="emp-form" loading={saving}>{editing ? 'Guardar cambios' : 'Registrar empleado'}</Button>
      </>}>
      <form id="emp-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={errors.nombre} htmlFor="e-nombre">
          <Input id="e-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} invalid={!!errors.nombre} maxLength={80} autoFocus />
        </Field>
        <Field label="Apellido" required error={errors.apellido} htmlFor="e-ape">
          <Input id="e-ape" value={apellido} onChange={(e) => setApellido(e.target.value)} invalid={!!errors.apellido} maxLength={80} />
        </Field>
        <Field label="Fecha de ingreso" required error={errors.ingreso} htmlFor="e-ing">
          <Input id="e-ing" type="date" value={ingreso} onChange={(e) => setIngreso(e.target.value)} invalid={!!errors.ingreso} />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-semibold text-ink-800">Tipo de remuneración <span className="text-red-600">*</span></span>
          <div className="grid grid-cols-2 gap-2">
            {([['mensual', 'Sueldo mensual fijo'], ['diario', 'Pago por día trabajado']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTipo(k)} aria-pressed={tipo === k}
                className={clsx('rounded-lg border px-3 py-2.5 text-sm font-semibold transition', tipo === k ? 'border-ink-900 bg-ink-900 text-white' : 'border-steel-300 bg-white text-ink-800 hover:bg-steel-50')}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <Field className="sm:col-span-2" required error={errors.monto} htmlFor="e-monto"
          label={tipo === 'mensual' ? 'Sueldo mensual (ARS)' : 'Valor por día trabajado (ARS)'}
          hint={editing ? 'Si cambiás el importe, las liquidaciones ya generadas no se modifican.' : tipo === 'mensual' ? 'El valor diario se calcula dividiendo el sueldo por los días laborables del mes.' : undefined}>
          <NumberInput id="e-monto" value={tipo === 'mensual' ? sueldo : valorDia}
            onChange={(e) => (tipo === 'mensual' ? setSueldo(e.target.value) : setValorDia(e.target.value))}
            invalid={!!errors.monto} placeholder="Ej.: 10000" />
        </Field>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-ink-800">Días habituales de trabajo <span className="text-red-600">*</span></span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Días habituales de trabajo">
            {DIAS_CORTOS.map((c, i) => {
              const d = i + 1
              const on = dias.includes(d)
              return (
                <button key={d} type="button" onClick={() => toggleDia(d)} aria-pressed={on} title={DIAS_LARGOS[i]}
                  className={clsx('h-10 w-10 rounded-lg border text-sm font-bold transition', on ? 'border-brand-500 bg-brand-400 text-ink-950' : 'border-steel-300 bg-white text-steel-500 hover:bg-steel-50')}>
                  {c}
                </button>
              )
            })}
          </div>
          {errors.dias && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{errors.dias}</p>}
          <p className="mt-1 text-xs text-steel-500">Los sábados, domingos y feriados solo cuentan si están marcados como días de trabajo.</p>
        </div>

        <Checkbox className="sm:col-span-2" checked={descJust} onChange={(e) => setDescJust(e.target.checked)}
          label={<>Descontar los días <strong>justificados</strong> como si fueran ausencias <span className="text-steel-500">(por defecto no se descuentan)</span></>} />
        {editing && (
          <Checkbox className="sm:col-span-2" checked={activo} onChange={(e) => setActivo(e.target.checked)} label="Empleado activo" />
        )}
        <Field label="Observaciones" htmlFor="e-obs" className="sm:col-span-2">
          <Textarea id="e-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
        </Field>
      </form>
    </Modal>
  )
}
