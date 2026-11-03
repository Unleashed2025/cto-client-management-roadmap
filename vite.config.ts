import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/cto-client-management-roadmap/',
  plugins: [react()],
})
