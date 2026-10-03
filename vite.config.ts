/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell + static assets ONLY. API/Supabase responses are
      // never cached (PHI must live only in IndexedDB, per security rule 3).
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Explicitly do not add any runtimeCaching for API hosts.
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
      },
      manifest: {
        name: 'CareLink',
        short_name: 'CareLink',
        description: 'Shared patient record and early-screening for barangay health.',
        theme_color: '#1B6FD1',
        background_color: '#F6F8FB',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
