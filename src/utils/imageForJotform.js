/** Convierte base64 guardado en File para enviar a JotForm */

export function hasPhotoFile(file) {
  return Boolean(file && file.size > 0)
}

export async function dataUrlToFile(dataUrl, filename = 'foto.jpg') {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, {
    type: blob.type || 'image/jpeg',
  })
}
