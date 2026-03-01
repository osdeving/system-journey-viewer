import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  const supabasePublishableKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  return {
    plugins: [react()],
    define: {
      __SJV_SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SJV_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(supabasePublishableKey),
    },
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
          target: env.CODEX_GATEWAY_URL || process.env.CODEX_GATEWAY_URL || 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  }
})
