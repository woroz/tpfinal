/*
  Warnings:

  - A unique constraint covering the columns `[nombreArea]` on the table `areaConocimiento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombreMateria]` on the table `materia` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "areaConocimiento_nombreArea_key" ON "areaConocimiento"("nombreArea");

-- CreateIndex
CREATE UNIQUE INDEX "materia_nombreMateria_key" ON "materia"("nombreMateria");
