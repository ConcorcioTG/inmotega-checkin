const GUEST_FIELDS = ['huesped1', 'huesped2', 'huespedExtra']

export function isGuestField(name) {
  return GUEST_FIELDS.includes(name)
}

/** Al enviar: los huéspedes 2 y 3 vacíos pasan a NA. */
export function normalizeGuestsForSubmit(form) {
  return {
    ...form,
    huesped2: form.huesped2.trim() || 'NA',
    huespedExtra: form.huespedExtra.trim() || 'NA',
  }
}

/**
 * Al salir de un campo de huésped hacia otro que no es huésped:
 * rellena con NA los que quedaron vacíos según el campo que dejaste.
 */
export function normalizeGuestsOnFieldExit(form, exitedField) {
  const next = { ...form }

  if (exitedField === 'huesped1') {
    if (!next.huesped2.trim()) next.huesped2 = 'NA'
    if (!next.huespedExtra.trim()) next.huespedExtra = 'NA'
  } else if (exitedField === 'huesped2') {
    if (!next.huesped2.trim()) next.huesped2 = 'NA'
    if (!next.huespedExtra.trim()) next.huespedExtra = 'NA'
  } else if (exitedField === 'huespedExtra' && !next.huespedExtra.trim()) {
    next.huespedExtra = 'NA'
  }

  return next
}
