export const ESTADO_CLASE = {
    pendiente: 'pendiente',
    disponible: 'disponible',
    confirmada: 'confirmada',
    cancelada: 'cancelada',
    finalizada: 'finalizada'
} as const

export const ESTADO_INSCRIPCION = {
    pendientePago: 'pendiente_pago',
    confirmada: 'confirmada',
    cancelada: 'cancelada'
} as const

export const ESTADO_PAGO = {
    pendiente: 'pendiente',
    aprobado: 'aprobado',
    rechazado: 'rechazado',
    reembolsado: 'reembolsado',
    reembolsoPendiente: 'reembolso_pendiente'
} as const
