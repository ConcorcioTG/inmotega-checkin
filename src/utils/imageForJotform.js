import { logPhotoFile, logPhotoStep } from './photoDebug'

/**
 * Fotos sin compresión ni conversión.
 * Solo asegura que el File tenga tipo/nombre válido (Samsung devuelve type vacío).
 */

export function hasPhotoFile(file) {
  return Boolean(file && file.size > 0)
}

/**
 * Si la cámara móvil no envía MIME, envuelve el mismo blob como JPEG sin re-encodear.
 */
export function preparePhotoFile(file) {
  if (!hasPhotoFile(file)) return null

  if (file.type && file.type.startsWith('image/')) {
    logPhotoStep('preparePhotoFile → archivo listo', { type: file.type })
    return file
  }

  const name = file.name?.includes('.') ? file.name : `foto-${Date.now()}.jpg`
  const prepared = new File([file], name, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  })

  logPhotoFile('preparePhotoFile → MIME vacío, envuelto como JPEG', prepared)
  return prepared
}

export function readPhotoAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
