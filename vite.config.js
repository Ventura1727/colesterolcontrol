import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configuração limpa do Vite
export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
  ],
})
