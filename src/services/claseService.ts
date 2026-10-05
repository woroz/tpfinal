import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/error.js';
import { ESTADO_CLASE, ESTADO_INSCRIPCION } from '../utils/estados.js';
import { claseOcupaHorario } from '../utils/ocupacion.js';

export const claseService = {
  async crearClase(idProfesor: string, datos: {
    id_materia: string;
    titulo: string;
    tema: string;
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
  }
};
