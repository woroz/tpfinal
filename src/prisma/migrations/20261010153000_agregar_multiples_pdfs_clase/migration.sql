CREATE TABLE "materialClase" (
    "id_material" TEXT NOT NULL,
    "id_clase" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialClase_pkey" PRIMARY KEY ("id_material")
);

CREATE INDEX "materialClase_id_clase_idx" ON "materialClase"("id_clase");

ALTER TABLE "materialClase"
ADD CONSTRAINT "materialClase_id_clase_fkey"
FOREIGN KEY ("id_clase") REFERENCES "Clase"("id_clase")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "materialClase" ("id_material", "id_clase", "nombre", "url")
SELECT gen_random_uuid()::text, "id_clase", COALESCE("materialNombre", 'Material de la clase'), "materialUrl"
FROM "Clase"
WHERE "materialUrl" IS NOT NULL;
