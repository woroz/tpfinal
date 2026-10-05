import { prisma } from '../utils/prisma.js'
import { hashPassword } from '../utils/hash.js'

const FRANJAS = [
    { minutoInicio: 540, minutoFin: 780 },
    { minutoInicio: 900, minutoFin: 1080 }
]

async function crearProfesor(email: string, nombre: string, tarifa: number, idsMaterias: string[], contrasena: string) {
    const usuario = await prisma.usuario.upsert({
        where: { email },
        update: {},
        create: {
            email,
            nombre,
            contrasena,
            rol: 'profesor',
            profesor: { create: { tarifa, descripcion: 'Profesor de prueba' } },
            perfil: { create: { visibilidad: 'publico' } }
        },
        include: { profesor: true }
    })

    const idProfesor = usuario.profesor!.id_profesor

    await prisma.profesor.update({ where: { id_profesor: idProfesor }, data: { tarifa } })

    await prisma.profesorMateria.createMany({
        data: idsMaterias.map((id_materia) => ({ id_materia, id_profesor: idProfesor })),
        skipDuplicates: true
    })

    await prisma.disponibilidad.deleteMany({ where: { id_profesor: idProfesor } })
    await prisma.disponibilidad.createMany({
        data: [1, 2, 3, 4, 5].flatMap((diaSemana) =>
            FRANJAS.map((franja) => ({ id_profesor: idProfesor, diaSemana, ...franja, estado: true }))
        )
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

    const contrasena = await hashPassword('prueba123')

    await crearProfesor('profesor@mentorar.test', 'Profesor Demo', 8000, idsMaterias, contrasena)
    await crearProfesor('profesorgratis@mentorar.test', 'Profesor Gratis', 0, idsMaterias, contrasena)

    await prisma.usuario.upsert({
        where: { email: 'alumno@mentorar.test' },
        update: {},
        create: {
            email: 'alumno@mentorar.test',
            nombre: 'Alumno Demo',
            contrasena,
            rol: 'alumno',
            alumno: { create: {} },
            perfil: { create: { visibilidad: 'publico' } }
        }
    })

    console.log('Datos de prueba cargados (contrasena: prueba123)')
}

main()
    .catch((error) => {
        console.error('Error al cargar los datos de prueba', { message: (error as Error).message })
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
