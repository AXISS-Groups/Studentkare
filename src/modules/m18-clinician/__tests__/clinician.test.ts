import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { ClinicianRepository } from '../data/clinician.repository';

describe('Clinician Module (M18)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M18');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new ClinicianRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
