import { prisma } from '../utils/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/error.js';
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from '../utils/estados.js';
import { claseOcupaHorario } from '../utils/ocupacion.js';
import { avisoHorarioService } from './avisoHorarioService.js';

export const claseService = {
  async crearClase(idProfesor: string, datos: {
    id_materia: string;
    titulo: string;
    tema: string;
    contenido?: string;
    fecha_hora_inicio: string | Date;
    fecha_hora_fin: string | Date;
    cupo_maximo: number;
    precio?: number;
    tipo: string;      
    origen: string;    
  }) {
    const inicio = new Date(datos.fecha_hora_inicio);
    const fin = new Date(datos.fecha_hora_fin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
        throw new AppError("Las fechas ingresadas no son validas.", 400);
    }

    if (inicio >= fin) {
        throw new AppError("La fecha y hora de inicio debe ser anterior a la de finalización.", 400);
    }

    if (datos.cupo_maximo <= 0) {
        throw new AppError("El cupo máximo debe ser mayor a cero.", 400);
    }

    const claseSuperpuesta = await prisma.clase.findFirst({
      where: {
        id_profesor: idProfesor,
        ...claseOcupaHorario(new Date()),
        fecha_hora_inicio: { lt: fin },
        fecha_hora_fin: { gt: inicio }
      }
    });

    if (claseSuperpuesta) {
        throw new AppError("No se puede crear la clase: El horario se superpone con otra clase de este profesor.", 400);
    }

    return await prisma.clase.create({
      data: {
        id_profesor: idProfesor,
        id_materia: datos.id_materia,
        titulo: datos.titulo,
        tema: datos.tema,
        contenido: datos.contenido?.trim() || null,
        fecha_hora_inicio: inicio,
        fecha_hora_fin: fin,
        cupo_maximo: datos.cupo_maximo,
        precio: datos.precio || 0,
        tipo: datos.tipo,     
        origen: datos.origen, 
        estado: ESTADO_CLASE.disponible
      }
    });
  },

  // El profesor cambia el horario de una clase y se avisa por mail a los alumnos inscriptos.
  async cambiarHorario(idProfesor: string, idClase: string, nuevoInicio: string | Date, nuevoFin: string | Date) {
    const clase = await prisma.clase.findUnique({ where: { id_clase: idClase } });
    if (!clase || clase.id_profesor !== idProfesor) {
      throw new AppError("Clase no encontrada.", 404);
    }

    if (clase.estado !== ESTADO_CLASE.disponible && clase.estado !== ESTADO_CLASE.confirmada) {
      throw new AppError("Solo se puede cambiar el horario de clases activas.", 400);
    }

    const inicio = new Date(nuevoInicio);
    const fin = new Date(nuevoFin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      throw new AppError("Las fechas ingresadas no son validas.", 400);
    }
    if (inicio >= fin) {
      throw new AppError("La fecha y hora de inicio debe ser anterior a la de finalización.", 400);
    }
    if (inicio < new Date()) {
      throw new AppError("El nuevo horario debe ser a futuro.", 400);
    }

    const superpuesta = await prisma.clase.findFirst({
      where: {
        id_profesor: idProfesor,
        id_clase: { not: idClase },
        ...claseOcupaHorario(new Date()),
        fecha_hora_inicio: { lt: fin },
        fecha_hora_fin: { gt: inicio }
      }
    });
    if (superpuesta) {
      throw new AppError("El nuevo horario se superpone con otra clase de este profesor.", 400);
    }

    const anterior = { inicio: clase.fecha_hora_inicio, fin: clase.fecha_hora_fin };
    const huboCambio =
      anterior.inicio.getTime() !== inicio.getTime() || anterior.fin.getTime() !== fin.getTime();

    const actualizada = await prisma.clase.update({
      where: { id_clase: idClase },
      data: { fecha_hora_inicio: inicio, fecha_hora_fin: fin }
    });

    if (huboCambio) {
      try {
        await avisoHorarioService.avisarCambioHorario(idClase, anterior);
      } catch (error) {
        // Si falla el mail, el cambio de horario igual queda guardado.
        console.error('Error al avisar el cambio de horario', error);
      }
    }

    return actualizada;
  },

  async listarProgramadas(idProfesor: string, historial: boolean) {
    const clases = await prisma.clase.findMany({
      where: {
        id_profesor: idProfesor,
        estado: { in: [ESTADO_CLASE.confirmada, ESTADO_CLASE.disponible] },
        ...(historial ? {} : { fecha_hora_fin: { gte: new Date() } })
      },
      include: {
        materia: true,
        inscripciones: {
          where: { estado: ESTADO_INSCRIPCION.confirmada },
          include: { alumno: { include: { usuario: { select: { nombre: true } } } } }
        }
      },
      orderBy: { fecha_hora_inicio: historial ? 'desc' : 'asc' }
    });

    return clases.map((clase: any) => ({
      id_clase: clase.id_clase,
      titulo: clase.titulo,
      tema: clase.tema,
      contenido: clase.contenido ?? null,
      materialUrl: clase.materialUrl ?? null,
      materialNombre: clase.materialNombre ?? null,
      materia: clase.materia.nombreMateria,
      inicio: clase.fecha_hora_inicio,
      fin: clase.fecha_hora_fin,
      precio: clase.precio ?? 0,
      tipo: clase.tipo,
      estado: clase.estado,
      cupo_maximo: clase.cupo_maximo,
      alumnos: clase.inscripciones.map((inscripcion: any) => ({
        id_alumno: inscripcion.id_alumno,
        nombre: inscripcion.alumno.usuario.nombre
      }))
    }));
  },

  async buscarClases(consulta: string, latitud: number, longitud: number, radio: number) {
    const consultaNormalizada = consulta
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(clase|clases|de|una|un|para)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!consultaNormalizada) {
      throw new AppError('Ingresa una materia o tema para buscar clases.', 400);
    }

    const distancia = Prisma.sql`(
      6371 * acos(LEAST(1, GREATEST(-1,
        cos(radians(${latitud})) * cos(radians(p.latitud_prof)) *
        cos(radians(p.longitud_prof) - radians(${longitud})) +
        sin(radians(${latitud})) * sin(radians(p.latitud_prof))
      )))
    )`;

    const clases = await prisma.$queryRaw<Array<{
      id_clase: string;
      titulo: string;
      tema: string;
      contenido: string | null;
      materialUrl: string | null;
      materialNombre: string | null;
      inicio: Date;
      fin: Date;
      cupo_maximo: number;
      cupos_ocupados: number;
      precio: number | null;
      id_profesor: string;
      profesor: string;
      id_materia: string;
      materia: string;
      area: string;
      distancia_km: number;
      relevancia: number;
    }>>`
      SELECT
        c.id_clase,
        c.titulo,
        c.tema,
        c.contenido,
        c."materialUrl",
        c."materialNombre",
        c.fecha_hora_inicio AS inicio,
        c.fecha_hora_fin AS fin,
        c.cupo_maximo,
        (
          SELECT COUNT(*)::int
          FROM "Inscripcion" i
          WHERE i.id_clase = c.id_clase
            AND (
              i.estado = ${ESTADO_INSCRIPCION.confirmada}
              OR (
                i.estado = ${ESTADO_INSCRIPCION.pendientePago}
                AND i."expiraEn" > NOW()
              )
            )
        ) AS cupos_ocupados,
        c.precio,
        p.id_profesor,
        u.nombre AS profesor,
        m.id_materia,
        m."nombreMateria" AS materia,
        ac."nombreArea" AS area,
        ${distancia} AS distancia_km,
        (
          CASE
            WHEN translate(lower(c.titulo), 'áéíóúüñ', 'aeiouun')
              LIKE '%' || ${consultaNormalizada} || '%' THEN 4
            WHEN translate(lower(c.tema), 'áéíóúüñ', 'aeiouun')
              LIKE '%' || ${consultaNormalizada} || '%' THEN 3
            WHEN translate(lower(m."nombreMateria"), 'áéíóúüñ', 'aeiouun')
              LIKE '%' || ${consultaNormalizada} || '%' THEN 2
            WHEN translate(lower(ac."nombreArea"), 'áéíóúüñ', 'aeiouun')
              LIKE '%' || ${consultaNormalizada} || '%' THEN 1
            ELSE 0
          END
        ) AS relevancia
      FROM "Clase" c
      JOIN "Profesor" p ON p.id_profesor = c.id_profesor
      JOIN "Usuario" u ON u.id_usuario = p.id_usuario
      JOIN "materia" m ON m.id_materia = c.id_materia
      JOIN "areaConocimiento" ac ON ac.id_area = m.id_area_conocimiento
      WHERE c.estado = ${ESTADO_CLASE.disponible}
        AND c.tipo <> 'individual'
        AND c.origen <> 'reserva'
        AND c.fecha_hora_inicio >= NOW()
        AND p.latitud_prof IS NOT NULL
        AND p.longitud_prof IS NOT NULL
        AND ${distancia} <= ${radio}
        AND (
          translate(lower(c.titulo), 'áéíóúüñ', 'aeiouun') LIKE '%' || ${consultaNormalizada} || '%'
          OR translate(lower(c.tema), 'áéíóúüñ', 'aeiouun') LIKE '%' || ${consultaNormalizada} || '%'
          OR translate(lower(m."nombreMateria"), 'áéíóúüñ', 'aeiouun') LIKE '%' || ${consultaNormalizada} || '%'
          OR translate(lower(ac."nombreArea"), 'áéíóúüñ', 'aeiouun') LIKE '%' || ${consultaNormalizada} || '%'
        )
      ORDER BY relevancia DESC, distancia_km ASC, c.fecha_hora_inicio ASC
      LIMIT 50
    `;

    return clases
      .filter((clase) => clase.cupos_ocupados < clase.cupo_maximo)
      .map((clase) => ({
        id_clase: clase.id_clase,
        titulo: clase.titulo,
        tema: clase.tema,
        contenido: clase.contenido,
        materialUrl: clase.materialUrl,
        materialNombre: clase.materialNombre,
        inicio: clase.inicio,
        fin: clase.fin,
        precio: clase.precio ?? 0,
        cupos_disponibles: clase.cupo_maximo - clase.cupos_ocupados,
        profesor: {
          id_profesor: clase.id_profesor,
          nombre: clase.profesor
        },
        materia: {
          id_materia: clase.id_materia,
          nombre: clase.materia,
          area: clase.area
        },
        distancia_km: Number(Number(clase.distancia_km).toFixed(2))
      }));
  }
};
