/**
 * Optimiza fotos y utilidades para subirlas como enlace.
 */

const MAX_SIDE_PX = 1600
const JPEG_QUALITY = 0.82

export function optimizePhotoForJotform(
  dataUrl,
  maxSide = MAX_SIDE_PX,
  quality = JPEG_QUALITY,
) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        let { width, height } = img
        const longest = Math.max(width, height)
        if (longest > maxSide) {
          const ratio = maxSide / longest
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('No se pudo procesar la imagen.'))
    img.src = dataUrl
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
    img.src = dataUrl
  })
}

/** Une frente y reverso en una sola imagen (un solo enlace al subir). */
export async function combinePhotosVertical(frontalDataUrl, traseraDataUrl) {
  const [frontal, trasera] = await Promise.all([
    loadImage(frontalDataUrl),
    loadImage(traseraDataUrl),
  ])

  const maxWidth = Math.max(frontal.width, trasera.width)
  const labelHeight = 28
  const gap = 12
  const height =
    labelHeight +
    frontal.height +
    gap +
    labelHeight +
    trasera.height

  const canvas = document.createElement('canvas')
  canvas.width = maxWidth
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, maxWidth, height)
  ctx.fillStyle = '#1a1a1a'
  ctx.font = 'bold 18px sans-serif'

  let y = 0
  ctx.fillText('Frente', 8, y + 20)
  y += labelHeight
  ctx.drawImage(frontal, Math.floor((maxWidth - frontal.width) / 2), y)
  y += frontal.height + gap

  ctx.fillText('Reverso', 8, y + 20)
  y += labelHeight
  ctx.drawImage(trasera, Math.floor((maxWidth - trasera.width) / 2), y)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Formato de foto inválido.')
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: match[1] })
}
