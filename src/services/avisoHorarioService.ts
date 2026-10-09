import nodemailer from 'nodemailer'
import { prisma } from '../utils/prisma.js'
import { ESTADO_INSCRIPCION } from '../utils/estados.js'

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmt = (d: Date) =>
  d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'short' })

function crearTransporte() {
  if (!process.env.SMTP_HOST) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
}

export const avisoHorarioService = {
  /** Avisa (mail + notificacion en la app) a los alumnos inscriptos cuando cambia el horario de una clase. */
  async avisarCambioHorario(idClase: string, anterior: { inicio: Date; fin: Date }) {
    const clase = await prisma.clase.findUnique({ where: { id_clase: idClase } })
    if (!clase) return

    const inscripciones = await prisma.inscripcion.findMany({
      where: { id_clase: idClase, estado: ESTADO_INSCRIPCION.confirmada },
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

    const titulo = `Cambio de horario: ${clase.titulo}`
    const texto = `El profesor cambio el horario de "${clase.titulo}". Antes: ${fmt(anterior.inicio)}. Ahora: ${fmt(clase.fecha_hora_inicio)}.`

    // Notificacion dentro de la app (tabla Notificacion)
    try {
      await prisma.notificacion.createMany({
        data: usuarios.map((u) => ({
          id_usuario: u.id_usuario,
          id_clase: idClase,
          tipo: 'cambio_horario',
          titulo,
          mensaje: texto
        }))
      })
    } catch (error) {
      console.error('No se pudieron guardar las notificaciones de cambio de horario', error)
    }

    // Mail
    const transporte = crearTransporte()
    if (!transporte) {
      console.warn('SMTP_HOST no configurado: no se enviaron mails de cambio de horario')
      return
    }
    const resultados = await Promise.allSettled(
      usuarios.map((u) =>
        transporte.sendMail({
          from: process.env.MAIL_FROM,
          to: u.email,
          subject: titulo,
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
