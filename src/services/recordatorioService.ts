import nodemailer from 'nodemailer'
import { prisma } from '../utils/prisma.js'
import { ESTADO_INSCRIPCION } from '../utils/estados.js'

const ANTICIPACION_MINUTOS = 60
const VENTANA_MINUTOS = 10

const esc = (texto: string) =>
    texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const formatoFecha = (fecha: Date) =>
    fecha.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'full',
        timeStyle: 'short'
    })

function crearTransporte() {
    if (!process.env.SMTP_HOST) return null
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
}

export const recordatorioService = {
    async procesar() {
        const ahora = new Date()
        const desde = new Date(ahora.getTime() + (ANTICIPACION_MINUTOS - VENTANA_MINUTOS) * 60_000)
        const hasta = new Date(ahora.getTime() + (ANTICIPACION_MINUTOS + VENTANA_MINUTOS) * 60_000)

        const clases = await prisma.clase.findMany({
            where: {
                fecha_hora_inicio: { gte: desde, lt: hasta },
                estado: { not: 'cancelada' },
                inscripciones: { some: { estado: ESTADO_INSCRIPCION.confirmada } }
            },
            select: {
                id_clase: true,
                titulo: true,
                fecha_hora_inicio: true,
                profesor: {
                    select: {
                        usuario: { select: { id_usuario: true, nombre: true, email: true } }
                    }
                },
                inscripciones: {
                    where: { estado: ESTADO_INSCRIPCION.confirmada },
                    select: {
                        alumno: {
                            select: {
                                usuario: { select: { id_usuario: true, nombre: true, email: true } }
                            }
                        }
                    }
                }
            }
        })

        const transporte = crearTransporte()
        let enviados = 0
        let omitidos = 0
        let fallidos = 0

        for (const clase of clases) {
            const destinatarios = [
                clase.profesor.usuario,
                ...clase.inscripciones.map((inscripcion) => inscripcion.alumno.usuario)
            ]
            const fecha = formatoFecha(clase.fecha_hora_inicio)

            for (const usuario of destinatarios) {
                try {
                    await prisma.recordatorio.create({
                        data: {
                            id_clase: clase.id_clase,
                            id_usuario_destinatario: usuario.id_usuario
                        }
                    })
                } catch (error) {
                    if ((error as { code?: string }).code === 'P2002') {
                        omitidos++
                        continue
                    }
                    throw error
                }

                const titulo = `Recordatorio: ${clase.titulo}`
                const mensaje = `Recordatorio: tenés la clase "${clase.titulo}" el ${fecha}.`

                if (transporte) {
                    try {
                        await transporte.sendMail({
                            from: process.env.MAIL_FROM,
                            to: usuario.email,
                            subject: titulo,
                            html: `<p>Hola ${esc(usuario.nombre)},</p>
<p>Te recordamos que tenés la clase <b>${esc(clase.titulo)}</b> el <b>${esc(fecha)}</b>.</p>
<p>Conectate unos minutos antes para evitar demoras.</p>`
                        })
                    } catch (error) {
                        fallidos++
                        await prisma.recordatorio.delete({
                            where: {
                                id_clase_id_usuario_destinatario: {
                                    id_clase: clase.id_clase,
                                    id_usuario_destinatario: usuario.id_usuario
                                }
                            }
                        })
                        console.error('No se pudo enviar un recordatorio por correo', {
                            idClase: clase.id_clase,
                            idUsuario: usuario.id_usuario,
                            error
                        })
                        continue
                    }
                }

                await prisma.notificacion.create({
                    data: {
                        id_usuario: usuario.id_usuario,
                        id_clase: clase.id_clase,
                        tipo: 'recordatorio_clase',
                        titulo,
                        mensaje
                    }
                })
                enviados++
            }
        }

        return { clases: clases.length, enviados, omitidos, fallidos }
    }
}
