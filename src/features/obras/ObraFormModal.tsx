import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Field, Input, Modal, NumberInput, Select, Textarea } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { createObra, updateObra, type ObraInput } from '@/api/obras'
import { friendlyError } from '@/lib/errors'
import { parseNum, round2 } from '@/lib/format'
import type { EstadoObra, ObraResumen, UnidadMedida } from '@/types/db'

export const ESTADO_OBRA_LABEL: Record<EstadoObra, string> = {
  pendiente: 'Pendiente', en_ejecucion: 'En ejecución', finalizada: 'Finalizada',
}

export function ObraFormModal({ obra, onClose }: { obra: ObraResumen | null; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const editing = !!obra
  const tieneAvances = (obra?.cantidad_avances ?? 0) > 0

  const [nombre, setNombre] = useState(obra?.nombre ?? '')
  const [cliente, setCliente] = useState(obra?.cliente ?? '')
  const [ubicacion, setUbicacion] = useState(obra?.ubicacion ?? '')
  const [descripcion, setDescripcion] = useState(obra?.descripcion ?? '')
  const [inicio, setInicio] = useState(obra?.fecha_inicio ?? '')
  const [fin, setFin] = useState(obra?.fecha_fin_estimada ?? '')
  const [estado, setEstado] = useState<EstadoObra>(obra?.estado ?? 'pendiente')
  const [unidad, setUnidad] = useState<UnidadMedida>(obra?.unidad_medida ?? 'hectareas')
  const [cantidad, setCantidad] = useState(obra ? String(obra.cantidad_contratada).replace('.', ',') : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function validate(): ObraInput | null {
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Ingresá el nombre de la obra.'
    if (!cliente.trim()) e.cliente = 'Ingresá el cliente o empresa contratante.'
    const cant = parseNum(cantidad)
    if (!(cant > 0)) e.cantidad = 'Ingresá una cantidad mayor a cero.'
    else if (cant >= 1e11) e.cantidad = 'La cantidad es demasiado grande.'
    if (inicio && fin && fin < inicio) e.fin = 'No puede ser anterior a la fecha de inicio.'
    setErrors(e)
    if (Object.keys(e).length) return null
    return {
      nombre: nombre.trim(), cliente: cliente.trim(),
      ubicacion: ubicacion.trim() || null, descripcion: descripcion.trim() || null,
      fecha_inicio: inicio || null, fecha_fin_estimada: fin || null,
      unidad_medida: unidad, cantidad_total: round2(cant), estado,
    }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const input = validate()
    if (!input) return
    setSaving(true)
    try {
      if (obra) await updateObra(obra.id, input)
      else await createObra(input)
      await qc.invalidateQueries()
      toast.success(editing ? 'Obra actualizada.' : 'Obra creada.')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar obra' : 'Nueva obra'} onClose={onClose} busy={saving} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="obra-form" loading={saving}>{editing ? 'Guardar cambios' : 'Crear obra'}</Button>
      </>}>
      <form id="obra-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la obra" required error={errors.nombre} htmlFor="o-nombre" className="sm:col-span-2">
          <Input id="o-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} invalid={!!errors.nombre} maxLength={150} autoFocus />
        </Field>
        <Field label="Cliente / empresa contratante" required error={errors.cliente} htmlFor="o-cliente">
          <Input id="o-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} invalid={!!errors.cliente} maxLength={150} />
        </Field>
        <Field label="Ubicación" htmlFor="o-ubic">
          <Input id="o-ubic" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Fecha de inicio" htmlFor="o-ini">
          <Input id="o-ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Field>
        <Field label="Fecha estimada de finalización" error={errors.fin} htmlFor="o-fin">
          <Input id="o-fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} invalid={!!errors.fin} />
        </Field>
        <Field label="Tipo de unidad de trabajo" required htmlFor="o-unidad"
          hint={tieneAvances ? 'No se puede cambiar: la obra ya tiene avances registrados.' : undefined}>
          <Select id="o-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadMedida)} disabled={tieneAvances}>
            <option value="hectareas">Hectáreas</option>
            <option value="vanos">Vanos</option>
          </Select>
        </Field>
        <Field label={`Cantidad total contratada (${unidad === 'hectareas' ? 'hectáreas' : 'vanos'})`} required error={errors.cantidad} htmlFor="o-cant">
          <NumberInput id="o-cant" value={cantidad} onChange={(e) => setCantidad(e.target.value)} invalid={!!errors.cantidad} placeholder="Ej.: 20" />
        </Field>
        <Field label="Estado" required htmlFor="o-estado">
          <Select id="o-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoObra)}>
            {(Object.keys(ESTADO_OBRA_LABEL) as EstadoObra[]).map((k) => <option key={k} value={k}>{ESTADO_OBRA_LABEL[k]}</option>)}
          </Select>
        </Field>
        <Field label="Descripción" htmlFor="o-desc" className="sm:col-span-2">
          <Textarea id="o-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} />
        </Field>
      </form>
    </Modal>
  )
}
