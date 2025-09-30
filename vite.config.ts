import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        // Proxy a funciones Netlify en dev (netlify dev corre en :8888)
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
        },
        '^/\\.netlify/functions/.*': {
          target: 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'AutoInspect',
          short_name: 'AutoInspect',
          description: 'Inspecciones de vehículos offline',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        // ⚠️ Importante: que el SW NO intercepte las funciones de Netlify
        workbox: {
          runtimeCaching: [
            {
              // POST a funciones (enviar email, etc.): NUNCA cache
              urlPattern: ({ url }) => url.pathname.startsWith('/.netlify/functions/'),
              handler: 'NetworkOnly',
              method: 'POST',
            },
            {
              // GET a funciones: si quieres, network-first (o cámbialo a NetworkOnly)
              urlPattern: ({ url }) => url.pathname.startsWith('/.netlify/functions/'),
              handler: 'NetworkFirst',
              method: 'GET',
              options: { cacheName: 'netlify-functions' },
            },
          ],
          // Y evita que el fallback de navegación toque las funciones
          navigateFallbackDenylist: [/^\/\.netlify\/functions\//],
        },
      }),
    ],
  };
});
