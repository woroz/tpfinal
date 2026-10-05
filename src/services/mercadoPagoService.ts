import crypto from 'node:crypto'
import { MercadoPagoConfig, Payment, PaymentRefund, Preference } from 'mercadopago'
import { config } from '../config/index.js'
import { AppError } from '../utils/error.js'
import { aIsoConOffset } from '../utils/fechas.js'

type Plataforma = 'web' | 'app'

function obtenerCliente(): MercadoPagoConfig {
    const accessToken = config.mercadoPago.accessToken
    if (!accessToken) throw new AppError('Los pagos no estan configurados', 503)
    return new MercadoPagoConfig({ accessToken })
}

function urlDeRetorno(idInscripcion: string, plataforma: Plataforma): URL {
    const base = plataforma === 'app' && config.appReturnUrl
        ? config.appReturnUrl
        : `${config.frontendUrl}/pago/resultado`
    const url = new URL(base)
    url.searchParams.set('inscripcion', idInscripcion)
    return url
}

export const mercadoPagoService = {
    async crearPreferencia(datos: {
        idInscripcion: string
        titulo: string
        monto: number
        expiraEn: Date
        plataforma: Plataforma
    }) {
        const retorno = urlDeRetorno(datos.idInscripcion, datos.plataforma)
        const urlRetorno = retorno.toString()

        try {
            const preferencia = await new Preference(obtenerCliente()).create({
                body: {
                    items: [{
                        id: datos.idInscripcion,
                        title: datos.titulo,
                        quantity: 1,
                        unit_price: datos.monto,
                        currency_id: 'ARS'
                    }],
                    external_reference: datos.idInscripcion,
                    back_urls: { success: urlRetorno, failure: urlRetorno, pending: urlRetorno },
                    ...(retorno.protocol === 'https:' && { auto_return: 'approved' as const }),
                    ...(config.publicApiUrl && { notification_url: `${config.publicApiUrl}/pagos/webhook` }),
                    expires: true,
                    expiration_date_to: aIsoConOffset(datos.expiraEn),
                    payment_methods: {
                        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }]
                    }
                }
            })

            if (!preferencia.id || !preferencia.init_point) {
                throw new AppError('No se pudo generar el link de pago', 502)
            }
            return { idPreferencia: preferencia.id, urlPago: preferencia.init_point }
        } catch (error) {
            if (error instanceof AppError) throw error
            console.error('Error al crear la preferencia de pago', { message: (error as Error).message })
            throw new AppError('No se pudo generar el link de pago', 502)
        }
    },

    async obtenerPago(idPago: string) {
        const pago = await new Payment(obtenerCliente()).get({ id: idPago })
        return {
            id: String(pago.id),
            estado: pago.status ?? '',
            referencia: pago.external_reference ?? null,
            monto: pago.transaction_amount ?? 0
        }
    },

    async reembolsar(idPago: string): Promise<boolean> {
        try {
            await new PaymentRefund(obtenerCliente()).create({ payment_id: idPago, body: {} })
            return true
        } catch (error) {
            console.error('Error al reembolsar el pago', { idPago, message: (error as Error).message })
            return false
        }
    },

    firmaValida(cabeceras: Record<string, string | string[] | undefined>, idDato: string): boolean {
        const secreto = config.mercadoPago.webhookSecret
        if (!secreto) return true

        const firma = cabeceras['x-signature']
        const idSolicitud = cabeceras['x-request-id']
        if (typeof firma !== 'string' || typeof idSolicitud !== 'string') return false

        const partes = new Map<string, string>()
        for (const parte of firma.split(',')) {
            const indice = parte.indexOf('=')
            if (indice > 0) partes.set(parte.slice(0, indice).trim(), parte.slice(indice + 1).trim())
        }
        const ts = partes.get('ts')
        const v1 = partes.get('v1')
        if (!ts || !v1) return false

        const manifiesto = `id:${idDato.toLowerCase()};request-id:${idSolicitud};ts:${ts};`
        const esperado = crypto.createHmac('sha256', secreto).update(manifiesto).digest('hex')
        const a = Buffer.from(esperado)
        const b = Buffer.from(v1)
        return a.length === b.length && crypto.timingSafeEqual(a, b)
    }
}
