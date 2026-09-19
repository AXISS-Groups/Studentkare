import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { TeleconsultRepository } from '../data/teleconsult.repository';

describe('Teleconsult Module (M10)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M10');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new TeleconsultRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
