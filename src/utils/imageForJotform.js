import imageCompression from 'browser-image-compression'
import { logPhotoFile, logPhotoStep } from './photoDebug'

/**
 * Validación PNG/JPG y compresión antes de enviar a JotForm.
 */

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg'])
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg'])
const BLOCKED_MIME = new Set(['image/heic', 'image/heif', 'image/webp'])
const BLOCKED_EXT = new Set(['heic', 'heif', 'webp'])

/** Límites de compresión orientados a envío fiable por API */
const COMPRESSION_BASE = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  initialQuality: 0.82,
}

export const IMAGE_FORMAT_MESSAGE =
  'Solo se permiten imágenes PNG o JPG. Elige otro archivo o toma la foto de nuevo.'

export const IMAGE_COMPRESS_MESSAGE =
  'No se pudo procesar la imagen. Intenta tomar la foto de nuevo.'

export class ImageFormatError extends Error {
  constructor(message = IMAGE_FORMAT_MESSAGE) {
    super(message)
    this.name = 'ImageFormatError'
  }
}

export class ImageCompressError extends Error {
  constructor(message = IMAGE_COMPRESS_MESSAGE) {
    super(message)
    this.name = 'ImageCompressError'
  }
}

function getExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function buildFilename(originalName, ext) {
  const base = originalName.replace(/\.[^.]+$/, '') || 'identificacion'
  return `${base}.${ext}`
}

function isMobileDevice() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

/** Comprueba si el archivo es PNG o JPG (tipo MIME y/o extensión) */
export function isAllowedImageFormat(file) {
  logPhotoStep('isAllowedImageFormat → inicio', { tieneArchivo: Boolean(file) })

  if (!file) {
    logPhotoStep('isAllowedImageFormat → sin archivo', { resultado: false })
    return false
  }

  const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  const ext = getExtension(file.name)

  if (BLOCKED_MIME.has(mime) || BLOCKED_EXT.has(ext)) {
    logPhotoStep('isAllowedImageFormat → formato bloqueado', { mime, ext })
    return false
  }

  const mimeOk = mime && ALLOWED_MIME.has(mime)
  const extOk = ext && ALLOWED_EXTENSIONS.has(ext)

  const resultado = (mimeOk && extOk) || (mimeOk && !ext) || (!mime && extOk)

  logPhotoStep('isAllowedImageFormat → resultado', {
    mime: mime || '(vacío)',
    extension: ext || '(sin ext)',
    mimeOk,
    extOk,
    resultado,
  })

  return resultado
}

/**
 * Samsung y otros móviles suelen devolver type="" al tomar foto.
 * Normaliza a File JPG/PNG válido antes de validar/comprimir.
 */
export function normalizeCameraFile(file) {
  logPhotoStep('normalizeCameraFile → inicio')
  logPhotoFile('normalizeCameraFile → entrada', file)

  if (!file || file.size === 0) {
    logPhotoStep('normalizeCameraFile → archivo vacío')
    return null
  }

  if (isAllowedImageFormat(file)) {
    logPhotoStep('normalizeCameraFile → ya válido, sin cambios')
    return file
  }

  const mime = (file.type || '').toLowerCase()
  const ext = getExtension(file.name)

  if (BLOCKED_MIME.has(mime) || BLOCKED_EXT.has(ext)) {
    logPhotoStep('normalizeCameraFile → formato no soportado', { mime, ext })
    return null
  }

  // Cámara Samsung: MIME vacío u octet-stream pero bytes son imagen
  if (!mime || mime === 'application/octet-stream') {
    const isPng = ext === 'png'
    const name =
      file.name && file.name.includes('.')
        ? file.name
        : `captura-${Date.now()}.${isPng ? 'png' : 'jpg'}`
    const type = isPng ? 'image/png' : 'image/jpeg'
    const normalized = new File([file], name, { type, lastModified: file.lastModified })

    logPhotoFile('normalizeCameraFile → normalizado (MIME vacío)', normalized)
    return normalized
  }

  logPhotoStep('normalizeCameraFile → no se pudo normalizar')
  return null
}

async function runCompression(file, fileType) {
  const options = {
    ...COMPRESSION_BASE,
    fileType,
    // Web Worker falla en varios Samsung/Android
    useWebWorker: !isMobileDevice(),
  }

  logPhotoStep('compressImageForJotform → opciones', options)
  return imageCompression(file, options)
}

/**
 * Valida PNG/JPG y comprime para reducir peso (mejor envío a JotForm).
 */
export async function compressImageForJotform(file) {
  logPhotoStep('compressImageForJotform → inicio')

  const normalized = normalizeCameraFile(file)
  if (!normalized) {
    throw new ImageFormatError()
  }

  const isPng = normalized.type === 'image/png'
  const fileType = isPng ? 'image/png' : 'image/jpeg'
  const ext = isPng ? 'png' : 'jpg'

  try {
    logPhotoStep('compressImageForJotform → comprimiendo…')
    const compressed = await runCompression(normalized, fileType)
    logPhotoFile('compressImageForJotform → comprimido OK', compressed)

    return new File([compressed], buildFilename(normalized.name, ext), { type: fileType })
  } catch (err) {
    logPhotoStep('compressImageForJotform → falló compresión, evaluando original', {
      error: err?.message,
      tamanoMB: (normalized.size / 1024 / 1024).toFixed(2),
    })

    // Si ya pesa menos de ~1.5 MB, enviar sin comprimir
    if (normalized.size <= 1.5 * 1024 * 1024) {
      logPhotoStep('compressImageForJotform → usando archivo original sin comprimir')
      return new File([normalized], buildFilename(normalized.name, ext), { type: fileType })
    }

    throw new ImageCompressError()
  }
}
