ALTER TABLE "Clase"
ADD COLUMN "contenido" TEXT,
ADD COLUMN "materialNombre" TEXT,
ADD COLUMN "materialUrl" TEXT;

ALTER TABLE "Disponibilidad"
ADD COLUMN "id_materia" TEXT;

ALTER TABLE "Perfil"
ADD COLUMN "ciudad" TEXT,
ADD COLUMN "pais" TEXT,
ADD COLUMN "provincia" TEXT;

