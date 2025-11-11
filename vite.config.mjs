import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      external: [
        '@polkadot/api',
        '@polkadot/extension-dapp',
        '@polkadot/util',
        '@polkadot/util-crypto',
        '@polkadot/keyring',
        '@polkadot/types',
      ],
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: [
      'rogerjbos.com',
      'localhost',
      '127.0.0.1',
      '.rogerjbos.com', // Allow all subdomains
    ],
    // https: {
    //   cert: path.resolve(__dirname, './certificates/fullchain.pem'),
    //   key: path.resolve(__dirname, './certificates/privkey.pem'),
    // },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
          });
        },
      },
      '/auth': {
        target: 'http://127.0.0.1:4000/api',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
