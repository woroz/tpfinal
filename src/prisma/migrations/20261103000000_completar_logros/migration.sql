CREATE UNIQUE INDEX "LogroObtenido_id_usuario_id_logro_key" ON "LogroObtenido"("id_usuario", "id_logro");
ALTER TABLE "Logro" ADD CONSTRAINT "Logro_objetivo_positivo" CHECK (objetivo > 0);
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Mi presentación', 'Completar nombre, biografía y avatar.', 'Completar nombre, biografía y avatar.', ARRAY['alumno','profesor']::"Role"[], 3)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Un mes juntos', 'Cumplir 30 días desde el registro.', 'Cumplir 30 días desde el registro.', ARRAY['alumno','profesor']::"Role"[], 30)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Parte de la comunidad', 'Cumplir 180 días desde el registro.', 'Cumplir 180 días desde el registro.', ARRAY['alumno','profesor']::"Role"[], 180)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Primer aniversario', 'Cumplir un año desde el registro.', 'Cumplir un año desde el registro.', ARRAY['alumno','profesor']::"Role"[], 365)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Constancia', 'Participar en clases durante 4 semanas consecutivas.', 'Participar en clases durante 4 semanas consecutivas.', ARRAY['alumno','profesor']::"Role"[], 4)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Aprendiz constante', 'Asistir a 10 clases finalizadas.', 'Asistir a 10 clases finalizadas.', ARRAY['alumno']::"Role"[], 10)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'A practicar', 'Completar 5 quizzes distintos.', 'Completar 5 quizzes distintos.', ARRAY['alumno']::"Role"[], 5)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Explorador del conocimiento', 'Asistir a clases de 3 materias diferentes.', 'Asistir a clases de 3 materias diferentes.', ARRAY['alumno']::"Role"[], 3)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Tu opinión cuenta', 'Dejar reseñas a 3 profesores diferentes.', 'Dejar reseñas a 3 profesores diferentes.', ARRAY['alumno']::"Role"[], 3)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Paso a paso', 'Asistir a 5 clases de una misma materia.', 'Asistir a 5 clases de una misma materia.', ARRAY['alumno']::"Role"[], 5)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Experiencia docente', 'Dictar 10 clases finalizadas con al menos un alumno asistente.', 'Dictar 10 clases finalizadas con al menos un alumno asistente.', ARRAY['profesor']::"Role"[], 10)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Tu enseñanza deja huella', 'Recibir reseñas de 5 alumnos diferentes.', 'Recibir reseñas de 5 alumnos diferentes.', ARRAY['profesor']::"Role"[], 5)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Llegar a más personas', 'Enseñar a 10 alumnos distintos.', 'Enseñar a 10 alumnos distintos.', ARRAY['profesor']::"Role"[], 10)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Material de apoyo', 'Compartir PDF en 5 clases efectivamente dictadas.', 'Compartir PDF en 5 clases efectivamente dictadas.', ARRAY['profesor']::"Role"[], 5)
ON CONFLICT (nombre) DO NOTHING;
INSERT INTO "Logro" (id_logro, nombre, descripcion, condicion, roles_objetivo, objetivo)
VALUES (gen_random_uuid()::text, 'Acompañamiento', 'Registrar una devolución para 5 alumnos distintos después de sus clases.', 'Registrar una devolución para 5 alumnos distintos después de sus clases.', ARRAY['profesor']::"Role"[], 5)
ON CONFLICT (nombre) DO NOTHING;
