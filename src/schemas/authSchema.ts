import {z} from 'zod';

export const loginSchema = z.object({
    email: z.string().email('El email no es valido'),
    password: z.string().min(1, 'La contraseña es obligatoria')
})

export const registerSchema = z.object({
    email: z.string().email('El mail no es valido'),
    nombre: z.string().min(1, 'El nombre es obligatorio').max(30, "El nombre no puede tener más de 30 caracteres"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    rol: z.enum(['alumno', 'profesor'], { message: 'El rol debe ser alumno o profesor' }),
    direccion: z.string().trim().min(7, 'La direccion completa es obligatoria').max(260, 'La direccion es demasiado larga')
})