ALTER TABLE "materialDidactico" ADD COLUMN "fecha_modificacion" TIMESTAMP(3);
UPDATE "materialDidactico" SET "fecha_modificacion" = "fecha_carga";
ALTER TABLE "materialDidactico" ALTER COLUMN "fecha_modificacion" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "materialDidactico" ALTER COLUMN "fecha_modificacion" SET NOT NULL;
ALTER TABLE "materialAlumno" ADD COLUMN "descargadoEn" TIMESTAMP(3);
