import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY || '';
    
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: {
          clientPort: 443,
        },
        proxy: {
          '/api/places-detailed': {
            target: 'https://places.googleapis.com',
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('X-Goog-Api-Key', googleMapsApiKey);
                proxyReq.setHeader('X-Goog-FieldMask', 'displayName,formattedAddress,location,websiteUri,types,addressComponents,regularOpeningHours,nationalPhoneNumber,priceLevel,rating,userRatingCount');
              });
            },
            rewrite: (path) => path.replace('/api/places-detailed', '/v1/places'),
          },
          '/api/places-new': {
            target: 'https://places.googleapis.com',
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq, req) => {
                proxyReq.setHeader('X-Goog-Api-Key', googleMapsApiKey);
                if (req.url?.includes(':autocomplete')) {
                  proxyReq.setHeader('X-Goog-FieldMask', 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat');
                } else {
                  proxyReq.setHeader('X-Goog-FieldMask', 'location,formattedAddress,shortFormattedAddress,displayName');
                }
              });
            },
            rewrite: (path) => path.replace('/api/places-new', '/v1/places'),
          },
          '/api/places': {
            target: 'https://maps.googleapis.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => {
              const url = new URL(path, 'http://localhost');
              url.searchParams.set('key', googleMapsApiKey);
              const newPath = '/maps/api/place' + url.pathname.replace('/api/places', '') + url.search;
              console.log('[Proxy] Rewriting to:', newPath.substring(0, 80) + '...');
              return newPath;
            },
          },
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN || 'lifeos-e00ed.firebaseapp.com'),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID || 'lifeos-e00ed'),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET || 'lifeos-e00ed.firebasestorage.app'),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID || '960025470156'),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID || '1:960025470156:web:1d585da6306b8bc0d64e69'),
        'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.FIREBASE_MEASUREMENT_ID || 'G-TH2P20SV63'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@assets': path.resolve(__dirname, 'attached_assets'),
        }
      }
    };
});
