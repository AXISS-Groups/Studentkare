import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { CampRepository } from '../data/camp.repository';

describe('Camp Module (M11)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M11');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new CampRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
