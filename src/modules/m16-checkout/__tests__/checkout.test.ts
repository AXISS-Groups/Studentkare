import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { CheckoutRepository } from '../data/checkout.repository';

describe('Checkout Module (M16)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M16');
    expect(config.dataClass).toBe('commercial');
  });

  it('fetches items from repository', async () => {
    const repo = new CheckoutRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
