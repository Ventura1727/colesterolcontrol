import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    base44({
      legacySDKImports: true
    }),
    react(),
  ],
  define: {
    // Força a substituição de qualquer menção a essas variáveis pelo valor real entre aspas
    'process.env.BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'process.env.BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
    'import.meta.env.VITE_BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'import.meta.env.VITE_BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
  }
})
