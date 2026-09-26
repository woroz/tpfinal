-- CreateEnum
CREATE TYPE "Role" AS ENUM ('profesor', 'alumno');

-- CreateEnum
CREATE TYPE "Visibilidad" AS ENUM ('publico', 'privado');

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contraseña" TEXT NOT NULL,
    "rol" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Profesor" (
    "id_profesor" TEXT NOT NULL,
    "tarifa" INTEGER,
    "descripcion" TEXT,
    "longitus_prof" DOUBLE PRECISION,
    "latitu_prof" DOUBLE PRECISION,

    CONSTRAINT "Profesor_pkey" PRIMARY KEY ("id_profesor")
);

-- CreateTable
CREATE TABLE "Disponibilidad" (
    "id_disponibilidad" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TIMESTAMP(3) NOT NULL,
    "horaFin" TIMESTAMP(3) NOT NULL,
    "estado" BOOLEAN NOT NULL,

    CONSTRAINT "Disponibilidad_pkey" PRIMARY KEY ("id_disponibilidad")
);

-- CreateTable
CREATE TABLE "Alumno" (
    "id_alumno" TEXT NOT NULL,
    "nivel_educativo" TEXT,
    "longitud_alum" DOUBLE PRECISION,
    "latitud_alum" DOUBLE PRECISION,

    CONSTRAINT "Alumno_pkey" PRIMARY KEY ("id_alumno")
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id_perfil" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "biografia" TEXT,
    "avatarURL" TEXT,
    "visibilidad" "Visibilidad" NOT NULL
);

-- CreateTable
CREATE TABLE "areaConocimiento" (
    "id_area" TEXT NOT NULL,
    "nombreArea" TEXT NOT NULL,

    CONSTRAINT "areaConocimiento_pkey" PRIMARY KEY ("id_area")
);

-- CreateTable
CREATE TABLE "materia" (
    "id_materia" TEXT NOT NULL,
    "id_area_conocimiento" TEXT NOT NULL,
    "nombreMateria" TEXT NOT NULL,

    CONSTRAINT "materia_pkey" PRIMARY KEY ("id_materia")
);

-- CreateTable
CREATE TABLE "profesorMateria" (
    "id_materia" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,

    CONSTRAINT "profesorMateria_pkey" PRIMARY KEY ("id_materia","id_profesor")
);

-- CreateTable
CREATE TABLE "Clase" (
    "id_clase" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "id_materia" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "fecha_hora_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_hora_fin" TIMESTAMP(3) NOT NULL,
    "cupo_maximo" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION,
    "tipo" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Clase_pkey" PRIMARY KEY ("id_clase")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id_inscripcion" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "fecha_reserva" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "asistio" BOOLEAN NOT NULL,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id_inscripcion")
);

-- CreateTable
CREATE TABLE "Reseña" (
    "id_resena" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reseña_pkey" PRIMARY KEY ("id_resena")
);

-- CreateTable
CREATE TABLE "pago" (
    "id_pago" TEXT NOT NULL,
    "id_inscripcion" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "medioPago" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "id_mercadopago" TEXT,
    "fecha_pago" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "grabacion" (
    "id_grabacion" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "url_grabacion" TEXT NOT NULL,
    "duracion" INTEGER,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "grabacion_pkey" PRIMARY KEY ("id_grabacion")
);

-- CreateTable
CREATE TABLE "SolicitudClase" (
    "id_solicitud" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudClase_pkey" PRIMARY KEY ("id_solicitud")
);

-- CreateTable
CREATE TABLE "ofertaSolicitud" (
    "id_oferta" TEXT NOT NULL,
    "id_solicitud" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "mensaje" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ofertaSolicitud_pkey" PRIMARY KEY ("id_oferta")
);

-- CreateTable
CREATE TABLE "solicitudMateria" (
    "id_solicitud" TEXT NOT NULL,
    "id_materia" TEXT NOT NULL,

    CONSTRAINT "solicitudMateria_pkey" PRIMARY KEY ("id_solicitud","id_materia")
);

-- CreateTable
CREATE TABLE "reclamo" (
    "id_reclamo" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "id_admin" TEXT,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reclamo_pkey" PRIMARY KEY ("id_reclamo")
);

-- CreateTable
CREATE TABLE "Reporte" (
    "id_reporte" TEXT NOT NULL,
    "id_usuario_reportante" TEXT NOT NULL,
    "id_usuario_reportado" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id_reporte")
);

-- CreateTable
CREATE TABLE "salaVideollamada" (
    "id_sala" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "nombre_sala" TEXT NOT NULL,
    "habilitada_desde" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "salaVideollamada_pkey" PRIMARY KEY ("id_sala")
);

-- CreateTable
CREATE TABLE "transcripcion" (
    "id_transcripcion" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "idioma" TEXT,
    "fecha_generacion" TIMESTAMP(3) NOT NULL,
    "visible_alumnos" BOOLEAN NOT NULL,

    CONSTRAINT "transcripcion_pkey" PRIMARY KEY ("id_transcripcion")
);

-- CreateTable
CREATE TABLE "Recordatorio" (
    "id_recordatorio" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_usuario_destinatario" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recordatorio_pkey" PRIMARY KEY ("id_recordatorio")
);

-- CreateTable
CREATE TABLE "mensaje" (
    "id_mensaje" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_usuario_remitente" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mensaje_pkey" PRIMARY KEY ("id_mensaje")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id_quiz" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id_quiz")
);

