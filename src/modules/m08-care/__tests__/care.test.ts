import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { CareRepository } from '../data/care.repository';

describe('Care Module (M08)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M08');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new CareRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
