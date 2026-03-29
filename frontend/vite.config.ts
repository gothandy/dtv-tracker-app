import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    port: 5173,
    proxy: {
      '/api':  'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/img':  'http://localhost:3000',
      '/svg':  'http://localhost:3000',
    }
  }
})
