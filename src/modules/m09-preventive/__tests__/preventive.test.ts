import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { PreventiveRepository } from '../data/preventive.repository';

describe('Preventive Module (M09)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M09');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new PreventiveRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
