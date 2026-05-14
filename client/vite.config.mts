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
      // Proxy API calls to the Express server during development
      '/events': 'http://localhost:3000',
      '/sessions': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
