import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev only: mimic the production ingress, which routes /api/users/* to the
    // user-service and strips the prefix (/api/users/health -> /health).
    proxy: {
      '/api/users': {
        target: process.env.USER_SERVICE_URL ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/users/, '') || '/',
      },
    },
  },
})
