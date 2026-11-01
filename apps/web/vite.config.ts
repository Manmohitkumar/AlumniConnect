import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Wired up now so the API (Phase 3+) is a drop-in addition.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` serves the production build the same way staging will.
  preview: {
    port: 4300,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.STAGING_API_URL ?? 'http://localhost:4301',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
