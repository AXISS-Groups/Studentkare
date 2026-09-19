import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { Digital_idRepository } from '../data/digital_id.repository';

describe('Digital_id Module (M03)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M03');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new Digital_idRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
