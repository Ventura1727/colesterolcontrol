import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: true
    }),
    react(),
  ],
  define: {
    'process.env.BASE44_API_URL': JSON.stringify('https://api.base44.com'),
    'process.env.BASE44_APP_ID': JSON.stringify('a0dbae3c2dfb4a2988b0a3b4dad8ca1f'),
  }
})
