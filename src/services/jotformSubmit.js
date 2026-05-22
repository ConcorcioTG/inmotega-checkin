import {
  getJotformApiBase,
  getJotformConfig,
  JOTFORM_QIDS,
} from '../config/jotform'
import { hasPhotoFile } from '../utils/imageForJotform'
import { logPhotoFile, logPhotoStep } from '../utils/photoDebug'
import {
  appendDateFields,
  buildHuespedesString,
  normalizeFirmaBase64,
} from '../utils/jotformMappers'

/**
 * Error controlado al enviar a JotForm.
 * Incluye la respuesta cruda de la API cuando está disponible.
 */
export class JotformSubmitError extends Error {
  constructor(message, response = null) {
    super(message)
    this.name = 'JotformSubmitError'
    this.response = response
  }
}

/**
 * Arma el FormData con el mapeo de qids.
 * Fechas desglosadas como objeto; archivos solo PNG/JPG.
 */
export function buildSubmissionFormData(form) {
  const fd = new FormData()
  const q = JOTFORM_QIDS

  fd.append(`submission[${q.huespedes}]`, buildHuespedesString(form))
  appendDateFields(fd, q.fechaInicio, form.fechaInicio)
  appendDateFields(fd, q.fechaSalida, form.fechaSalida)
  fd.append(`submission[${q.terminos1}]`, 'Accepted')
  fd.append(`submission[${q.terminos2}]`, 'Accepted')
  fd.append(`submission[${q.firma}]`, normalizeFirmaBase64(form.firma))

  logPhotoStep('buildSubmissionFormData → adjuntando fotos', {
    qidFrontal: q.fotoFrontal,
    qidTrasera: q.fotoTrasera,
  })
  logPhotoFile('buildSubmissionFormData → fotoFrontal', form.fotoFrontal)
  logPhotoFile('buildSubmissionFormData → fotoTrasera', form.fotoTrasera)

  fd.append(
    `submission[${q.fotoFrontal}]`,
    form.fotoFrontal,
    form.fotoFrontal.name,
  )
  fd.append(
    `submission[${q.fotoTrasera}]`,
    form.fotoTrasera,
    form.fotoTrasera.name,
  )

  logPhotoStep('buildSubmissionFormData → FormData listo')
  return fd
}

/**
 * Envía el check-in completo a JotForm.
 * @see https://api.jotform.com/docs/#post-form-id-submissions
 */
export async function submitCheckin(form) {
  const { formId, apiKey } = getJotformConfig()
  const base = getJotformApiBase()
  const url = `${base}/form/${formId}/submissions?apiKey=${encodeURIComponent(apiKey)}`

  logPhotoStep('submitCheckin → validando fotos antes de enviar')
  const frontalOk = hasPhotoFile(form.fotoFrontal)
  const traseraOk = hasPhotoFile(form.fotoTrasera)
  logPhotoStep('submitCheckin → resultado validación', { frontalOk, traseraOk })

  if (!frontalOk || !traseraOk) {
    logPhotoStep('submitCheckin → abortado (faltan fotos)')
    throw new JotformSubmitError('Faltan las fotos de identificación.')
  }

  logPhotoStep('submitCheckin → enviando POST a JotForm', {
    url: url.replace(/apiKey=[^&]+/, 'apiKey=***'),
  })

  const response = await fetch(url, {
    method: 'POST',
    body: buildSubmissionFormData(form),
  })

  logPhotoStep('submitCheckin → respuesta HTTP', {
    status: response.status,
    ok: response.ok,
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new JotformSubmitError(
      'La respuesta del servidor no es válida. Intenta de nuevo.',
    )
  }

  if (!response.ok || data.responseCode !== 200) {
    const message =
      data?.message ||
      data?.info ||
      `Error al enviar (código ${data?.responseCode ?? response.status})`
    logPhotoStep('submitCheckin → error JotForm', { message, data })
    throw new JotformSubmitError(message, data)
  }

  logPhotoStep('submitCheckin → éxito', {
    responseCode: data.responseCode,
    submissionID: data?.content?.submissionID,
  })
  return data
}
