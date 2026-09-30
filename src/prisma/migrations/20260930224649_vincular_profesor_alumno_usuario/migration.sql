/*
  Warnings:

  - A unique constraint covering the columns `[id_usuario]` on the table `Alumno` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_usuario]` on the table `Profesor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_usuario` to the `Alumno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_usuario` to the `Profesor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Alumno" ADD COLUMN     "id_usuario" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Profesor" ADD COLUMN     "id_usuario" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Alumno_id_usuario_key" ON "Alumno"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_id_usuario_key" ON "Profesor"("id_usuario");

-- AddForeignKey
ALTER TABLE "Profesor" ADD CONSTRAINT "Profesor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
