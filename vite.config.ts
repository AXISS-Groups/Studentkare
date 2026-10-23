import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const API_TARGET = process.env.CARE_API_TARGET || 'http://127.0.0.1:8000';

// Starting a backend from the frontend dev server is opt-in (audit TD-28). The
// spawned backend is APP_ENV=testing on SQLite, which hides Postgres-only bugs,
// so the default is to tell the developer how to start the real one instead.
function autoBackendPlugin(): Plugin {
  return {
    name: 'auto-backend',
    apply: 'serve',
    configureServer() {
      if (process.env.VITEST) return;
      const checkReq = http.get(`${API_TARGET}/api/health`, (res) => res.resume());
      checkReq.on('error', () => {
        if (process.env.CARE_AUTO_BACKEND !== '1') {
          console.log(
            `\x1b[33m[backend]\x1b[0m No backend at ${API_TARGET}. Start one with \`docker compose up backend\`` +
              ' (Postgres, as in production), or set CARE_AUTO_BACKEND=1 to launch a SQLite test backend.',
          );
          return;
        }
        const script = path.resolve(__dirname, 'scripts/start-dev-backend.py');
        console.warn(
          '\x1b[33m[backend]\x1b[0m CARE_AUTO_BACKEND=1: launching a SQLite test backend (APP_ENV=testing) on' +
            ' http://127.0.0.1:8000. Postgres-only behaviour (Rule L, migrations, locks) is not exercised.',
        );
        const proc = spawn('python', [script], {
          stdio: 'inherit',
          windowsHide: true,
        });
        proc.on('error', (err) => {
          console.warn('[backend] Could not auto-start python backend:', err.message);
        });
        const killProc = () => {
          try { proc.kill(); } catch {}
        };
        process.on('exit', killProc);
        process.on('SIGINT', killProc);
        process.on('SIGTERM', killProc);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
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
      '/api': { target: API_TARGET, changeOrigin: false },
    },
  },
});
