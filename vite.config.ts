import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { devApi } from './scripts/dev-api.ts'

/** Port for `npm run dev`. Not the CLI's port, so dev comments never mix with real ones. */
export const DEV_PORT = 47614

export default defineConfig({
  root: 'src/client',
  plugins: [vue(), devApi()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: DEV_PORT,
    strictPort: true,
    host: '127.0.0.1',
  },
})
