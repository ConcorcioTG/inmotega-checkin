/** Logs de depuración del flujo de fotos (filtrar en consola: CheckIn:Foto) */
const PREFIX = '[CheckIn:Foto]'

export function logPhotoStep(step, data = {}) {
  console.log(`${PREFIX} ${step}`, data)
}

export function logPhotoFile(step, file, extra = {}) {
  if (!file) {
    console.log(`${PREFIX} ${step}`, { archivo: null, ...extra })
    return
  }

  console.log(`${PREFIX} ${step}`, {
    nombre: file.name,
    tipo: file.type,
    tamanoBytes: file.size,
    tamanoKB: `${(file.size / 1024).toFixed(2)} KB`,
    extension: file.name.split('.').pop()?.toLowerCase() ?? '',
    ...extra,
  })
}
