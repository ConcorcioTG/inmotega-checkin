/**
 * Sube una foto al servidor y obtiene un enlace público (ImgBB).
 */

import { dataUrlToBlob } from '../utils/imageForJotform'

export class PhotoUploadError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PhotoUploadError'
  }
}

/**
 * @param {string} dataUrl - imagen optimizada en base64
 * @param {string} name - nombre para identificar la foto
 * @returns {Promise<string>} URL pública https
 */
export async function uploadPhotoAndGetUrl(dataUrl, name) {
  const blob = dataUrlToBlob(dataUrl)
  const body = new FormData()
  body.append('photo', blob, `${name}.jpg`)
  body.append('name', name)

  const response = await fetch('/api/upload-photo', {
    method: 'POST',
    body,
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new PhotoUploadError('No se pudo guardar la foto en línea.')
  }

  if (!response.ok || !data?.url) {
    throw new PhotoUploadError(
      data?.message || 'No se pudo guardar la foto en línea.',
    )
  }

  return data.url
}
