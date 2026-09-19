import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { MarketplaceRepository } from '../data/marketplace.repository';

describe('Marketplace Module (M17)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M17');
    expect(config.dataClass).toBe('commercial');
  });

  it('fetches items from repository', async () => {
    const repo = new MarketplaceRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
