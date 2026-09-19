import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { ScannersRepository } from '../data/scanners.repository';

describe('Scanners Module (M19)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M19');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new ScannersRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
