/*
  Warnings:

  - A unique constraint covering the columns `[id_solicitud,id_profesor]` on the table `ofertaSolicitud` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fecha_hora_fin` to the `ofertaSolicitud` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fecha_hora_inicio` to the `ofertaSolicitud` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_materia` to the `ofertaSolicitud` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precio` to the `ofertaSolicitud` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ofertaSolicitud" DROP CONSTRAINT "ofertaSolicitud_id_clase_fkey";

-- AlterTable
ALTER TABLE "ofertaSolicitud" ADD COLUMN     "fecha_hora_fin" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fecha_hora_inicio" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "id_materia" TEXT NOT NULL,
ADD COLUMN     "materialNombre" TEXT,
ADD COLUMN     "materialUrl" TEXT,
ADD COLUMN     "precio" INTEGER NOT NULL,
ALTER COLUMN "id_clase" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ofertaSolicitud_id_profesor_idx" ON "ofertaSolicitud"("id_profesor");

-- CreateIndex
CREATE UNIQUE INDEX "ofertaSolicitud_id_solicitud_id_profesor_key" ON "ofertaSolicitud"("id_solicitud", "id_profesor");

-- AddForeignKey
ALTER TABLE "ofertaSolicitud" ADD CONSTRAINT "ofertaSolicitud_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofertaSolicitud" ADD CONSTRAINT "ofertaSolicitud_id_materia_fkey" FOREIGN KEY ("id_materia") REFERENCES "materia"("id_materia") ON DELETE RESTRICT ON UPDATE CASCADE;
