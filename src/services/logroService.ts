import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import { fechaLocalISO } from '../utils/fechas.js';
import type { Role, Prisma } from '../generated/prisma/client.js';
import type { JwtUser } from '../types/jwt.js';

const DIA = 86_400_000;

type Actividad = {
    clases: Array<{
        id_clase: string;
        id_materia: string;
        fecha_hora_inicio: Date;
        fecha_hora_fin: Date;
        tipo: string;
        materialUrl: string | null;
        _count: { archivosPdf: number };
        inscripciones: Array<{
            id_alumno: string
        }>;
    }>;
    resenas: number;
    quizzes: Array<{ 
        id_quiz: string
    }>;
    devoluciones: Array<{
        id_alumno: string;
        id_clase: string;
        nota: string | null;
        calificacion: number | null;
        createdAt: Date;
    }>;
};

export const logroService = {
    async listarLogros(id_usuario: string, id_rol: string, rol: Role) {
        if (rol !== 'profesor' && rol !== 'alumno') {
            throw new AppError('Rol sin logros disponibles', 403);
        }
        if (!id_rol) throw new AppError('El usuario no tiene un perfil asociado', 409);

        const logros = await prisma.logro.findMany({
            where: { roles_objetivo: { has: rol } },
            orderBy: { nombre: 'asc' }
        });
        if (logros.length === 0) return [];

        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario },
            select: {
                nombre: true,
                createdAt: true,
                perfil: { select: { biografia: true, avatarURL: true } }
            }
        });
        if (!usuario) throw new AppError('Usuario no encontrado', 404);

        const obtenidos = await prisma.logroObtenido.findMany({ where: { id_usuario } });
        const ahora = new Date();
        const actividad = await logroService.obtenerActividad(id_rol, rol, ahora);
        const resultado = [];

        for (const logro of logros) {
            const progreso = logroService.calcularProgreso(logro, usuario, actividad, ahora);
            const obtenido = obtenidos.find(item => item.id_logro === logro.id_logro);
            let fechaObtencion = obtenido?.fechaObtencion ?? null;

            if (!fechaObtencion && progreso.actual >= progreso.objetivo) {
                fechaObtencion = await logroService.otorgarLogro(id_usuario, logro.id_logro, logro.nombre);
            }
            if (fechaObtencion) {
                progreso.actual = progreso.objetivo;
                progreso.pendientes = [];
            }

            const actual = Math.min(progreso.actual, progreso.objetivo);
            const restante = progreso.objetivo - actual;
            let estado = 'pendiente';
            if (actual > 0) estado = 'en_progreso';
            if (fechaObtencion) estado = 'obtenido';

            let textoRestante: string | null = `Restan ${restante} ${progreso.unidad}`;
            if (progreso.pendientes.length > 0) {
                textoRestante = `Te falta completar: ${progreso.pendientes.join(', ')}`;
            }
            if (restante === 0) textoRestante = null;

            resultado.push({
                ...logro,
                estado,
                fechaObtencion,
                progreso: {
                    actual,
                    objetivo: progreso.objetivo,
                    porcentaje: Math.round(actual / progreso.objetivo * 10000) / 100,
                    restante,
                    unidad: progreso.unidad,
                    texto: `${actual} de ${progreso.objetivo} ${progreso.unidad}`,
                    textoRestante,
                    pendientes: progreso.pendientes
                }
            });
        }
        return resultado;
    },

    async listarLogrosObtenidos(id_usuario: string, id_rol: string, rol: Role) {
        const logros = await logroService.listarLogros(id_usuario, id_rol, rol);
        return logros.filter(logro => logro.fechaObtencion !== null);
    },

    async logroEspecifico(id_logro: string, id_usuario: string, rol: Role) {
        const logroEspecifico = await prisma.logro.findFirst({
            where: { 
                id_logro, roles_objetivo: { has: rol } 
            },
            select: {
                id_logro: true,
                nombre: true, 
                descripcion: true,
                condicion: true,
                objetivo: true,
                obtenidos: {
                    where: {
                        id_usuario
                    },
                    select: {
                        fechaObtencion: true
                    }
                }
            }
        });
        if (!logroEspecifico) throw new AppError('Logro no encontrado', 404);

        return logroEspecifico
    },

    async obtenerActividad(id_rol: string, rol: Role, ahora: Date): Promise<Actividad> {
        const filtro: Prisma.ClaseWhereInput = {
            fecha_hora_fin: { lte: ahora },
            estado: { not: 'cancelada' }
        };
        if (rol === 'profesor') {
            filtro.id_profesor = id_rol;
            filtro.inscripciones = { some: { estado: 'confirmada', asistio: true } };
        } else {
            filtro.inscripciones = { some: { id_alumno: id_rol, estado: 'confirmada', asistio: true } };
        }

        const filtroAsistencia: Prisma.InscripcionWhereInput = { estado: 'confirmada', asistio: true };
        if (rol === 'alumno') filtroAsistencia.id_alumno = id_rol;

        const clases = await prisma.clase.findMany({
            where: filtro,
            select: {
                id_clase: true, id_materia: true, fecha_hora_inicio: true, fecha_hora_fin: true,
                tipo: true, materialUrl: true,
                _count: { select: { archivosPdf: true } },
                inscripciones: { where: filtroAsistencia, select: { id_alumno: true } }
            }
        });
        let resenas = 0;
        let quizzes: Actividad['quizzes'] = [];
        let devoluciones: Actividad['devoluciones'] = [];

        if (rol === 'profesor') {
            resenas = await prisma.resena.count({ where: { id_profesor: id_rol } });
            devoluciones = await prisma.registroActividadAlumno.findMany({
                where: { id_profesor: id_rol, id_clase: { in: clases.map(clase => clase.id_clase) } },
                select: { id_alumno: true, id_clase: true, nota: true, calificacion: true, createdAt: true }
            });
        } else {
            resenas = await prisma.resena.count({ where: { id_alumno: id_rol } });
            quizzes = await prisma.intentoQuiz.findMany({
                where: { id_alumno: id_rol, fecha_fin: { lte: ahora } },
                distinct: ['id_quiz'],
                select: { id_quiz: true }
            });
        }
        return { clases, resenas, quizzes, devoluciones };
    },

    calcularProgreso(
        logro: { nombre: string; objetivo: number },
        usuario: { nombre: string; createdAt: Date; perfil: { biografia: string | null; avatarURL: string | null } | null },
        actividad: Actividad,
        ahora: Date
    ) {
        const { clases, resenas, quizzes, devoluciones } = actividad;
        let actual = 0
        let objetivo = logro.objetivo
        let unidad = ''
        const pendientes: string[] = []
        if (!Number.isInteger(objetivo) || objetivo <= 0) throw new AppError(`Objetivo inválido para ${logro.nombre}`, 500)
        switch (logro.nombre) {
          case 'Mi presentación':
            if (objetivo !== 3) throw new AppError('Mi presentación debe tener objetivo 3', 500)
            if (!usuario.nombre.trim()) pendientes.push('nombre')
            if (!usuario.perfil?.biografia?.trim()) pendientes.push('biografía')
            if (!usuario.perfil?.avatarURL?.trim()) pendientes.push('avatar')
            actual = 3 - pendientes.length
            unidad = 'campos'
            break
          case 'Un mes juntos':
          case 'Parte de la comunidad':
          case 'Primer aniversario': {
            actual = Math.max(0, Math.floor((ahora.getTime() - usuario.createdAt.getTime()) / DIA))
            if (logro.nombre === 'Primer aniversario') {
              const aniversario = new Date(usuario.createdAt)
              aniversario.setUTCFullYear(aniversario.getUTCFullYear() + 1)
              objetivo = Math.round((aniversario.getTime() - usuario.createdAt.getTime()) / DIA)
            }
            unidad = 'días'
            break
          }
          case 'Constancia':
            actual = logroService.calcularSemanasConsecutivas(clases.map(c => c.fecha_hora_inicio))
            unidad = 'semanas'
            break
          case 'Aprendiz constante':
          case 'Experiencia docente':
            actual = clases.length
            unidad = 'clases'
            break
          case 'A practicar':
            actual = quizzes.length
            unidad = 'quizzes'
            break
          case 'Explorador del conocimiento':
            actual = new Set(clases.map(c => c.id_materia)).size
            unidad = 'materias'
            break
          case 'Tu opinión cuenta':
          case 'Tu enseñanza deja huella':
            actual = resenas
            unidad = 'reseñas'
            break
          case 'Paso a paso': {
            const porMateria = new Map<string, number>()
            clases.forEach(c => porMateria.set(c.id_materia, (porMateria.get(c.id_materia) ?? 0) + 1))
            actual = Math.max(0, ...porMateria.values())
            unidad = 'clases de una misma materia'
            break
          }
          case 'Llegar a más personas':
            actual = new Set(clases.flatMap(c => c.inscripciones.map(i => i.id_alumno))).size
            unidad = 'alumnos'
            break
          case 'Material de apoyo':
            actual = clases.filter(c => c._count.archivosPdf > 0 || Boolean(c.materialUrl)).length
            unidad = 'clases con material'
            break
          case 'Acompañamiento': {
            const finales = new Map(clases.map(c => [c.id_clase, c.fecha_hora_fin]))
            actual = new Set(devoluciones.filter(d =>
              (d.calificacion !== null || Boolean(d.nota?.trim())) && d.createdAt >= finales.get(d.id_clase)!
            ).map(d => d.id_alumno)).size
            unidad = 'alumnos'
            break
          }
          case 'Aprender en equipo':
            actual = clases.filter(c => c.tipo === 'grupal').length
            unidad = 'clases grupales'
            break
          default:
            throw new AppError(`El logro "${logro.nombre}" no tiene un cálculo configurado`, 500)
        }
        return { actual, objetivo, unidad, pendientes };
    },

    async otorgarLogro(id_usuario: string, id_logro: string, nombre: string) {
        return await prisma.$transaction(async tx => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id_usuario}))`;
            const existente = await tx.logroObtenido.findFirst({ where: { id_usuario, id_logro } });
            if (existente) return existente.fechaObtencion;

            const obtenido = await tx.logroObtenido.create({ data: { id_usuario, id_logro } });
            await tx.notificacion.create({
                data: {
                    id_usuario,
                    tipo: 'logro_obtenido',
                    titulo: 'Nuevo logro obtenido',
                    mensaje: `Obtuviste el logro "${nombre}".`
                }
            });
            return obtenido.fechaObtencion;
        });
    },

    async actualizarSeguro(usuario: Pick<JwtUser, 'id_usuario' | 'id_rol' | 'rol'>) {
        try {
            if (!usuario.id_rol) throw new AppError('El usuario no tiene un perfil asociado', 409);
            await logroService.listarLogros(usuario.id_usuario, usuario.id_rol, usuario.rol);
        } catch (error) {
            // La actividad ya se guardó; la revisión programada volverá a evaluar los logros.
            console.error('No se pudieron actualizar los logros', usuario.id_usuario, error);
        }
    },

    async actualizarPorRol(rol: 'profesor' | 'alumno', id_rol: string) {
        let perfil;
        if (rol === 'profesor') {
            perfil = await prisma.profesor.findUnique({ where: { id_profesor: id_rol }, select: { id_usuario: true } });
        } else {
            perfil = await prisma.alumno.findUnique({ where: { id_alumno: id_rol }, select: { id_usuario: true } });
        }
        if (perfil) await logroService.actualizarSeguro({ id_usuario: perfil.id_usuario, id_rol, rol });
    },

    async actualizarTodos() {
        let cursor: string | undefined;
        let procesados = 0;
        let fallidos = 0;
        while (true) {
            const consulta: Prisma.UsuarioFindManyArgs = {
                where: { rol: { in: ['profesor', 'alumno'] } },
                orderBy: { id_usuario: 'asc' },
                take: 100
            };
            if (cursor) {
                consulta.cursor = { id_usuario: cursor };
                consulta.skip = 1;
            }
            const usuarios = await prisma.usuario.findMany({
                ...consulta,
                select: {
                    id_usuario: true, rol: true,
                    alumno: { select: { id_alumno: true } },
                    profesor: { select: { id_profesor: true } }
                }
            });
            if (usuarios.length === 0) break;
            for (const usuario of usuarios) {
                try {
                    let id_rol = usuario.alumno?.id_alumno;
                    if (usuario.rol === 'profesor') id_rol = usuario.profesor?.id_profesor;
                    if (!id_rol) throw new AppError('Perfil no encontrado', 409);
                    await logroService.listarLogros(usuario.id_usuario, id_rol, usuario.rol);
                    procesados++;
                } catch (error) {
                    fallidos++;
                    console.error('No se pudieron actualizar los logros', usuario.id_usuario, error);
                }
            }
            cursor = usuarios[usuarios.length - 1].id_usuario;
        }
        return { procesados, fallidos };
    },
  calcularSemanasConsecutivas(fechas: Date[]) {
    const semanas = [...new Set(fechas.map(fecha => {
      const dia = new Date(`${fechaLocalISO(fecha)}T00:00:00Z`)
      return (dia.getTime() - ((dia.getUTCDay() + 6) % 7) * DIA) / DIA
    }))].sort((a, b) => a - b)
    let mayor = 0
    let racha = 0
    semanas.forEach((semana, i) => {
      racha = i > 0 && semana - semanas[i - 1] === 7 ? racha + 1 : 1
      mayor = Math.max(mayor, racha)
    })
    return mayor
  },

};
