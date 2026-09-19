import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { IncidentsRepository } from '../data/incidents.repository';

describe('Incidents Module (M12)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M12');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new IncidentsRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
