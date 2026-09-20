import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { ClaimsRepository } from '../data/claims.repository';

describe('Claims Module (M15)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M15');
    expect(config.dataClass).toBe('commercial');
  });

  it('fetches items from repository', async () => {
    const repo = new ClaimsRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
