import { Buffer } from 'node:buffer'

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<FormData>}
 */
export async function readRequestFormData(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const body = Buffer.concat(chunks)
  const host = req.headers.host ?? 'localhost'
  const request = new Request(`http://${host}${req.url ?? ''}`, {
    method: req.method,
    headers: req.headers,
    body,
  })
  return request.formData()
}

/**
 * @param {FormData} formData
 * @returns {Promise<{ buffer: Buffer, name: string }>}
 */
export async function parsePhotoUpload(formData) {
  const photo = formData.get('photo')
  if (!(photo instanceof Blob) || photo.size === 0) {
    throw new Error('No se recibió la foto.')
  }
  const ab = await photo.arrayBuffer()
  const name =
    typeof formData.get('name') === 'string' && formData.get('name')
      ? formData.get('name')
      : 'checkin'
  return { buffer: Buffer.from(ab), name }
}
