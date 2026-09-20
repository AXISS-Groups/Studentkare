import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { isClinicianOnlyField } from '../domain/Clinician';

describe('M18 Clinician Module Characterisation Tests & Service Boundary', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M18');
    expect(config.dataClass).toBe('clinical');
    expect(config.routes).toContain('/clinician');
  });

  it('enforces Rule 5 / R8 internal risk stratification isolation', () => {
    expect(isClinicianOnlyField('isClinicianOnly')).toBe(true);
    expect(isClinicianOnlyField('riskCategory')).toBe(true);
    expect(isClinicianOnlyField('score')).toBe(true);
    expect(isClinicianOnlyField('id')).toBe(false);
  });
});
