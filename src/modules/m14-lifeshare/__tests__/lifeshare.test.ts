import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { LifeshareRepository } from '../data/lifeshare.repository';

describe('Lifeshare Module (M14)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M14');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new LifeshareRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
