import type { EstadoService } from '@/lib/maquinaria'

export const ESTADO_SERVICE_LABEL: Record<EstadoService, string> = {
  vencido: 'Service vencido', proximo: 'Service próximo', sin_service: 'Sin service registrado', al_dia: 'Al día',
}
export const ESTADO_SERVICE_TONE = { vencido: 'red', proximo: 'yellow', sin_service: 'gray', al_dia: 'green' } as const
