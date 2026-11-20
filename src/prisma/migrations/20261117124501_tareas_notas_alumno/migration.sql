-- DropForeignKey
ALTER TABLE "EstadisticaAlumno" DROP CONSTRAINT "EstadisticaAlumno_id_alumno_fkey";

-- AlterTable
ALTER TABLE "TareaAlumno" ADD COLUMN     "calificadaEn" TIMESTAMP(3),
ADD COLUMN     "comentario" TEXT,
ADD COLUMN     "entregaTexto" TEXT,
ADD COLUMN     "entregadaEn" TIMESTAMP(3),
ADD COLUMN     "nota" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "tarea" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaLimite" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EntregaArchivo" (
    "id_archivo" TEXT NOT NULL,
    "id_tarea" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntregaArchivo_pkey" PRIMARY KEY ("id_archivo")
);

-- CreateIndex
CREATE INDEX "EntregaArchivo_id_tarea_id_alumno_idx" ON "EntregaArchivo"("id_tarea", "id_alumno");

-- CreateIndex
CREATE INDEX "TareaAlumno_id_alumno_idx" ON "TareaAlumno"("id_alumno");

-- CreateIndex
CREATE INDEX "tarea_id_clase_idx" ON "tarea"("id_clase");

-- AddForeignKey
ALTER TABLE "EstadisticaAlumno" ADD CONSTRAINT "EstadisticaAlumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "Alumno"("id_alumno") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaArchivo" ADD CONSTRAINT "EntregaArchivo_id_tarea_id_alumno_fkey" FOREIGN KEY ("id_tarea", "id_alumno") REFERENCES "TareaAlumno"("id_tarea", "id_alumno") ON DELETE CASCADE ON UPDATE CASCADE;
