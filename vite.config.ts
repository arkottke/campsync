import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CampSync',
        short_name: 'CampSync',
        description: 'A collaborative camping & meal planner',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_PB_URL || 'http://localhost:8090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
