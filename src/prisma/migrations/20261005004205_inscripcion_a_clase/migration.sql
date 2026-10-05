/*
  Warnings:

  - You are about to drop the column `horaFin` on the `Disponibilidad` table. All the data in the column will be lost.
  - You are about to drop the column `horaInicio` on the `Disponibilidad` table. All the data in the column will be lost.
  - Added the required column `minutoFin` to the `Disponibilidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minutoInicio` to the `Disponibilidad` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Disponibilidad" DROP COLUMN "horaFin",
DROP COLUMN "horaInicio",
ADD COLUMN     "minutoFin" INTEGER NOT NULL,
ADD COLUMN     "minutoInicio" INTEGER NOT NULL,
ALTER COLUMN "estado" SET DEFAULT true;

-- AlterTable
ALTER TABLE "Inscripcion" ADD COLUMN     "expiraEn" TIMESTAMP(3),
ALTER COLUMN "fecha_reserva" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "asistio" SET DEFAULT false;

-- AlterTable
ALTER TABLE "pago" ADD COLUMN     "id_preferencia" TEXT,
ALTER COLUMN "medioPago" SET DEFAULT 'mercadopago',
ALTER COLUMN "fecha_pago" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Notificacion" (
    "id_notificacion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_clase" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateIndex
CREATE INDEX "Notificacion_id_usuario_leida_idx" ON "Notificacion"("id_usuario", "leida");

-- CreateIndex
CREATE INDEX "Clase_id_profesor_fecha_hora_inicio_idx" ON "Clase"("id_profesor", "fecha_hora_inicio");

-- CreateIndex
CREATE INDEX "Disponibilidad_id_profesor_diaSemana_idx" ON "Disponibilidad"("id_profesor", "diaSemana");

-- CreateIndex
CREATE INDEX "Inscripcion_id_alumno_idx" ON "Inscripcion"("id_alumno");

-- CreateIndex
CREATE INDEX "Inscripcion_id_clase_idx" ON "Inscripcion"("id_clase");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE SET NULL ON UPDATE CASCADE;
