import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { VaultRepository } from '../data/vault.repository';

describe('Vault Module (M02)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M02');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new VaultRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
