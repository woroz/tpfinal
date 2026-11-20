-- CreateTable
CREATE TABLE "TareaAdjunto" (
    "id_adjunto" TEXT NOT NULL,
    "id_tarea" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TareaAdjunto_pkey" PRIMARY KEY ("id_adjunto")
);

-- CreateIndex
CREATE INDEX "TareaAdjunto_id_tarea_idx" ON "TareaAdjunto"("id_tarea");

-- AddForeignKey
ALTER TABLE "TareaAdjunto" ADD CONSTRAINT "TareaAdjunto_id_tarea_fkey" FOREIGN KEY ("id_tarea") REFERENCES "tarea"("id_tarea") ON DELETE CASCADE ON UPDATE CASCADE;
