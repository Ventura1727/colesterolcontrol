import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  plugins: [
    base44({
      // FORÇANDO AS VARIÁVEIS DIRETAMENTE NO PLUGIN
      apiKey: 'https://api.base44.com',
      appId: 'a0dbae3c2dfb4a2988b0a3b4dad8ca1f',
      legacySDKImports: true
    }),
    react(),
  ],
  define: {
    // CAMADA EXTRA DE SEGURANÇA PARA O RESTANTE DO CÓDIGO
    'process.env.BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'process.env.BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
    'import.meta.env.VITE_BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'import.meta.env.VITE_BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
  }
})
