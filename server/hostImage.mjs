/**
 * Sube una imagen a ImgBB y devuelve un enlace público HTTPS.
 * @see https://api.imgbb.com/
 */

function getImgbbKey() {
  const key = process.env.IMGBB_API_KEY ?? process.env.VITE_IMGBB_API_KEY
  if (!key) {
    throw new Error(
      'Falta IMGBB_API_KEY en .env (gratis en https://api.imgbb.com/).',
    )
  }
  return key
}

/**
 * @param {Buffer} buffer
 * @param {string} [name]
 * @returns {Promise<string>} URL directa de la imagen
 */
export async function uploadImageAndGetUrl(buffer, name = 'checkin') {
  const apiKey = getImgbbKey()
  const body = new URLSearchParams()
  body.append('key', apiKey)
  body.append('image', buffer.toString('base64'))
  body.append('name', name)

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json()
  if (!res.ok || !data?.success) {
    const msg =
      data?.error?.message ||
      data?.status_txt ||
      'No se pudo guardar la foto en línea.'
    throw new Error(msg)
  }

  return data.data.url
}
