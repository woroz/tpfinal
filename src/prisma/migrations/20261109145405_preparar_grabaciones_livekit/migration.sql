/*
  Warnings:

  - A unique constraint covering the columns `[egress_id]` on the table `grabacion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "grabacion" ADD COLUMN     "egress_id" TEXT,
ALTER COLUMN "url_grabacion" DROP NOT NULL,
ALTER COLUMN "fecha_inicio" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fecha_fin" DROP NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'pendiente';

-- CreateIndex
CREATE UNIQUE INDEX "grabacion_egress_id_key" ON "grabacion"("egress_id");
