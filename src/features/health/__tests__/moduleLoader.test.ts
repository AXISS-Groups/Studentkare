import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS, SUPERSEDED_REDIRECTS, healthModule } from '../module';

describe('health workspace routes', () => {
  it('share one loader, so moving between sections keeps the workspace mounted', () => {
    // /pricing has its own page; the legacy and superseded URLs redirect to other workspace paths.
    const redirects = ['/pricing', ...LEGACY_REDIRECTS.map(([path]) => path)];
    const workspace = healthModule.routes.filter(route => !redirects.includes(route.path));
    expect(workspace.length).toBeGreaterThan(40);
    const loaders = new Set(workspace.map(route => route.load));
    expect(loaders.size).toBe(1);
    expect(workspace.find(route => route.path === '/admin')?.load).toBe(workspace.find(route => route.path === '/admin/flags')?.load);
  });

  it('sends the URLs of boards superseded by Mobile 2.0 to the screens that replaced them', async () => {
    expect(SUPERSEDED_REDIRECTS).toContainEqual(['/report-insights', '/your-care']);
    const paths = healthModule.routes.map(route => route.path);
    for (const [from, to] of SUPERSEDED_REDIRECTS) {
      expect(paths.filter(path => path === from)).toHaveLength(1); // only the redirect, no workspace page
      expect(paths).toContain(to);
      const route = healthModule.routes.find(entry => entry.path === from)!;
      const loaded = await route.load();
      expect(loaded.default.displayName).toBe(`Redirect(${to})`);
    }
  });
});
