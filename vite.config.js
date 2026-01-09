import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK
      legacySDKImports: true
    }),
    react(),
  ],
  define: {
    // Estas linhas forçam o endereço correto e o ID do seu App no código final
    'process.env.BASE44_API_URL': '"https://api.api-base44.com"',
    'process.env.BASE44_APP_ID': '"a0dbae3c2dfb4a2988b0a3b4dad8ca1f"',
    'import.meta.env.VITE_BASE44_API_URL': '"https://api.api-base44.com"',
    'import.meta.env.VITE_BASE44_APP_ID': '"a0dbae3c2dfb4a2988b0a3b4dad8ca1f"',
  }
})
