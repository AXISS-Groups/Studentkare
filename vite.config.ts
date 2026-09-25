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
    include: ['react', 'react-dom', 'react-router-dom', 'react-native-web'],
  },
  test: {
    // jsdom, so a screen's behaviour — focus moves, accessible names, live
    // regions — can be asserted instead of only its construction.
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // .kilo holds stale git worktrees; their copies of the suite were being
    // collected and run alongside the real one.
    exclude: ['**/node_modules/**', '**/dist/**', '.kilo/**', '**/.kilo/**'],
    css: false,
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': { target: process.env.CARE_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: false },
    },
  },
});
