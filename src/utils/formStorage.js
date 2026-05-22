/**
 * Borrador del formulario (sin fotos — las fotos van en photoStorage.js).
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

export function serializeCheckinDraft(form) {
  return {
    version: VERSION,
    huesped1: form.huesped1 ?? '',
    huesped2: form.huesped2 ?? '',
    huespedExtra: form.huespedExtra ?? '',
    fechaInicio: form.fechaInicio ?? '',
    fechaSalida: form.fechaSalida ?? '',
    terminos: Boolean(form.terminos),
    firma: form.firma ?? null,
    savedAt: Date.now(),
  }
}

export function deserializeCheckinDraft(draft) {
  if (!draft || draft.version !== VERSION) return null

  return {
    huesped1: draft.huesped1 ?? '',
    huesped2: draft.huesped2 ?? '',
    huespedExtra: draft.huespedExtra ?? '',
    fechaInicio: draft.fechaInicio ?? '',
    fechaSalida: draft.fechaSalida ?? '',
    terminos: Boolean(draft.terminos),
    firma: draft.firma ?? null,
  }
}

export function saveCheckinDraft(form) {
  const hasData =
    form.huesped1 ||
    form.huesped2 ||
    form.huespedExtra ||
    form.fechaInicio ||
    form.fechaSalida ||
    form.terminos ||
    form.firma

  if (!hasData) return

  try {
    const json = JSON.stringify(serializeCheckinDraft(form))
    localStorage.setItem(STORAGE_KEY, json)
    sessionStorage.setItem(STORAGE_KEY, json)
  } catch (err) {
    console.warn('[CheckIn] No se pudo guardar borrador:', err)
  }
}

export function loadCheckinDraft() {
  const draft = readJson(sessionStorage) ?? readJson(localStorage)
  if (!draft) return null
  return deserializeCheckinDraft(draft)
}

export function clearCheckinStorage() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}
