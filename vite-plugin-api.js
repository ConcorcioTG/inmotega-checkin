import { Buffer } from 'node:buffer'
import { loadEnv } from 'vite'
import { uploadImageAndGetUrl } from './server/hostImage.mjs'
import { readRequestFormData, parsePhotoUpload } from './server/parseMultipart.mjs'
import { submitCheckinServer } from './server/submitCheckin.mjs'

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(raw)
}

/** Rutas /api/upload-photo y /api/submit-checkin en desarrollo. */
export function apiPlugin() {
  return {
    name: 'inmotega-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]

        if (path === '/api/upload-photo' && req.method === 'POST') {
          try {
            const formData = await readRequestFormData(req)
            const { buffer, name } = await parsePhotoUpload(formData)
            const url = await uploadImageAndGetUrl(buffer, name)
            sendJson(res, 200, { url })
          } catch (err) {
            sendJson(res, 500, {
              message:
                err instanceof Error ? err.message : 'Error al subir la foto.',
            })
          }
          return
        }

        if (path === '/api/submit-checkin' && req.method === 'POST') {
          try {
            const contentType = req.headers['content-type'] ?? ''
            let payload
            if (contentType.includes('application/json')) {
              payload = await readJsonBody(req)
            } else {
              sendJson(res, 415, { message: 'Formato no soportado.' })
              return
            }
            const result = await submitCheckinServer(payload)
            sendJson(res, 200, result)
          } catch (err) {
            sendJson(res, 500, {
              message:
                err instanceof Error ? err.message : 'Error al enviar el check-in.',
            })
          }
          return
        }

        return next()
      })
    },
  }
}
