CREATE TABLE "RegistroActividadAlumno" (
    "id_registro" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "id_profesor" TEXT NOT NULL,
    "actividad" TEXT,
    "calificacion" DOUBLE PRECISION,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroActividadAlumno_pkey" PRIMARY KEY ("id_registro")
);

CREATE INDEX "RegistroActividadAlumno_id_alumno_createdAt_idx" ON "RegistroActividadAlumno"("id_alumno", "createdAt");
CREATE INDEX "RegistroActividadAlumno_id_clase_id_alumno_idx" ON "RegistroActividadAlumno"("id_clase", "id_alumno");

ALTER TABLE "RegistroActividadAlumno" ADD CONSTRAINT "RegistroActividadAlumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroActividadAlumno" ADD CONSTRAINT "RegistroActividadAlumno_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroActividadAlumno" ADD CONSTRAINT "RegistroActividadAlumno_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE RESTRICT ON UPDATE CASCADE;
