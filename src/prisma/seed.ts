import { prisma } from '../utils/prisma.js'
import { hashPassword } from '../utils/hash.js'
 
// Ubicacion base de los datos de prueba (por defecto: Neuquen capital).
// Para usar la tuya: SEED_LAT=-34.6 SEED_LNG=-58.4 npx tsx src/prisma/seed.ts
const LAT = Number(process.env.SEED_LAT ?? -38.9516)
const LNG = Number(process.env.SEED_LNG ?? -68.0591)
 
const CONTRASENA = 'prueba123'
 
const FRANJAS = [
    { minutoInicio: 540, minutoFin: 780 },   // 09:00 a 13:00
    { minutoInicio: 900, minutoFin: 1080 }   // 15:00 a 18:00
]
 
async function crearProfesor(datos: {
    email: string
    nombre: string
    tarifa: number
    descripcion: string
    biografia: string
    desfaseLat: number
    desfaseLng: number
    idsMaterias: string[]
    contrasena: string
}) {
    const usuario = await prisma.usuario.upsert({
        where: { email: datos.email },
        update: { nombre: datos.nombre, contrasena: datos.contrasena },
        create: { email: datos.email, nombre: datos.nombre, contrasena: datos.contrasena, rol: 'profesor' }
    })
 
    await prisma.perfil.upsert({
        where: { id_usuario: usuario.id_usuario },
        update: { biografia: datos.biografia, visibilidad: 'publico' },
        create: { id_usuario: usuario.id_usuario, biografia: datos.biografia, visibilidad: 'publico' }
    })
 
    const ubicacion = {
        tarifa: datos.tarifa,
        descripcion: datos.descripcion,
        latitud_prof: LAT + datos.desfaseLat,
        longitud_prof: LNG + datos.desfaseLng
    }
    const profesor = await prisma.profesor.upsert({
        where: { id_usuario: usuario.id_usuario },
        update: ubicacion,
        create: { id_usuario: usuario.id_usuario, ...ubicacion }
    })
 
    await prisma.profesorMateria.createMany({
        data: datos.idsMaterias.map((id_materia) => ({ id_materia, id_profesor: profesor.id_profesor })),
        skipDuplicates: true
    })
 
    // Lunes a viernes, dos franjas por dia. Se reemplaza lo anterior.
    await prisma.disponibilidad.deleteMany({ where: { id_profesor: profesor.id_profesor } })
    await prisma.disponibilidad.createMany({
        data: [1, 2, 3, 4, 5].flatMap((diaSemana) =>
            FRANJAS.map((franja) => ({ id_profesor: profesor.id_profesor, diaSemana, ...franja, estado: true }))
        )
    })
 
    return profesor
}
 
async function crearAlumno(email: string, nombre: string, contrasena: string) {
    const usuario = await prisma.usuario.upsert({
        where: { email },
        update: { nombre, contrasena },
        create: { email, nombre, contrasena, rol: 'alumno' }
    })
 
    await prisma.perfil.upsert({
        where: { id_usuario: usuario.id_usuario },
        update: { visibilidad: 'publico' },
        create: { id_usuario: usuario.id_usuario, visibilidad: 'publico' }
    })
 
    const datos = { nivel_educativo: 'Universitario', latitud_alum: LAT, longitud_alum: LNG }
    return prisma.alumno.upsert({
        where: { id_usuario: usuario.id_usuario },
        update: datos,
        create: { id_usuario: usuario.id_usuario, ...datos }
    })
}
 
// Una clase ya dada, pagada y con resena, para que el perfil, "Mis clases"
// (historial) y "Mis pagos" tengan algo que mostrar.
async function crearClaseDadaConResena(idProfesor: string, idAlumno: string, idMateria: string, precio: number) {
    const titulo = 'Clase de Matematica (demo)'
    const existente = await prisma.clase.findFirst({ where: { id_profesor: idProfesor, titulo } })
    if (existente) return
 
    const inicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    inicio.setMinutes(0, 0, 0)
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000)
 
    const clase = await prisma.clase.create({
        data: {
            id_profesor: idProfesor,
            id_materia: idMateria,
            titulo,
            tema: 'Derivadas',
            fecha_hora_inicio: inicio,
            fecha_hora_fin: fin,
            cupo_maximo: 1,
            precio,
            tipo: 'individual',
            origen: 'reserva',
            estado: 'finalizada'
        }
    })
 
    const inscripcion = await prisma.inscripcion.create({
        data: { id_clase: clase.id_clase, id_alumno: idAlumno, estado: 'confirmada', asistio: true }
    })
 
    await prisma.pago.create({
        data: {
            id_inscripcion: inscripcion.id_inscripcion,
            monto: precio,
            medioPago: 'mercadopago',
            estado: 'aprobado',
            id_mercadopago: 'demo-0001',
            fecha_pago: inicio
        }
    })
 
    await prisma.resena.create({
        data: {
            id_clase: clase.id_clase,
            id_alumno: idAlumno,
            id_profesor: idProfesor,
            puntaje: 5,
            comentario: 'Explica muy claro y con paciencia. Recomendado.'
        }
    })
}
 
async function main() {
    const area = (await prisma.areaConocimiento.findFirst({ where: { nombreArea: 'Ciencias exactas' } }))
        ?? (await prisma.areaConocimiento.create({ data: { nombreArea: 'Ciencias exactas' } }))
 
    const idsMaterias: string[] = []
    for (const nombreMateria of ['Matematica', 'Fisica', 'Quimica']) {
        const existente = await prisma.materia.findFirst({
            where: { nombreMateria, id_area_conocimiento: area.id_area }
        })
        const materia = existente
            ?? (await prisma.materia.create({ data: { nombreMateria, id_area_conocimiento: area.id_area } }))
        idsMaterias.push(materia.id_materia)
    }
 
    const contrasena = await hashPassword(CONTRASENA)
 
    const profesor = await crearProfesor({
        email: 'profesor@mentorar.test',
        nombre: 'Profesor Demo',
        tarifa: 8000,
        descripcion: 'Profesor de matematica, fisica y quimica. Clases individuales para nivel secundario y universitario.',
        biografia: 'Ingeniero con 8 anos de experiencia dando clases particulares.',
        desfaseLat: 0.004,
        desfaseLng: 0.004,
        idsMaterias,
        contrasena
    })
 
    await crearProfesor({
        email: 'profesorgratis@mentorar.test',
        nombre: 'Profesor Gratis',
        tarifa: 0,
        descripcion: 'Clases de prueba sin costo (la reserva se confirma sin pasar por Mercado Pago).',
        biografia: 'Cuenta de prueba para reservar sin pagar.',
        desfaseLat: -0.006,
        desfaseLng: 0.003,
        idsMaterias,
        contrasena
    })
 
    const alumno = await crearAlumno('alumno@mentorar.test', 'Alumno Demo', contrasena)
 
    await crearClaseDadaConResena(profesor.id_profesor, alumno.id_alumno, idsMaterias[0], 8000)
 
    console.log('Datos de prueba cargados')
    console.log(`  Contrasena de todas las cuentas: ${CONTRASENA}`)
    console.log('  Alumno:             alumno@mentorar.test')
    console.log('  Profesor (8000):    profesor@mentorar.test')
    console.log('  Profesor (gratis):  profesorgratis@mentorar.test')
    console.log(`  Ubicacion base: ${LAT}, ${LNG}`)
    console.log(`  id_profesor demo: ${profesor.id_profesor}`)
}
 
main()
    .catch((error) => {
        console.error('Error al cargar los datos de prueba', { message: (error as Error).message })
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())