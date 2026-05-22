import imageCompression from 'browser-image-compression'
import { logPhotoFile, logPhotoStep } from './photoDebug'

/**
 * Validación PNG/JPG y compresión antes de enviar a JotForm.
 */

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg'])
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg'])

/** Límites de compresión orientados a envío fiable por API */
const COMPRESSION_BASE = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82,
}

export const IMAGE_FORMAT_MESSAGE =
  'Solo se permiten imágenes PNG o JPG. Elige otro archivo o toma la foto de nuevo.'

export const IMAGE_COMPRESS_MESSAGE =
  'No se pudo comprimir la imagen. Intenta con otra foto PNG o JPG.'

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

/** Comprueba si el archivo es PNG o JPG (tipo MIME y/o extensión) */
export function isAllowedImageFormat(file) {
  logPhotoStep('isAllowedImageFormat → inicio', { tieneArchivo: Boolean(file) })

  if (!file) {
    logPhotoStep('isAllowedImageFormat → sin archivo', { resultado: false })
    return false
  }

  const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  const ext = getExtension(file.name)

  const mimeOk = mime && ALLOWED_MIME.has(mime)
  const extOk = ext && ALLOWED_EXTENSIONS.has(ext)

  const resultado = (mimeOk && extOk) || (mimeOk && !ext) || (!mime && extOk)

  logPhotoStep('isAllowedImageFormat → resultado', {
    mime,
    extension: ext,
    mimeOk,
    extOk,
    resultado,
  })

  return resultado
}

/**
 * Valida PNG/JPG y comprime para reducir peso (mejor envío a JotForm).
 * Mantiene el tipo: PNG → PNG, JPG → JPG.
 */
export async function compressImageForJotform(file) {
  logPhotoStep('compressImageForJotform → inicio')
  logPhotoFile('compressImageForJotform → archivo original', file)

  if (!isAllowedImageFormat(file)) {
    logPhotoStep('compressImageForJotform → formato no permitido, abortando')
    throw new ImageFormatError()
  }

  const isPng = file.type === 'image/png'
  const fileType = isPng ? 'image/png' : 'image/jpeg'
  const ext = isPng ? 'png' : 'jpg'

  logPhotoStep('compressImageForJotform → opciones de compresión', {
    ...COMPRESSION_BASE,
    fileType,
    extensionSalida: ext,
  })

  try {
    logPhotoStep('compressImageForJotform → llamando browser-image-compression…')
    const compressed = await imageCompression(file, {
      ...COMPRESSION_BASE,
      fileType,
    })

    logPhotoFile('compressImageForJotform → blob comprimido', compressed)

    const finalFile = new File([compressed], buildFilename(file.name, ext), {
      type: fileType,
    })

    logPhotoFile('compressImageForJotform → archivo final listo', finalFile, {
      reduccionKB: `${((1 - finalFile.size / file.size) * 100).toFixed(1)}%`,
    })

    return finalFile
  } catch (err) {
    logPhotoStep('compressImageForJotform → error en compresión', {
      error: err?.message ?? err,
      nombre: err?.name,
    })
    throw new ImageCompressError()
  }
}
