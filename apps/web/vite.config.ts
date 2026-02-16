import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('monaco-editor') || id.includes('@monaco-editor/react')) {
            return 'vendor-monaco'
          }
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
            return 'vendor-export'
          }
          if (id.includes('gifenc')) {
            return 'vendor-gif'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }
          if (id.includes('zustand') || id.includes('immer') || id.includes('zod')) {
            return 'vendor-state'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/codex': {
        target: process.env.CODEX_GATEWAY_URL || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
