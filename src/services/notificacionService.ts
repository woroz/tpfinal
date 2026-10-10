import nodemailer from 'nodemailer'
import { prisma } from '../utils/prisma.js'

const transporte = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmt = (d: Date) =>
  d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'short' })

async function crearNotificacionParaInscripcion(
  idInscripcion: string,
  tipo: 'reserva_confirmada' | 'reserva_no_disponible',
  titulo: string,
  mensaje: string
) {
  const inscripcion = await prisma.inscripcion.findUnique({
    where: { id_inscripcion: idInscripcion },
    include: {
      clase: { select: { id_clase: true, titulo: true } },
      alumno: { select: { id_usuario: true } }
    }
  })

  if (!inscripcion) return

  await prisma.notificacion.create({
    data: {
      id_usuario: inscripcion.alumno.id_usuario,
      id_clase: inscripcion.clase.id_clase,
      tipo,
      titulo,
      mensaje
    }
  })
}

export const notificacionService = {
  async listar(idUsuario: string) {
    return prisma.notificacion.findMany({
      where: { id_usuario: idUsuario },
      orderBy: { createdAt: 'desc' }
    })
  },

  async marcarLeida(idUsuario: string, idNotificacion: string) {
    await prisma.notificacion.updateMany({
      where: { id_usuario: idUsuario, id_notificacion: idNotificacion },
      data: { leida: true }
    })
  },

  async reservaConfirmada(idInscripcion: string) {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id_inscripcion: idInscripcion },
      include: { clase: true, alumno: { include: { usuario: { select: { id_usuario: true } } } } }
    })

    if (!inscripcion) return

    await prisma.notificacion.create({
      data: {
        id_usuario: inscripcion.alumno.usuario.id_usuario,
        id_clase: inscripcion.id_clase,
        tipo: 'reserva_confirmada',
        titulo: 'Reserva confirmada',
        mensaje: `Tu reserva para "${inscripcion.clase.titulo}" fue confirmada.`
      }
    })
  },

  async reservaNoDisponible(idInscripcion: string, reembolsado: boolean) {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id_inscripcion: idInscripcion },
      include: { clase: true, alumno: { include: { usuario: { select: { id_usuario: true } } } } }
    })

    if (!inscripcion) return

    await prisma.notificacion.create({
      data: {
        id_usuario: inscripcion.alumno.usuario.id_usuario,
        id_clase: inscripcion.id_clase,
        tipo: 'reserva_no_disponible',
        titulo: 'Reserva no disponible',
        mensaje: reembolsado
          ? `La reserva para "${inscripcion.clase.titulo}" no quedó disponible y se procesó tu reembolso.`
          : `La reserva para "${inscripcion.clase.titulo}" no quedó disponible.`
      }
    })
  },

  /** Llamar despues de actualizar una clase cuyo horario cambio. */
  async avisarCambioHorario(idClase: string, anterior: { inicio: Date; fin: Date }) {
    const clase = await prisma.clase.findUnique({ where: { id_clase: idClase } })
    if (!clase) return

    const inscripciones = await prisma.inscripcion.findMany({
      where: { id_clase: idClase, estado: 'confirmada' },
      select: { id_alumno: true }
    })
    if (!inscripciones.length) return

    const alumnos = await prisma.alumno.findMany({
      where: { id_alumno: { in: inscripciones.map((i) => i.id_alumno) } },
      select: { id_usuario: true }
    })
    const usuarios = await prisma.usuario.findMany({
      where: { id_usuario: { in: alumnos.map((a) => a.id_usuario) } },
      select: { id_usuario: true, email: true, nombre: true }
    })

    try {
      await prisma.notificacion.createMany({
        data: usuarios.map((u) => ({
          id_usuario: u.id_usuario,
          id_clase: idClase,
          tipo: 'cambio_horario',
          titulo: `Cambio de horario: ${clase.titulo}`,
          mensaje: `El profesor cambio el horario de "${clase.titulo}". Antes: ${fmt(anterior.inicio)}. Ahora: ${fmt(clase.fecha_hora_inicio)}.`
        }))
      })
    } catch (error) {
      console.error('No se pudieron guardar las notificaciones de cambio de horario', error)
    }

    const resultados = await Promise.allSettled(
      usuarios.map((u) =>
        transporte.sendMail({
          from: process.env.MAIL_FROM,
          to: u.email,
          subject: `Cambio de horario: ${clase.titulo}`,
          html: `<p>Hola ${esc(u.nombre)},</p>
<p>El profesor modifico el horario de la clase <b>${esc(clase.titulo)}</b>.</p>
<p><b>Antes:</b> ${fmt(anterior.inicio)}<br><b>Ahora:</b> ${fmt(clase.fecha_hora_inicio)}</p>
<p>Si no podes asistir en el nuevo horario, comunicate con el profesor.</p>`
        })
      )
    )
    const fallidos = resultados.filter((r) => r.status === 'rejected').length
    if (fallidos) console.error(`No se pudieron enviar ${fallidos} mails de cambio de horario`)
  }
}
