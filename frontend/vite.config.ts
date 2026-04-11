import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import { execSync } from 'child_process'

function getCommit(): string {
  try { return execSync('git rev-parse HEAD').toString().trim() } catch { return '' }
}

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls: false } }), tailwindcss(), checker({ vueTsc: true })],
  base: process.env.VITE_BASE_PATH ?? '/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify(getCommit()),
  },
  server: {
    port: 5173,
    proxy: {
      '/api':    'http://localhost:3000',
      '/auth':   'http://localhost:3000',
      '/media':  'http://localhost:3000',
      '/svg':    'http://localhost:3000',
    }
  }
})
