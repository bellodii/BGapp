import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Checkbox, Field, Input, Modal, NumberInput, Select, Textarea } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { createMaquinaria, updateMaquinaria, type MaquinariaInput } from '@/api/maquinarias'
import { friendlyError } from '@/lib/errors'
import { parseNum } from '@/lib/format'
import { INTERVALO_DEFECTO, TIPO_LABEL } from '@/lib/maquinaria'
import type { MaquinariaResumen, TipoMaquinaria } from '@/types/db'

const str = (n: number) => String(n).replace('.', ',')

export function MaquinariaFormModal({ maquinaria, onClose }: { maquinaria: MaquinariaResumen | null; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const editing = !!maquinaria

  const [tipo, setTipo] = useState<TipoMaquinaria>(maquinaria?.tipo ?? 'topadora')
  const [marca, setMarca] = useState(maquinaria?.marca ?? '')
  const [modelo, setModelo] = useState(maquinaria?.modelo ?? '')
  const [ident, setIdent] = useState(maquinaria?.identificador ?? '')
  const [anio, setAnio] = useState(maquinaria?.anio ? String(maquinaria.anio) : '')
  const [horasIni, setHorasIni] = useState(maquinaria ? str(maquinaria.horas_iniciales) : '0')
  const [hDia, setHDia] = useState(maquinaria ? str(maquinaria.horas_por_dia) : '8')
  const [dSem, setDSem] = useState(maquinaria ? str(maquinaria.dias_por_semana) : '5')
  const [intH, setIntH] = useState(maquinaria ? str(maquinaria.intervalo_horas) : String(INTERVALO_DEFECTO.topadora.horas))
  const [intM, setIntM] = useState(maquinaria ? (maquinaria.intervalo_meses ? String(maquinaria.intervalo_meses) : '') : String(INTERVALO_DEFECTO.topadora.meses))
  const [activa, setActiva] = useState(maquinaria?.activa ?? true)
  const [notas, setNotas] = useState(maquinaria?.notas ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function cambiarTipo(t: TipoMaquinaria) {
    setTipo(t)
    // En altas se sugiere el intervalo del tipo; en ediciones se respeta lo que ya está cargado.
    if (!editing) { setIntH(String(INTERVALO_DEFECTO[t].horas)); setIntM(String(INTERVALO_DEFECTO[t].meses)) }
  }

  function validate(): MaquinariaInput | null {
    const e: Record<string, string> = {}
    if (!marca.trim()) e.marca = 'Ingresá la marca.'
    if (!modelo.trim()) e.modelo = 'Ingresá el modelo.'
    const ini = parseNum(horasIni), hd = parseNum(hDia), ds = parseNum(dSem), ih = parseNum(intH)
    const im = intM.trim() === '' ? null : parseNum(intM)
    const an = anio.trim() === '' ? null : Number(anio)
    if (!(ini >= 0) || ini > 999999) e.horasIni = 'Ingresá las horas actuales del horómetro (0 o más).'
    if (!(hd >= 0 && hd <= 24)) e.hDia = 'Entre 0 y 24 horas.'
    if (!(ds >= 0 && ds <= 7)) e.dSem = 'Entre 0 y 7 días.'
    if (!(ih > 0)) e.intH = 'Ingresá un intervalo mayor a cero.'
    if (im !== null && !(Number.isInteger(im) && im > 0)) e.intM = 'Ingresá meses enteros, o dejalo vacío.'
    if (an !== null && !(Number.isInteger(an) && an >= 1950 && an <= 2100)) e.anio = 'Año no válido.'
    setErrors(e)
    if (Object.keys(e).length) return null
    return {
      tipo, marca: marca.trim(), modelo: modelo.trim(), identificador: ident.trim() || null, anio: an,
      horas_iniciales: ini, horas_por_dia: hd, dias_por_semana: ds, intervalo_horas: ih, intervalo_meses: im,
      activa, notas: notas.trim() || null,
    }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const input = validate()
    if (!input) return
    setSaving(true)
    try {
      if (maquinaria) await updateMaquinaria(maquinaria.id, input)
      else await createMaquinaria(input)
      await qc.invalidateQueries()
      toast.success(editing ? 'Maquinaria actualizada.' : 'Maquinaria agregada.')
      onClose()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar maquinaria' : 'Nueva maquinaria'} onClose={onClose} busy={saving} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="maq-form" loading={saving}>{editing ? 'Guardar cambios' : 'Agregar'}</Button>
      </>}>
      <form id="maq-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" required htmlFor="m-tipo">
          <Select id="m-tipo" value={tipo} onChange={(e) => cambiarTipo(e.target.value as TipoMaquinaria)}>
            {(Object.keys(TIPO_LABEL) as TipoMaquinaria[]).map((k) => <option key={k} value={k}>{TIPO_LABEL[k]}</option>)}
          </Select>
        </Field>
        <Field label="Patente / N° de serie / interno" htmlFor="m-ident">
          <Input id="m-ident" value={ident} onChange={(e) => setIdent(e.target.value)} maxLength={60} />
        </Field>
        <Field label="Marca" required error={errors.marca} htmlFor="m-marca">
          <Input id="m-marca" value={marca} onChange={(e) => setMarca(e.target.value)} invalid={!!errors.marca} maxLength={80} placeholder="Ej.: Caterpillar" autoFocus />
        </Field>
        <Field label="Modelo" required error={errors.modelo} htmlFor="m-modelo">
          <Input id="m-modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} invalid={!!errors.modelo} maxLength={80} placeholder="Ej.: D6T" />
        </Field>
        <Field label="Año" error={errors.anio} htmlFor="m-anio">
          <Input id="m-anio" inputMode="numeric" value={anio} onChange={(e) => setAnio(e.target.value)} invalid={!!errors.anio} maxLength={4} />
        </Field>
        <Field label="Horómetro actual (horas)" required error={errors.horasIni} htmlFor="m-hini"
          hint="Lectura del horómetro hoy. Después se suman las horas que cargues.">
          <NumberInput id="m-hini" value={horasIni} onChange={(e) => setHorasIni(e.target.value)} invalid={!!errors.horasIni} />
        </Field>
        <Field label="Horas que trabaja por día" required error={errors.hDia} htmlFor="m-hdia">
          <NumberInput id="m-hdia" value={hDia} onChange={(e) => setHDia(e.target.value)} invalid={!!errors.hDia} />
        </Field>
        <Field label="Días que trabaja por semana" required error={errors.dSem} htmlFor="m-dsem"
          hint={`Son ${Math.round((parseNum(hDia) || 0) * (parseNum(dSem) || 0) * 10) / 10} horas por semana.`}>
          <NumberInput id="m-dsem" value={dSem} onChange={(e) => setDSem(e.target.value)} invalid={!!errors.dSem} />
        </Field>
        <Field label="Service cada (horas)" required error={errors.intH} htmlFor="m-inth">
          <NumberInput id="m-inth" value={intH} onChange={(e) => setIntH(e.target.value)} invalid={!!errors.intH} />
        </Field>
        <Field label="o cada (meses)" error={errors.intM} htmlFor="m-intm" hint="Avisa por lo que ocurra primero. Vacío = solo por horas.">
          <NumberInput id="m-intm" value={intM} onChange={(e) => setIntM(e.target.value)} invalid={!!errors.intM} />
        </Field>
        <p className="rounded-lg bg-steel-50 px-3 py-2 text-xs text-steel-600 sm:col-span-2">
          <strong className="text-ink-900">Referencia para {TIPO_LABEL[tipo].toLowerCase()}:</strong> {INTERVALO_DEFECTO[tipo].nota} El manual del fabricante siempre prevalece.
        </p>
        <Field label="Notas" htmlFor="m-notas" className="sm:col-span-2">
          <Textarea id="m-notas" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} />
        </Field>
        <Checkbox className="sm:col-span-2" checked={activa} onChange={(e) => setActiva(e.target.checked)} label="Maquinaria activa (si está vendida o fuera de servicio, desmarcá)" />
      </form>
    </Modal>
  )
}
