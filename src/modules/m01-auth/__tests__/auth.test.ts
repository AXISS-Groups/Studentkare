import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { AuthRepository } from '../data/auth.repository';

describe('Auth Module (M01)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M01');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new AuthRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
