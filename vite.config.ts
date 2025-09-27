import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Proxy para las funciones de Netlify
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/\.netlify\/functions\/[^/]+/, '')
        },
        // Proxy para las funciones de Netlify en desarrollo
        '^/\\.netlify/functions/.*': {
          target: 'http://localhost:8888', // Puerto por defecto de netlify dev
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/\.netlify\/functions/, '')
        }
      }
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
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ]
  };
});
