import OpenAI from 'openai'
import { AppError } from './error.js'

const openai = new OpenAI()

const UMBRALES = {
  sexual: 0.5,
  'sexual/minors': 0.1,
  'violence/graphic': 0.3,
  violence: 0.8,
}

export async function verificarImagen(buffer: Buffer, archivo: string): Promise<boolean> {
  const dataUrl = `data:${archivo};base64,${buffer.toString('base64')}`

  try {
    const res = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: [{ 
        type: 'image_url', 
        image_url: { 
            url: dataUrl 
        }
    }],
    })

    const scores = res.results[0].category_scores
    console.log(scores)
    return !(
      scores.sexual > UMBRALES.sexual ||
      scores['sexual/minors'] > UMBRALES['sexual/minors'] ||
      scores['violence/graphic'] > UMBRALES['violence/graphic'] ||
      scores.violence > UMBRALES.violence
    )
  } catch (error) {
    console.error('Error de moderacion:', error)
    throw new AppError('No se pudo verificar la imagen, intentalo de nuevo', 503)
  }
}