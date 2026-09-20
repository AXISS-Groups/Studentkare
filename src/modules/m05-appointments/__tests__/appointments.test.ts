import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { AppointmentsRepository } from '../data/appointments.repository';

describe('Appointments Module (M05)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M05');
    expect(config.dataClass).toBe('operational');
  });

  it('fetches items from repository', async () => {
    const repo = new AppointmentsRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
