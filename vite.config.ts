import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['fs', 'path', 'stream', 'zlib', 'crypto', 'http', 'https', 'buffer', 'events', 'os', 'net', 'tls', 'url'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      overrides: {
        fs: 'node:fs'
      }
    }),
  ],
  base: '/anti-todo/',
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})