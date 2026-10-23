// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every literal API path the web app requests must be a route the backend
 * declares. Unit tests fake the API with prefix matching, so a client calling
 * `/plans` instead of `/billing/plans` passed every test and showed nothing in
 * the app (UI audit 2026-10-22: the Student Plus card on M2Profile and the
 * "reports to sign" count on Clinician Today). This reads the FastAPI route
 * decorators and checks the paths, so the next one fails here instead.
 */
const root = process.cwd();

function walk(dir: string, keep: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === '__pycache__' || name === 'tests' ? [] : walk(path, keep);
    return keep(path) ? [path] : [];
  });
}

function backendRoutes(): string[] {
  const files = walk(resolve(root, 'backend'), (path) => path.endsWith('.py') && !path.includes('/alembic/'));
  const routes: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const prefixes = new Map<string, string>();
    for (const match of source.matchAll(/(\w+)\s*=\s*APIRouter\(\s*prefix\s*=\s*["']([^"']*)["']/g)) prefixes.set(match[1], match[2]);
    for (const match of source.matchAll(/@(\w+)\.(?:get|post|put|patch|delete)\(\s*["']([^"']*)["']/g)) {
      routes.push(`${prefixes.get(match[1]) ?? ''}${match[2]}`);
    }
  }
  return routes;
}

const asPattern = (route: string) => new RegExp(`^${route.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')}$`);

/** `apiRequest('/x')`, `request<T>('/x')`, `useApiResource<T>('/x')`, and `…_PATH = '/x'` constants. */
const CALL = /(?:apiRequest|request|useApiResource|totalOf)\s*(?:<[^()]*>)?\s*\(\s*['"`](\/[^'"`?$]*)(\$\{)?/g;
const CONSTANT = /[A-Z_]+_PATH\s*=\s*['"`](\/[^'"`?$]*)(\$\{)?/g;

/**
 * View models no route renders, whose endpoints were never built. Remove an
 * entry when the feature is wired up or deleted; never add one for a mounted screen.
 */
// Empty since the four unmounted features were deleted (fix/cleanup-limits, 2026-10-22).
const UNMOUNTED = new Set<string>([]);

describe('client API paths', () => {
  const declared = backendRoutes();
  const routes = declared.map(asPattern);
  const sources = walk(resolve(root, 'src'), (path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.includes('/generated/'));

  it('reads the backend route table', () => {
    expect(routes.length).toBeGreaterThan(300);
    expect(routes.some((route) => route.test('/api/billing/plans'))).toBe(true);
  });

  it('every literal path the app requests is a backend route', () => {
    const missing: string[] = [];
    for (const file of sources) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of [CALL, CONSTANT]) {
        for (const match of source.matchAll(pattern)) {
          const path = match[1];
          if (path === '/' || UNMOUNTED.has(path.replace(/\/+$/, ''))) continue;
          const full = path.startsWith('/api/') ? path : `/api${path}`;
          // Cut at a `${…}`: the literal is the start of a route ("/consultation/${id}/join").
          const found = match[2]
            ? declared.some((route) => route.startsWith(full) || asPattern(route).test(`${full}x`))
            : routes.some((route) => route.test(full.replace(/\/+$/, '')));
          if (!found) missing.push(`${relative(root, file)}: ${path}${match[2] ? '…' : ''}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
