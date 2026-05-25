/**
 * Envío a JotForm solo con enlaces de fotos (como "Test URL photo REPLAY").
 */

const JOTFORM_QIDS = {
  huespedes: '116',
  fechaInicio: '119',
  fechaSalida: '120',
  terminos1: '122',
  terminos2: '123',
  firma: '124',
  fotosLink: '131',
}

function getConfig() {
  const formId =
    process.env.VITE_JOTFORM_FORM_ID ?? process.env.JOTFORM_FORM_ID
  const apiKey =
    process.env.VITE_JOTFORM_API_KEY ?? process.env.JOTFORM_API_KEY
  if (!formId || !apiKey) {
    throw new Error(
      'Faltan VITE_JOTFORM_FORM_ID y VITE_JOTFORM_API_KEY en las variables de entorno.',
    )
  }
  return { formId, apiKey }
}

function buildHuespedesString(form) {
  const labels = [
    { key: 'huesped1', label: 'Húesped 1' },
    { key: 'huesped2', label: 'Húesped 2' },
    { key: 'huespedExtra', label: 'Húesped Extra' },
  ]
  return labels
    .map(({ key, label }) => {
      const value = (form[key] ?? '').trim() || 'NA'
      return `${label}: ${value}`
    })
    .join('')
}

function normalizeFirmaBase64(firma) {
  if (!firma) return ''
  if (firma.startsWith('data:image/png;base64,')) return firma
  return `data:image/png;base64,${firma.replace(/^data:image\/[^;]+;base64,/, '')}`
}

function appendDateFields(fd, qid, isoDate) {
  const [year, month, day] = isoDate.split('-')
  const prefix = `submission[${qid}]`
  fd.append(`${prefix}[day]`, String(Number(day)))
  fd.append(`${prefix}[month]`, String(Number(month)))
  fd.append(`${prefix}[year]`, year)
}

function isPhotoUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function buildSubmissionFormData(form, photoUrl) {
  const fd = new FormData()
  const q = JOTFORM_QIDS

  fd.append(`submission[${q.huespedes}]`, buildHuespedesString(form))
  appendDateFields(fd, q.fechaInicio, form.fechaInicio)
  appendDateFields(fd, q.fechaSalida, form.fechaSalida)
  fd.append(`submission[${q.terminos1}]`, 'Accepted')
  fd.append(`submission[${q.terminos2}]`, 'Accepted')
  fd.append(`submission[${q.firma}]`, normalizeFirmaBase64(form.firma))
  fd.append(`submission[${q.fotosLink}]`, photoUrl)

  return fd
}

/**
 * @param {{ form: object, photoUrl: string }} payload
 */
export async function submitCheckinServer({ form, photoUrl }) {
  const { formId, apiKey } = getConfig()

  if (!isPhotoUrl(photoUrl)) {
    throw new Error('Falta el enlace de las fotos de identificación.')
  }

  const res = await fetch(
    `https://api.jotform.com/form/${formId}/submissions?apiKey=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      body: buildSubmissionFormData(form, photoUrl),
    },
  )

  const data = await res.json()
  if (!res.ok || data.responseCode !== 200) {
    throw new Error(
      data?.message ||
        data?.info ||
        `Error al enviar (código ${data?.responseCode ?? res.status})`,
    )
  }

  const submissionID = data.content?.submissionID ?? data.content?.id

  return {
    ...data,
    content: {
      ...data.content,
      submissionID,
      id: submissionID,
    },
    photoUrl,
  }
}
