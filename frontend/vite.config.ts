/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import { execSync } from 'child_process'

// CI sets BUILD_COMMIT_SHA for pull requests: there, HEAD is GitHub's temporary merge commit.
function getCommit(): string {
  if (process.env.BUILD_COMMIT_SHA) return process.env.BUILD_COMMIT_SHA
  try { return execSync('git rev-parse HEAD').toString().trim() } catch { return '' }
}

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls: false } }), tailwindcss(), !process.env.VITEST && checker({ vueTsc: true })],
  publicDir: '../public',
  base: process.env.VITE_BASE_PATH ?? '/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify(getCommit()),
    __PR_NUMBER__: JSON.stringify(process.env.BUILD_PR_NUMBER ?? ''),
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
