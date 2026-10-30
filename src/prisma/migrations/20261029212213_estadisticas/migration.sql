-- CreateTable
CREATE TABLE "EstadisticaProfesor" (
    "id_profesor" TEXT NOT NULL,
    "clasesDictadas" INTEGER NOT NULL DEFAULT 0,
    "cantidadResenas" INTEGER NOT NULL DEFAULT 0,
    "promedioResenas" DOUBLE PRECISION,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadisticaProfesor_pkey" PRIMARY KEY ("id_profesor")
);

-- CreateTable
CREATE TABLE "EstadisticaAlumno" (
    "id_alumno" TEXT NOT NULL,
    "clasesTomadas" INTEGER NOT NULL DEFAULT 0,
    "cantidadCalificaciones" INTEGER NOT NULL DEFAULT 0,
    "promedioCalificaciones" DOUBLE PRECISION,
    "resenasDejadas" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadisticaAlumno_pkey" PRIMARY KEY ("id_alumno")
);

-- AddForeignKey
ALTER TABLE "EstadisticaProfesor" ADD CONSTRAINT "EstadisticaProfesor_id_profesor_fkey" FOREIGN KEY ("id_profesor") REFERENCES "Profesor"("id_profesor") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadisticaAlumno" ADD CONSTRAINT "EstadisticaAlumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE RESTRICT ON UPDATE CASCADE;
