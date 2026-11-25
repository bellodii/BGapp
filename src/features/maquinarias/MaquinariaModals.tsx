import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Field, Input, Modal, NumberInput, Textarea } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { createService, updateMaquinaria, upsertHoras } from '@/api/maquinarias'
import { friendlyError } from '@/lib/errors'
import { formatNumber, parseNum } from '@/lib/format'
import { todayAR } from '@/lib/dates'
import type { MaquinariaResumen } from '@/types/db'

const r1 = (n: number) => Math.round(n * 10) / 10

function useSave(onClose: () => void, okMsg: string) {
  const qc = useQueryClient()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  async function run(fn: () => Promise<void>) {
    setSaving(true)
    try { await fn(); await qc.invalidateQueries(); toast.success(okMsg); onClose() }
    catch (err) { toast.error(friendlyError(err)) }
    finally { setSaving(false) }
  }
  return { saving, run }
}

export function HorasModal({ maquinaria, onClose }: { maquinaria: MaquinariaResumen; onClose: () => void }) {
  const [fecha, setFecha] = useState(todayAR())
  const [horas, setHoras] = useState(String(maquinaria.horas_por_dia).replace('.', ','))
  const [obs, setObs] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, run } = useSave(onClose, 'Horas registradas.')

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const h = parseNum(horas)
    const e: Record<string, string> = {}
    if (!fecha) e.fecha = 'Ingresá la fecha.'
    else if (fecha > todayAR()) e.fecha = 'La fecha no puede ser futura.'
    if (!(h > 0 && h <= 24)) e.horas = 'Ingresá entre 0,1 y 24 horas.'
    setErrors(e)
    if (Object.keys(e).length) return
    void run(() => upsertHoras({ maquinaria_id: maquinaria.id, fecha, horas: r1(h), observaciones: obs.trim() || null }))
  }

  return (
    <Modal title="Cargar horas trabajadas" onClose={onClose} busy={saving}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="horas-form" loading={saving}>Guardar</Button>
      </>}>
      <form id="horas-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <p className="rounded-lg bg-steel-50 px-3 py-2 text-sm text-steel-600">
          <strong className="text-ink-900">{maquinaria.marca} {maquinaria.modelo}</strong> · Si ya hay horas cargadas ese día, se reemplazan.
        </p>
        <Field label="Fecha" required error={errors.fecha} htmlFor="h-fecha">
          <Input id="h-fecha" type="date" value={fecha} max={todayAR()} onChange={(e) => setFecha(e.target.value)} invalid={!!errors.fecha} />
        </Field>
        <Field label="Horas trabajadas" required error={errors.horas} htmlFor="h-horas">
          <NumberInput id="h-horas" value={horas} onChange={(e) => setHoras(e.target.value)} invalid={!!errors.horas} autoFocus />
        </Field>
        <Field label="Observaciones" htmlFor="h-obs">
          <Textarea id="h-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} />
        </Field>
      </form>
    </Modal>
  )
}

export function ServiceModal({ maquinaria, onClose }: { maquinaria: MaquinariaResumen; onClose: () => void }) {
  const actual = r1(maquinaria.horas_iniciales + maquinaria.horas_registradas)
  const [fecha, setFecha] = useState(todayAR())
  const [horometro, setHorometro] = useState(String(actual).replace('.', ','))
  const [desc, setDesc] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, run } = useSave(onClose, 'Service registrado.')

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const h = parseNum(horometro)
    const e: Record<string, string> = {}
    if (!fecha) e.fecha = 'Ingresá la fecha del service.'
    else if (fecha > todayAR()) e.fecha = 'La fecha no puede ser futura.'
    if (!(h >= 0)) e.horometro = 'Ingresá la lectura del horómetro.'
    setErrors(e)
    if (Object.keys(e).length) return
    void run(() => createService({ maquinaria_id: maquinaria.id, fecha, horometro: r1(h), descripcion: desc.trim() || null }))
  }

  return (
    <Modal title="Registrar service" onClose={onClose} busy={saving}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="service-form" loading={saving}>Registrar</Button>
      </>}>
      <form id="service-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <p className="rounded-lg bg-steel-50 px-3 py-2 text-sm text-steel-600">
          <strong className="text-ink-900">{maquinaria.marca} {maquinaria.modelo}</strong> · Horómetro actual: {formatNumber(actual)} h
        </p>
        <Field label="Fecha del service" required error={errors.fecha} htmlFor="s-fecha">
          <Input id="s-fecha" type="date" value={fecha} max={todayAR()} onChange={(e) => setFecha(e.target.value)} invalid={!!errors.fecha} />
        </Field>
        <Field label="Horómetro al hacer el service (horas)" required error={errors.horometro} htmlFor="s-horo"
          hint="Es la lectura del horómetro en el momento del service. Si es de hace tiempo, cargá la lectura de esa fecha.">
          <NumberInput id="s-horo" value={horometro} onChange={(e) => setHorometro(e.target.value)} invalid={!!errors.horometro} autoFocus />
        </Field>
        <Field label="Qué se hizo" htmlFor="s-desc">
          <Textarea id="s-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} placeholder="Ej.: Aceite de motor, filtros de aceite y combustible" />
        </Field>
      </form>
    </Modal>
  )
}

/** Corrige el horómetro si no coincide con la lectura real de la máquina. */
export function HorometroModal({ maquinaria, onClose }: { maquinaria: MaquinariaResumen; onClose: () => void }) {
  const [lectura, setLectura] = useState(String(r1(maquinaria.horas_iniciales + maquinaria.horas_registradas)).replace('.', ','))
  const [error, setError] = useState('')
  const { saving, run } = useSave(onClose, 'Horómetro ajustado.')

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const l = parseNum(lectura)
    const nuevoInicial = r1(l - maquinaria.horas_registradas)
    if (!(l >= 0)) return setError('Ingresá la lectura del horómetro.')
    if (nuevoInicial < 0) return setError(`La lectura no puede ser menor a las horas ya cargadas (${formatNumber(maquinaria.horas_registradas)} h).`)
    setError('')
    void run(() => updateMaquinaria(maquinaria.id, { horas_iniciales: nuevoInicial }))
  }

  return (
    <Modal title="Ajustar horómetro" onClose={onClose} busy={saving} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="horo-form" loading={saving}>Ajustar</Button>
      </>}>
      <form id="horo-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label="Lectura real del horómetro (horas)" required error={error} htmlFor="ho-l"
          hint="Usalo si el horómetro de la máquina no coincide con el calculado por la app.">
          <NumberInput id="ho-l" value={lectura} onChange={(e) => setLectura(e.target.value)} invalid={!!error} autoFocus />
        </Field>
      </form>
    </Modal>
  )
}
