import { prisma } from '../utils/prisma.js'; 
import { AppError } from '../utils/error.js';

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

    if (inicio >= fin) {
        throw new AppError("La fecha y hora de inicio debe ser anterior a la de finalización.", 400);
    }

    if (datos.cupo_maximo <= 0) {
        throw new AppError("El cupo máximo debe ser mayor a cero.", 400);
    }

    const claseSuperpuesta = await prisma.clase.findFirst({
      where: {
        id_profesor: idProfesor,
        estado: { not: "cancelada" }, 
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
        estado: "disponible"
      }
    });
  }
};