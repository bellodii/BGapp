import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export default function SinPermisoPage() {
  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <ShieldAlert className="h-12 w-12 text-brand-500" />
      <h1 className="text-xl font-extrabold">No tenés permiso para ver esta sección</h1>
      <p className="text-sm text-steel-500">
        Si creés que deberías tener acceso, pedile al administrador principal que habilite tu cuenta para este módulo.
      </p>
      <Link to="/configuracion"><Button variant="dark">Ir a mi configuración</Button></Link>
    </Card>
  )
}
