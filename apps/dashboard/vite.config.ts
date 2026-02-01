import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'dashboard',
      filename: 'remoteEntry.js',
      exposes: {
        './OrderStats': './src/components/OrderStats.tsx'
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: {
    cors: true,
    port: 5001,
    strictPort: true,
    origin: 'http://localhost:5001'
  },
  preview: {
    cors: true,
    strictPort: true,
    port: 5001,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  build: {
    target: 'esnext',
  }
})
