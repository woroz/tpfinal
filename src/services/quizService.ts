import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';

export const quizService = {
    async crearQuiz(id_profesor: string, data: {
        id_clase: string,
        titulo: string,
        preguntas: {
            enunciado: string,
            orden: number,
            opciones: {
                texto: string,
                es_correcto: boolean
            }[]
        }[]
    }) {
        const clase = await prisma.clase.findFirst({
            where: {
                id_clase: data.id_clase,
                id_profesor
            },
            select: { id_clase: true }
        });
        if (!clase) {
            throw new AppError('La clase no existe o no es tuya', 403);
        }
        return prisma.quiz.create({
            data: {
                id_clase: data.id_clase,
                id_profesor,
                titulo: data.titulo,
                estado: true,
                preguntas: {
                    create: data.preguntas.map(p => ({
                        enunciado: p.enunciado,
                        orden: p.orden,
                        opciones: {
                            create: p.opciones
                        }
                    }))
                }
            },
            include: {
                preguntas: {
                    orderBy: { orden: 'asc' },
                    include: { opciones: true }
                }
            }
        });
    },

    async listarPorClase(
        id_clase: string,
        rol: string,
        id_rol: string
    ) {
        if (rol === 'alumno') {
            const inscripcion = await prisma.inscripcion.findFirst({
                where: {
                    id_clase,
                    id_alumno: id_rol,
                    estado: 'confirmada'
                }
            });

            if (!inscripcion) {
                throw new AppError('No estás inscripto en esta clase', 403);
            }
        } else {
            const clase = await prisma.clase.findFirst({
                where: {
                    id_clase,
                    id_profesor: id_rol
                }
            });

            if (!clase) {
                throw new AppError('La clase no existe o no es tuya', 403);
            }
        }
        return prisma.quiz.findMany({
            where: {
                id_clase,
                ...(rol === 'alumno' ? { estado: true } : {})
            },
            orderBy: { fecha_creacion: 'desc' },
            select: {
                id_quiz: true,
                titulo: true,
                fecha_creacion: true,
                estado: true,
                _count: {
                    select: {
                        preguntas: true,
                        intentos: true
                    }
                }
            }
        });
    },

    async obtenerQuiz(
        id_quiz: string,
        rol: string,
        id_rol: string
    ) {
        const quiz = await prisma.quiz.findUnique({
            where: { id_quiz },
            include: {
                preguntas: {
                    orderBy: { orden: 'asc' },
                    include: { opciones: true }
                }
            }
        });
        if (!quiz) {
            throw new AppError('El quiz no existe', 404);
        }
        if (rol === 'profesor') {
            if (quiz.id_profesor !== id_rol) {
                throw new AppError('El quiz no es tuyo', 403);
            }
        } else {
            const inscripcion = await prisma.inscripcion.findFirst({
                where: {
                    id_clase: quiz.id_clase,
                    id_alumno: id_rol,
                    estado: 'confirmada'
                }
            });

            if (!inscripcion || !quiz.estado) {
                throw new AppError('No tenés acceso a este quiz', 403);
            }
        }

        if (rol === 'alumno') {
            return {
                ...quiz,
                preguntas: quiz.preguntas.map(p => ({
                    ...p,
                    opciones: p.opciones.map(o => ({
                        id_opcion: o.id_opcion,
                        texto: o.texto
                    }))
                }))
            };
        }
        return quiz;
    },

    async cambiarEstado(
        id_quiz: string,
        id_profesor: string,
        estado: boolean
    ) {
        const quiz = await prisma.quiz.findFirst({
            where: { id_quiz, id_profesor }
        });

        if (!quiz) {
            throw new AppError('El quiz no existe o no es tuyo', 404);
        }

        return prisma.quiz.update({
            where: { id_quiz },
            data: { estado }
        });
    },

    async responder(
        id_quiz: string,
        id_alumno: string,
        data: {
            respuestas: {
                id_pregunta: string,
                id_opcion: string
            }[]
        }
    ) {
        const quiz = await prisma.quiz.findFirst({
            where: {
                id_quiz,
                estado: true,
                clase: {
                    inscripciones: {
                        some: {
                            id_alumno,
                            estado: 'confirmada'
                        }
                    }
                }
            },
            include: {
                preguntas: {
                    include: { opciones: true }
                }
            }
        });

        if (!quiz) {
            throw new AppError('El quiz no existe, está desactivado o no estás inscripto', 403);
        }
        if (data.respuestas.length !== quiz.preguntas.length) {
            throw new AppError('Debés responder todas las preguntas', 400);
        }
        const preguntasRespondidas = new Set(
            data.respuestas.map(r => r.id_pregunta)
        );
        if (preguntasRespondidas.size !== data.respuestas.length) {
            throw new AppError('No podés responder dos veces la misma pregunta', 400);
        }

        let correctas = 0;

        for (const respuesta of data.respuestas) {
            const pregunta = quiz.preguntas.find(
                p => p.id_pregunta === respuesta.id_pregunta
            );
            if (!pregunta) {
                throw new AppError('Una pregunta no pertenece a este quiz', 400);
            }
            const opcion = pregunta.opciones.find(
                o => o.id_opcion === respuesta.id_opcion
            );
            if (!opcion) {
                throw new AppError('Una opción no pertenece a la pregunta indicada', 400);
            }
            if (opcion.es_correcto) {
                correctas++;
            }
        }

        const puntaje = Number(
            ((correctas / quiz.preguntas.length) * 10).toFixed(2)
        );

        const ahora = new Date();

        return prisma.intentoQuiz.create({
            data: {
                id_quiz,
                id_alumno,
                fecha_inicio: ahora,
                fecha_fin: ahora,
                puntaje,
                respuestas: {
                    create: data.respuestas.map(r => ({
                        id_opcion: r.id_opcion
                    }))
                }
            },
            select: {
                id_intento: true,
                id_quiz: true,
                fecha_inicio: true,
                fecha_fin: true,
                puntaje: true
            }
        });
    },

    async listarResultados(
        id_quiz: string,
        id_profesor: string
    ) {
        const quiz = await prisma.quiz.findFirst({
            where: { id_quiz, id_profesor },
            select: {
                id_quiz: true,
                titulo: true
            }
        });

        if (!quiz) {
            throw new AppError('El quiz no existe o no es tuyo', 404);
        }
        const intentos = await prisma.intentoQuiz.findMany({
            where: { id_quiz },
            orderBy: { fecha_inicio: 'desc' },
            select: {
                id_intento: true,
                fecha_inicio: true,
                fecha_fin: true,
                puntaje: true,
                alumno: {
                    select: {
                        usuario: {
                            select: { nombre: true }
                        }
                    }
                }
            }
        });

        return { quiz, intentos };
    },

    async misIntentos(
        id_quiz: string,
        id_alumno: string
    ) {
        const quiz = await prisma.quiz.findFirst({
            where: {
                id_quiz,
                estado: true,
                clase: {
                    inscripciones: {
                        some: {
                            id_alumno,
                            estado: 'confirmada'
                        }
                    }
                }
            },
            select: { id_quiz: true }
        });
        if (!quiz) {
            throw new AppError('El quiz no existe o no tenés acceso', 404);
        }
        return prisma.intentoQuiz.findMany({
            where: { id_quiz, id_alumno },
            orderBy: { fecha_inicio: 'desc' },
            select: {
                id_intento: true,
                fecha_inicio: true,
                fecha_fin: true,
                puntaje: true
            }
        });
    },


async verDetalleIntento(
    id_intento: string,
    rol: string,
    id_rol: string
) {
    const intento = await prisma.intentoQuiz.findUnique({
        where: { id_intento },
        include: {
            quiz: {
                select: {
                    id_quiz: true,
                    titulo: true,
                    id_profesor: true
                }
            },
            respuestas: {
                include: {
                    opcion: {
                        include: {
                            pregunta: {
                                include: {
                                    opciones: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    if (!intento) {
        throw new AppError('El intento no existe', 404);
    }
    if (rol === 'alumno' && intento.id_alumno !== id_rol) {
        throw new AppError('No tenés permiso para ver este intento', 403);
    }
    if (rol === 'profesor' && intento.quiz.id_profesor !== id_rol) {
        throw new AppError('No tenés permiso para ver este intento', 403);
    }

    const respuestas = intento.respuestas
        .map(r => {
            const pregunta = r.opcion.pregunta;

            return {
                id_pregunta: pregunta.id_pregunta,
                enunciado: pregunta.enunciado,
                orden: pregunta.orden,

                opcion_seleccionada: {
                    id_opcion: r.opcion.id_opcion,
                    texto: r.opcion.texto,
                    es_correcto: r.opcion.es_correcto
                },

                opciones_correctas: pregunta.opciones
                    .filter(o => o.es_correcto)
                    .map(o => ({
                        id_opcion: o.id_opcion,
                        texto: o.texto
                    }))
            };
        })
        .sort((a, b) => a.orden - b.orden);

    return {
        id_intento: intento.id_intento,
        quiz: intento.quiz.titulo,
        fecha_inicio: intento.fecha_inicio,
        fecha_fin: intento.fecha_fin,
        puntaje: intento.puntaje,
        respuestas
    };
},

};