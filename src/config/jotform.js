/**
 * Configuración de JotForm desde variables de entorno (Vite).
 * En desarrollo las peticiones pasan por el proxy de Vite (/jotform-api).
 */

const formId = import.meta.env.VITE_JOTFORM_FORM_ID
const apiKey = import.meta.env.VITE_JOTFORM_API_KEY

/** IDs de pregunta (qid) del formulario de check-in */
export const JOTFORM_QIDS = {
  huespedes: '116',
  fechaInicio: '119',
  fechaSalida: '120',
  terminos1: '122',
  terminos2: '123',
  firma: '124',
  fotoFrontal: '125',
  fotoTrasera: '126',
}

export function getJotformConfig() {
  if (!formId || !apiKey) {
    throw new Error(
      'Faltan VITE_JOTFORM_FORM_ID o VITE_JOTFORM_API_KEY en el archivo .env',
    )
  }

  return { formId, apiKey }
}

/** Base URL de la API: proxy local en dev para evitar CORS */
export function getJotformApiBase() {
  return import.meta.env.DEV ? '/jotform-api' : 'https://api.jotform.com'
}
