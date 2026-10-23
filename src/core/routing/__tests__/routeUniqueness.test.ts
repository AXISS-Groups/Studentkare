import { describe, expect, it } from 'vitest';
import { getModules, joinPath, resolveAccess } from '../registry';
import '@/features/auth/module';
import '@/features/landing/module';
import '@/features/care/module';
import '@/features/health/module';

describe('route table', () => {
  it('declares every path once, so no screen is shadowed by another', () => {
    const paths = getModules().flatMap(module => module.routes.map(route => joinPath(module.basePath, route.path)));
    const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
    expect(duplicates).toEqual([]);
  });

  it('keeps the partner scanner on its own path, closed to students', () => {
    expect(resolveAccess('/scan-verify', 'VENDOR')).toBe(true);
    expect(resolveAccess('/scan-verify', 'STUDENT')).toBe(false);
  });

  it('has no route that simulates age verification (guardrail 8: 18+ is enforced at signup on the server)', () => {
    const paths = getModules().flatMap(module => module.routes.map(route => joinPath(module.basePath, route.path)));
    expect(paths).not.toContain('/onboarding');
  });
});
