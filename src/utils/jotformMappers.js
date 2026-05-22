/**
 * Transforma los datos del formulario React al formato que espera JotForm.
 */

const HUESPED_LABELS = [
  { key: 'huesped1', label: 'Húesped 1' },
  { key: 'huesped2', label: 'Húesped 2' },
  { key: 'huespedExtra', label: 'Húesped Extra' },
]

/**
 * Desglosa yyyy-mm-dd (input date) en día, mes y año para JotForm.
 * @returns {{ day: string, month: string, year: string }}
 */
export function parseDateParts(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return {
    day: String(Number(day)),
    month: String(Number(month)),
    year,
  }
}

/**
 * Huéspedes concatenados como en JotForm, sin separadores entre bloques.
 * Ej: "Húesped 1: Andrea...Húesped 2: Irene...Húesped Extra: NA"
 */
export function buildHuespedesString(form) {
  return HUESPED_LABELS.map(({ key, label }) => {
    const value = (form[key] ?? '').trim() || 'NA'
    return `${label}: ${value}`
  }).join('')
}

/** Asegura que la firma incluya el prefijo data URI requerido por JotForm */
export function normalizeFirmaBase64(firma) {
  if (!firma) return ''
  if (firma.startsWith('data:image/png;base64,')) return firma
  return `data:image/png;base64,${firma.replace(/^data:image\/[^;]+;base64,/, '')}`
}

/**
 * Añade al FormData los campos de fecha desglosados (day, month, year).
 */
export function appendDateFields(formData, qid, isoDate) {
  const { day, month, year } = parseDateParts(isoDate)
  const prefix = `submission[${qid}]`

  formData.append(`${prefix}[day]`, day)
  formData.append(`${prefix}[month]`, month)
  formData.append(`${prefix}[year]`, year)
}