-- CreateTable
CREATE TABLE "preguntaQuiz" (
    "id_pregunta" TEXT NOT NULL,
    "id_quiz" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "preguntaQuiz_pkey" PRIMARY KEY ("id_pregunta")
);

-- CreateTable
CREATE TABLE "opcionRepuesta" (
    "id_opcion" TEXT NOT NULL,
    "id_pregunta" TEXT NOT NULL,
    "es_correcto" BOOLEAN NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "opcionRepuesta_pkey" PRIMARY KEY ("id_opcion")
);

-- CreateTable
CREATE TABLE "intentoQuiz" (
    "id_intento" TEXT NOT NULL,
    "id_quiz" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "puntaje" DOUBLE PRECISION,

    CONSTRAINT "intentoQuiz_pkey" PRIMARY KEY ("id_intento")
);

-- CreateTable
CREATE TABLE "respuestaQuiz" (
    "id_respuesta" TEXT NOT NULL,
    "id_intento" TEXT NOT NULL,
    "id_opcion" TEXT NOT NULL,

    CONSTRAINT "respuestaQuiz_pkey" PRIMARY KEY ("id_respuesta")
);

-- CreateTable
CREATE TABLE "Logro" (
    "id_logro" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "condicion" TEXT NOT NULL,
    "rol_objetivo" TEXT NOT NULL,

    CONSTRAINT "Logro_pkey" PRIMARY KEY ("id_logro")
);

-- CreateTable
CREATE TABLE "LogroObtenido" (
    "id_logro_obtenido" TEXT NOT NULL,
    "id_logro" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "fechaObtencion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogroObtenido_pkey" PRIMARY KEY ("id_logro_obtenido")
);

-- CreateTable
CREATE TABLE "materialDidactico" (
    "id_material" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "url_archivo" TEXT NOT NULL,
    "tipo_archivo" TEXT,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialDidactico_pkey" PRIMARY KEY ("id_material")
);

-- CreateTable
CREATE TABLE "materialAlumno" (
    "id_material" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,

    CONSTRAINT "materialAlumno_pkey" PRIMARY KEY ("id_material","id_alumno")
);

-- CreateTable
CREATE TABLE "tarea" (
    "id_tarea" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "tarea_pkey" PRIMARY KEY ("id_tarea")
);

-- CreateTable
CREATE TABLE "calificacion" (
    "id_calificacion" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "id_tarea" TEXT NOT NULL,
    "nota" INTEGER,

    CONSTRAINT "calificacion_pkey" PRIMARY KEY ("id_calificacion")
);

