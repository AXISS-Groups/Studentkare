import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { HealthRepository } from '../data/health.repository';

describe('Health Module (M07)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M07');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new HealthRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
