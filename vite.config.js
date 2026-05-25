import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite-plugin-api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    // Proxy en desarrollo: evita bloqueo CORS del navegador hacia api.jotform.com
    proxy: {
      '/jotform-api': {
        target: 'https://api.jotform.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jotform-api/, ''),
      },
    },
  },
})
