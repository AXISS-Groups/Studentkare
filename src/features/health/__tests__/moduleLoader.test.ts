import { describe, expect, it } from 'vitest';
import { healthModule } from '../module';

describe('health workspace routes', () => {
  it('share one loader, so moving between sections keeps the workspace mounted', () => {
    const workspace = healthModule.routes.filter(route => route.path !== '/pricing');
    expect(workspace.length).toBeGreaterThan(40);
    const loaders = new Set(workspace.map(route => route.load));
    expect(loaders.size).toBe(1);
    expect(workspace.find(route => route.path === '/admin')?.load).toBe(workspace.find(route => route.path === '/admin/flags')?.load);
  });
});
