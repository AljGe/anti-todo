import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['fs', 'fs/promises', 'path', 'stream', 'zlib', 'crypto', 'http', 'https', 'buffer', 'events', 'os', 'net', 'tls', 'url'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: '/anti-todo/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})