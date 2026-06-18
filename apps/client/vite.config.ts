import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  envDir: '../../',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bola/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@bola/firebase-config': path.resolve(__dirname, '../../packages/firebase-config/src'),
      '@bola/ui-components': path.resolve(__dirname, '../../packages/ui-components/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})