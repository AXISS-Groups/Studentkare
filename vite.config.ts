import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'react-native', replacement: 'react-native-web' },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    global: 'window',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-native-web', './src/lib/sentry'],
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': { target: process.env.CARE_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: false },
    },
  },
});
