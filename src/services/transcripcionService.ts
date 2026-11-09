import Groq from "groq-sdk";
import { config } from "../config/index.js";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../utils/error.js";

const groq = new Groq({ apiKey: config.Groq.GROP_API_KEY })

const EXTENSIONES: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
}

async function verificarProfesorDeClase(id_clase: string, id_profesor?: string) {
    if (!id_profesor) throw new AppError('Profesor no identificado', 403)

    const clase = await prisma.clase.findFirst({
        where: { id_clase, id_profesor },
        select: { id_clase: true },
    })

    if (!clase) throw new AppError('La clase no existe o no sos su profesor', 403)
}

export const transcripcionService = {
    async transcribirChunk(id_clase: string, id_profesor: string | undefined, audioBuffer: Buffer, mimeType: string) {
        await verificarProfesorDeClase(id_clase, id_profesor)

        const tipoBase = mimeType.split(';')[0]
        const extension = EXTENSIONES[tipoBase] ?? "webm"

        const existente = await prisma.transcripcion.findUnique({ where: { id_clase } })

        const archivoAudio = new File([new Uint8Array(audioBuffer)], `chunk.${extension}`, { type: tipoBase })

        const respuesta = await groq.audio.transcriptions.create({
            file: archivoAudio,
            model: config.Groq.GROQ_MODEL,
            language: "es",
            prompt: existente?.contenido.slice(-200) || undefined,
        })

        const textoNuevo = respuesta.text.trim()
        if (textoNuevo.length < 2) return existente

        const textoAcumulado = existente?.contenido
            ? `${existente.contenido} ${textoNuevo}`
            : textoNuevo

        return prisma.transcripcion.upsert({
            where: { id_clase },
            update: { contenido: textoAcumulado, fecha_generacion: new Date(), resumen: null },
            create: {
                id_clase,
                contenido: textoAcumulado,
                idioma: "es",
                fecha_generacion: new Date(),
                visible_alumnos: false,
            },
        })
    },

    async obtenerTranscripcion(id_clase: string, rol: string, id_rol?: string) {
        const transcripcion = await prisma.transcripcion.findUnique({ where: { id_clase } })
        if (!transcripcion) throw new AppError('Todavia no hay transcripcion para esta clase', 404)

        if (rol === 'profesor') {
            await verificarProfesorDeClase(id_clase, id_rol)
            return transcripcion
        }

        if (rol === 'alumno') {
            if (!id_rol) throw new AppError('Alumno no identificado', 403)
            const inscripcion = await prisma.inscripcion.findFirst({
                where: { id_clase, id_alumno: id_rol },
                select: { asistio: true },
            })

            if (!inscripcion) throw new AppError('No estas inscripto en esta clase', 403)

            if (!inscripcion.asistio && !transcripcion.visible_alumnos) {
                throw new AppError('No tenés acceso a esta transcripción', 403)
            }
            return transcripcion
        }

        throw new AppError('No tenes permiso para ver esta transcripcion', 403)
    },

    async generarResumen(id_clase: string, rol: string, id_rol?: string) {
        const transcripcion = await transcripcionService.obtenerTranscripcion(id_clase, rol, id_rol)
        if (transcripcion.resumen) return transcripcion
        if (!transcripcion.contenido.trim()) throw new AppError('No hay transcripción para resumir', 404)

        const respuesta = await groq.chat.completions.create({
            model: config.Groq.GROQ_RESUMEN_MODEL,
            temperature: 0.3,
            messages: [
                { role: "system", content: "Sos un asistente que resume clases particulares. Respondé en español con: un resumen breve, los temas vistos en viñetas y los conceptos clave. No inventes nada que no esté en la transcripción. Escribí en texto plano: sin markdown, sin asteriscos, sin LaTeX; usá guiones para las viñetas y escribí las fórmulas como texto (ej: F = m · a)." },
                { role: "user", content: transcripcion.contenido },
            ],
        })

        const resumen = respuesta.choices[0]?.message?.content?.trim()
        if (!resumen) throw new AppError('No se pudo generar el resumen', 502)

        return prisma.transcripcion.update({ where: { id_clase }, data: { resumen } })
    },

    async cambiarVisibilidad(id_clase: string, id_profesor: string | undefined, visible: boolean) {
        await verificarProfesorDeClase(id_clase, id_profesor)

        return prisma.transcripcion.upsert({
            where: { id_clase },
            update: { visible_alumnos: visible },
            create: {
                id_clase,
                contenido: "",
                idioma: "es",
                fecha_generacion: new Date(),
                visible_alumnos: visible,
            },
        })
    },
}