import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this project from https://ushiron13.github.io/mealtracking/,
// so every asset reference and the PWA manifest's start_url/scope must include this subpath.
const base = '/mealtracking/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: '離乳食トラッキング',
        short_name: '離乳食記録',
        description: '離乳食の記録を10秒で残せるトラッキングアプリ',
        lang: 'ja',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#fff7ed',
        theme_color: '#f97316',
        categories: ['lifestyle', 'health'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
