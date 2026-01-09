import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  plugins: [
    base44({
      legacySDKImports: true
    }),
    react(),
  ],
  define: {
    // Escrevendo o valor real direto no código para matar o 'null'
    'process.env.BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'process.env.BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
    'import.meta.env.VITE_BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'import.meta.env.VITE_BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
  }
})
