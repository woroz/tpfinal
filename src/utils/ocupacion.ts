import type { Prisma } from '../generated/prisma/client.js'
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from './estados.js'

export function claseOcupaHorario(ahora: Date): Prisma.ClaseWhereInput {
    return {
        OR: [
            { estado: { notIn: [ESTADO_CLASE.cancelada, ESTADO_CLASE.pendiente] } },
            {
                estado: ESTADO_CLASE.pendiente,
                inscripciones: {
                    some: {
                        estado: ESTADO_INSCRIPCION.pendientePago,
                        expiraEn: { gt: ahora }
                    }
                }
            }
        ]
    }
}
