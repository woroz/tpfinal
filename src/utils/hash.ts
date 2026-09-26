import * as argon2 from 'argon2'

const argonOptions = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1
}

export async function hashPassword(password: string): Promise<string> {
    try {
        return await argon2.hash(password, argonOptions)
    } catch (err) {
        console.error('error al hashear contraseña', { error: err })
        throw new Error('error interno al hashear la contraseña')
    }
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, password)
    } catch (err) {
        console.error('error al verificar contraseña', { error: err })
        return false
    }
}
