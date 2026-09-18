/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // Der MediaPipe-Worker braucht einen klassischen Worker (importScripts), den der
  // Vite-Dev-Server nicht korrekt ausliefert (bekannter Vite-Bug, siehe ADR-0004).
  // Deshalb fuer alles mit Kamera/Worker `npm run build && npm run preview`
  // verwenden - der Preview-Server braucht denselben Proxy wie der Dev-Server.
  preview: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