-- CreateTable
CREATE TABLE "TareaAlumno" (
    "id_tarea" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,

    CONSTRAINT "TareaAlumno_pkey" PRIMARY KEY ("id_tarea","id_alumno")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_id_usuario_key" ON "Perfil"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "pago_id_inscripcion_key" ON "pago"("id_inscripcion");

-- CreateIndex
CREATE UNIQUE INDEX "grabacion_id_clase_key" ON "grabacion"("id_clase");

-- CreateIndex
CREATE UNIQUE INDEX "salaVideollamada_id_clase_key" ON "salaVideollamada"("id_clase");

-- CreateIndex
CREATE UNIQUE INDEX "transcripcion_id_clase_key" ON "transcripcion"("id_clase");

-- AddForeignKey
ALTER TABLE "Disponibilidad" ADD CONSTRAINT "Disponibilidad_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materia" ADD CONSTRAINT "materia_id_area_conocimiento_fkey" FOREIGN KEY ("id_area_conocimiento") REFERENCES "areaConocimiento"("id_area") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesorMateria" ADD CONSTRAINT "profesorMateria_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materia"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesorMateria" ADD CONSTRAINT "profesorMateria_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materia"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reseña" ADD CONSTRAINT "Reseña_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reseña" ADD CONSTRAINT "Reseña_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reseña" ADD CONSTRAINT "Reseña_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "Inscripcion"("id_inscripcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grabacion" ADD CONSTRAINT "grabacion_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudClase" ADD CONSTRAINT "SolicitudClase_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertaSolicitud" ADD CONSTRAINT "ofertaSolicitud_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SolicitudClase"("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertaSolicitud" ADD CONSTRAINT "ofertaSolicitud_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertaSolicitud" ADD CONSTRAINT "ofertaSolicitud_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudMateria" ADD CONSTRAINT "solicitudMateria_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SolicitudClase"("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudMateria" ADD CONSTRAINT "solicitudMateria_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materia"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamo" ADD CONSTRAINT "reclamo_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamo" ADD CONSTRAINT "reclamo_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamo" ADD CONSTRAINT "reclamo_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_id_usuario_reportante_fkey" FOREIGN KEY ("id_usuario_reportante") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_id_usuario_reportado_fkey" FOREIGN KEY ("id_usuario_reportado") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salaVideollamada" ADD CONSTRAINT "salaVideollamada_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripcion" ADD CONSTRAINT "transcripcion_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_id_usuario_destinatario_fkey" FOREIGN KEY ("id_usuario_destinatario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_id_usuario_remitente_fkey" FOREIGN KEY ("id_usuario_remitente") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntaQuiz" ADD CONSTRAINT "preguntaQuiz_id_quiz_fkey" FOREIGN KEY ("id_quiz") REFERENCES "quiz"("id_quiz") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcionRepuesta" ADD CONSTRAINT "opcionRepuesta_id_pregunta_fkey" FOREIGN KEY ("id_pregunta") REFERENCES "preguntaQuiz"("id_pregunta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentoQuiz" ADD CONSTRAINT "intentoQuiz_id_quiz_fkey" FOREIGN KEY ("id_quiz") REFERENCES "quiz"("id_quiz") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentoQuiz" ADD CONSTRAINT "intentoQuiz_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestaQuiz" ADD CONSTRAINT "respuestaQuiz_id_intento_fkey" FOREIGN KEY ("id_intento") REFERENCES "intentoQuiz"("id_intento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestaQuiz" ADD CONSTRAINT "respuestaQuiz_id_opcion_fkey" FOREIGN KEY ("id_opcion") REFERENCES "opcionRepuesta"("id_opcion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroObtenido" ADD CONSTRAINT "LogroObtenido_id_logro_fkey" FOREIGN KEY ("id_logro") REFERENCES "Logro"("id_logro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroObtenido" ADD CONSTRAINT "LogroObtenido_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materialDidactico" ADD CONSTRAINT "materialDidactico_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materialDidactico" ADD CONSTRAINT "materialDidactico_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materialAlumno" ADD CONSTRAINT "materialAlumno_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "materialDidactico"("id_material") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materialAlumno" ADD CONSTRAINT "materialAlumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_id_tarea_fkey" FOREIGN KEY ("id_tarea") REFERENCES "tarea"("id_tarea") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaAlumno" ADD CONSTRAINT "TareaAlumno_id_tarea_fkey" FOREIGN KEY ("id_tarea") REFERENCES "tarea"("id_tarea") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaAlumno" ADD CONSTRAINT "TareaAlumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;
