import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy all API path prefixes to the Express server during development.
      // In production the client uses VITE_API_URL for absolute fetch calls.
      '/events': 'http://localhost:3000',
      '/sessions': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/dashboard': 'http://localhost:3000',
      '/follows': 'http://localhost:3000',
      '/notifications': 'http://localhost:3000',
      '/reminder-prefs': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
