import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      // Proxy all /api requests to the backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  }
})