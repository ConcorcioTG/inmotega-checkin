import { uploadImageAndGetUrl } from '../server/hostImage.mjs'
import { parsePhotoUpload } from '../server/parseMultipart.mjs'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  try {
    const body = await readBody(req)
    const host = req.headers.host ?? 'localhost'
    const request = new Request(`https://${host}/api/upload-photo`, {
      method: 'POST',
      headers: req.headers,
      body,
    })
    const formData = await request.formData()
    const { buffer, name } = await parsePhotoUpload(formData)
    const url = await uploadImageAndGetUrl(buffer, name)
    return res.status(200).json({ url })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al subir la foto.'
    return res.status(500).json({ message })
  }
}
