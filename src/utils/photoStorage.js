/** Fotos en base64 — mismo patrón simple: cargar al inicio, guardar al cambiar */

export const PHOTOS_STORAGE_KEY = 'inmotega-photos'

export const INITIAL_PHOTOS = {
  frontal: null,
  trasera: null,
  /** Enlace único con ambas fotos (ImgBB) */
  sharedLink: null,
}

export function loadPhotosFromStorage() {
  const saved =
    sessionStorage.getItem(PHOTOS_STORAGE_KEY) ??
    localStorage.getItem(PHOTOS_STORAGE_KEY)

  if (!saved) return INITIAL_PHOTOS

  try {
    const parsed = JSON.parse(saved)
    return {
      frontal: parsed.frontal ?? null,
      trasera: parsed.trasera ?? null,
      sharedLink: parsed.sharedLink ?? null,
    }
  } catch {
    return INITIAL_PHOTOS
  }
}

export function savePhotosToStorage(photos) {
  const json = JSON.stringify(photos)
  localStorage.setItem(PHOTOS_STORAGE_KEY, json)
  sessionStorage.setItem(PHOTOS_STORAGE_KEY, json)
}

export function clearPhotosStorage() {
  localStorage.removeItem(PHOTOS_STORAGE_KEY)
  sessionStorage.removeItem(PHOTOS_STORAGE_KEY)
}

export function hasStoredPhoto(value) {
  return typeof value === 'string' && value.startsWith('data:image')
}
