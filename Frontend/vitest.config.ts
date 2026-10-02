import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    // Playwright owns e2e/**; vitest only runs *.test.* files under src/
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
})
