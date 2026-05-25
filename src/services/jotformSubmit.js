/**
 * Envía el check-in a JotForm con enlaces de fotos (no archivos).
 */

export class JotformSubmitError extends Error {
  constructor(message, response = null) {
    super(message)
    this.name = 'JotformSubmitError'
    this.response = response
  }
}

/**
 * @param {object} form - datos del formulario
 * @param {string} photoUrl - enlace único https con ambas fotos
 */
export async function submitCheckin(form, photoUrl) {
  const response = await fetch('/api/submit-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form, photoUrl }),
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new JotformSubmitError(
      'La respuesta del servidor no es válida. Intenta de nuevo.',
    )
  }

  if (!response.ok) {
    throw new JotformSubmitError(
      data?.message || `Error al enviar (código ${response.status})`,
      data,
    )
  }

  return data
}
