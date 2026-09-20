import { describe, it, expect, beforeEach } from 'vitest';
import { IncidentKillSwitch } from '../incidentKillSwitch';

describe('IncidentKillSwitch (P43)', () => {
  let killSwitch: IncidentKillSwitch;

  beforeEach(() => {
    killSwitch = new IncidentKillSwitch();
  });

  it('allows feature execution when kill-switch is inactive', () => {
    expect(killSwitch.isFeatureAllowed('PHI_ACCESS')).toBe(true);
  });

  it('blocks feature execution when kill-switch is manually activated', () => {
    killSwitch.activateKillSwitch('TELECONSULT_BOOKING');
    expect(killSwitch.isFeatureAllowed('TELECONSULT_BOOKING')).toBe(false);

    killSwitch.deactivateKillSwitch('TELECONSULT_BOOKING');
    expect(killSwitch.isFeatureAllowed('TELECONSULT_BOOKING')).toBe(true);
  });

  it('automatically triggers feature kill-switches on P0 Crisis incidents', () => {
    const incident = killSwitch.declareIncident('P0_CRISIS', 'Auth Key Leak Crisis', ['PHI_ACCESS', 'PAYMENTS_CHECKOUT']);
    expect(incident.severity).toBe('P0_CRISIS');
    expect(killSwitch.isFeatureAllowed('PHI_ACCESS')).toBe(false);
    expect(killSwitch.isFeatureAllowed('PAYMENTS_CHECKOUT')).toBe(false);
  });
});
