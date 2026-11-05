ALTER TABLE "Clase"
ADD COLUMN "profesorAsistio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "profesorIngreso" TIMESTAMP(3);

CREATE INDEX "reclamo_id_alumno_createdAt_idx" ON "reclamo"("id_alumno", "createdAt");
CREATE INDEX "reclamo_estado_createdAt_idx" ON "reclamo"("estado", "createdAt");
