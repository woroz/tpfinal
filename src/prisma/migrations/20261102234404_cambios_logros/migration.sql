/*
  Warnings:

  - You are about to drop the column `rol_objetivo` on the `Logro` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre]` on the table `Logro` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `objetivo` to the `Logro` table without a default value. This is not possible if the table is not empty.
  - Made the column `descripcion` on table `Logro` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Logro" DROP COLUMN "rol_objetivo",
ADD COLUMN     "objetivo" INTEGER NOT NULL,
ADD COLUMN     "roles_objetivo" "Role"[],
ALTER COLUMN "descripcion" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Logro_nombre_key" ON "Logro"("nombre");
