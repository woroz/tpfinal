/*
  Warnings:

  - You are about to drop the column `latitu_prof` on the `Profesor` table. All the data in the column will be lost.
  - You are about to drop the column `longitus_prof` on the `Profesor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profesor" DROP COLUMN "latitu_prof",
DROP COLUMN "longitus_prof",
ADD COLUMN     "latitud_prof" DOUBLE PRECISION,
ADD COLUMN     "longitud_prof" DOUBLE PRECISION;
