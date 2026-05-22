/**
 * Borrador del check-in en localStorage y sessionStorage.
 * Las fotos y la firma se guardan como data URL (JSON).
 */

const STORAGE_KEY = 'inmotega-checkin-draft'
const VERSION = 1

function readJson(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function fileToStored(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        dataUrl: reader.result,
        name: file.name,
        type: file.type,
      })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function storedToFile(stored) {
  if (!stored?.dataUrl) return null
  const res = await fetch(stored.dataUrl)
  const blob = await res.blob()
  return new File([blob], stored.name || 'foto.jpg', {
    type: stored.type || blob.type || 'image/jpeg',
  })
}

/** Serializa el estado del formulario para guardar */
export async function serializeCheckinDraft(form) {
  const draft = {
    version: VERSION,
    huesped1: form.huesped1 ?? '',
    huesped2: form.huesped2 ?? '',
    huespedExtra: form.huespedExtra ?? '',
    fechaInicio: form.fechaInicio ?? '',
    fechaSalida: form.fechaSalida ?? '',
    terminos: Boolean(form.terminos),
    firma: form.firma ?? null,
    fotoFrontal: null,
    fotoTrasera: null,
    savedAt: Date.now(),
  }

  if (form.fotoFrontal) draft.fotoFrontal = await fileToStored(form.fotoFrontal)
  if (form.fotoTrasera) draft.fotoTrasera = await fileToStored(form.fotoTrasera)

  return draft
}

/** Restaura form + URLs de preview desde el borrador */
export async function deserializeCheckinDraft(draft) {
  if (!draft || draft.version !== VERSION) return null

  const form = {
    huesped1: draft.huesped1 ?? '',
    huesped2: draft.huesped2 ?? '',
    huespedExtra: draft.huespedExtra ?? '',
    fechaInicio: draft.fechaInicio ?? '',
    fechaSalida: draft.fechaSalida ?? '',
    terminos: Boolean(draft.terminos),
    firma: draft.firma ?? null,
    fotoFrontal: null,
    fotoTrasera: null,
  }

  const previews = { frontal: null, trasera: null }

  if (draft.fotoFrontal) {
    form.fotoFrontal = await storedToFile(draft.fotoFrontal)
    previews.frontal = draft.fotoFrontal.dataUrl
  }
  if (draft.fotoTrasera) {
    form.fotoTrasera = await storedToFile(draft.fotoTrasera)
    previews.trasera = draft.fotoTrasera.dataUrl
  }

  return { form, previews }
}

/** Guarda en localStorage y sessionStorage */
export async function saveCheckinDraft(form) {
  const hasData =
    form.huesped1 ||
    form.huesped2 ||
    form.huespedExtra ||
    form.fechaInicio ||
    form.fechaSalida ||
    form.terminos ||
    form.firma ||
    form.fotoFrontal ||
    form.fotoTrasera

  if (!hasData) return

  try {
    const draft = await serializeCheckinDraft(form)
    const json = JSON.stringify(draft)
    localStorage.setItem(STORAGE_KEY, json)
    sessionStorage.setItem(STORAGE_KEY, json)
  } catch (err) {
    console.warn('[CheckIn] No se pudo guardar borrador:', err)
  }
}

/** Lee sessionStorage primero; si no hay, localStorage */
export async function loadCheckinDraft() {
  const draft = readJson(sessionStorage) ?? readJson(localStorage)
  if (!draft) return null
  return deserializeCheckinDraft(draft)
}

/** Limpia ambos al enviar con éxito */
export function clearCheckinStorage() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}
