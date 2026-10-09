import { prisma } from '../utils/prisma.js'
import { hashPassword } from '../utils/hash.js'
 
// Ubicacion base de los datos de prueba (por defecto: Neuquen capital).
// Para usar otra: SEED_LAT=-34.6 SEED_LNG=-58.4 npm run seed
const LAT = Number(process.env.SEED_LAT ?? -38.9516)
const LNG = Number(process.env.SEED_LNG ?? -68.0591)
 
const CONTRASENA = 'prueba123'
const DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6]
 
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
 
    // Cada materia tiene un rango propio todos los días de la semana.
    await prisma.disponibilidad.deleteMany({ where: { id_profesor: profesor.id_profesor } })
    await prisma.disponibilidad.createMany({
        data: DIAS_SEMANA.flatMap((diaSemana) =>
            datos.idsMaterias.map((id_materia, indice) => ({
                id_profesor: profesor.id_profesor,
                diaSemana,
                minutoInicio: 540 + indice * 180,
                minutoFin: 720 + indice * 180,
                id_materia,
                estado: true
            }))
        )
    })
 
    return profesor
}

async function crearClaseFutura(idProfesor: string, idMateria: string, nombreMateria: string, precio: number) {
    const titulo = `Clase abierta de ${nombreMateria} (demo)`
    const existente = await prisma.clase.findFirst({
        where: { id_profesor: idProfesor, titulo }
    })
    if (existente) return

    const inicio = new Date()
    inicio.setDate(inicio.getDate() + 2)
    inicio.setHours(20, 0, 0, 0)
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000)

    await prisma.clase.create({
        data: {
            id_profesor: idProfesor,
            id_materia: idMateria,
            titulo,
            tema: `Introducción a ${nombreMateria}`,
            contenido: `Clase de prueba para explorar la publicación y reserva de ${nombreMateria}.`,
            fecha_hora_inicio: inicio,
            fecha_hora_fin: fin,
            cupo_maximo: 3,
            precio,
            tipo: 'grupal',
            origen: 'profesor',
            estado: 'disponible'
        }
    })
}

async function crearClaseConAlumno(idProfesor: string, idAlumno: string, idMateria: string) {
    const titulo = 'Clase reservada para probar cambio de horario (demo)'
    let clase = await prisma.clase.findFirst({
        where: { id_profesor: idProfesor, titulo }
    })

    if (!clase) {
        const inicio = new Date()
        inicio.setDate(inicio.getDate() + 4)
        inicio.setHours(19, 0, 0, 0)
        const fin = new Date(inicio.getTime() + 60 * 60 * 1000)
        clase = await prisma.clase.create({
            data: {
                id_profesor: idProfesor,
                id_materia: idMateria,
                titulo,
                tema: 'Derivadas',
                contenido: 'Clase confirmada de prueba para cambiar el horario y avisar al alumno.',
                fecha_hora_inicio: inicio,
                fecha_hora_fin: fin,
                cupo_maximo: 1,
                precio: 0,
                tipo: 'individual',
                origen: 'reserva',
                estado: 'confirmada'
            }
        })
    }

    const inscripcionExistente = await prisma.inscripcion.findFirst({
        where: { id_clase: clase.id_clase, id_alumno: idAlumno }
    })
    if (!inscripcionExistente) {
        await prisma.inscripcion.create({
            data: {
                id_clase: clase.id_clase,
                id_alumno: idAlumno,
                estado: 'confirmada',
                asistio: false
            }
        })
    }
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
    const area = await prisma.areaConocimiento.upsert({
        where: { nombreArea: 'Ciencias exactas' },
        update: {},
        create: { nombreArea: 'Ciencias exactas' }
    })
 
    const idsMaterias: string[] = []
    for (const nombreMateria of ['Matematica', 'Fisica', 'Quimica']) {
        const materia = await prisma.materia.upsert({
            where: { nombreMateria },
            update: {},
            create: { nombreMateria, id_area_conocimiento: area.id_area }
        })
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
 
    const profesorGratis = await crearProfesor({
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

    await crearProfesor({
        email: 'profesorsinmaterias@mentorar.test',
        nombre: 'Profesor Sin Materias',
        tarifa: 7000,
        descripcion: 'Cuenta de prueba para comprobar el perfil antes de agregar materias.',
        biografia: 'Agregá materias desde la opción Mis materias.',
        desfaseLat: 0.002,
        desfaseLng: -0.005,
        idsMaterias: [],
        contrasena
    })
 
    const alumno = await crearAlumno('alumno@mentorar.test', 'Alumno Demo', contrasena)
 
    await crearClaseDadaConResena(profesor.id_profesor, alumno.id_alumno, idsMaterias[0], 8000)
    await crearClaseFutura(profesor.id_profesor, idsMaterias[0], 'Matematica', 8000)
    await crearClaseFutura(profesorGratis.id_profesor, idsMaterias[1], 'Fisica', 0)
    await crearClaseConAlumno(profesor.id_profesor, alumno.id_alumno, idsMaterias[0])
 
    console.log('Datos de prueba cargados')
    console.log(`  Contrasena de todas las cuentas: ${CONTRASENA}`)
    console.log('  Alumno:             alumno@mentorar.test')
    console.log('  Profesor (8000):    profesor@mentorar.test')
    console.log('  Profesor (gratis):  profesorgratis@mentorar.test')
    console.log('  Profesor sin materias: profesorsinmaterias@mentorar.test')
    console.log(`  Ubicacion base: ${LAT}, ${LNG}`)
    console.log(`  id_profesor demo: ${profesor.id_profesor}`)
    console.log('  Horarios: Matemática 09:00-12:00, Física 12:00-15:00, Química 15:00-18:00; todos los días')
}
 
main()
    .catch((error) => {
        console.error('Error al cargar los datos de prueba', { message: (error as Error).message })
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())