import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/anti-todo/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  resolve: {
    alias: {
      // Provide browser-compatible versions or empty modules
      fs: 'rollup-plugin-node-polyfills/polyfills/fs',
      path: 'rollup-plugin-node-polyfills/polyfills/path',
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      zlib: 'rollup-plugin-node-polyfills/polyfills/zlib',
      crypto: 'crypto-browserify',
      http: 'stream-http',
      https: 'https-browserify',
      buffer: 'buffer/',
      events: 'events/',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})