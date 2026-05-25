import { submitCheckinServer } from '../server/submitCheckin.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  try {
    const { form, photoUrl } = req.body ?? {}
    const result = await submitCheckinServer({ form, photoUrl })
    return res.status(200).json(result)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al enviar el check-in.'
    return res.status(500).json({ message })
  }
}
