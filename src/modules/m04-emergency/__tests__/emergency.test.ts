import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { EmergencyRepository } from '../data/emergency.repository';

describe('Emergency Module (M04)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M04');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new EmergencyRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
