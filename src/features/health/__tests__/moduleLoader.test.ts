import { describe, expect, it } from 'vitest';
import { healthModule } from '../module';

describe('health workspace routes', () => {
  it('share one loader, so moving between sections keeps the workspace mounted', () => {
    // /vault, /camp and /help are redirects to other workspace paths, not workspace sections.
    const redirects = ['/pricing', '/vault', '/camp', '/help'];
    const workspace = healthModule.routes.filter(route => !redirects.includes(route.path));
    expect(workspace.length).toBeGreaterThan(40);
    const loaders = new Set(workspace.map(route => route.load));
    expect(loaders.size).toBe(1);
    expect(workspace.find(route => route.path === '/admin')?.load).toBe(workspace.find(route => route.path === '/admin/flags')?.load);
  });
});
