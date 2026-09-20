import { describe, it, expect, beforeEach } from 'vitest';
import { lifeShareStore } from '../state/LifeShareStore';
import type { DonorProfile } from '../domain/LifeShare';

describe('M14 Lifeshare Module Characterisation Tests', () => {
  beforeEach(() => {
    lifeShareStore.reset();
  });

  it('initializes with default state', () => {
    expect(lifeShareStore.selectedBloodGroup).toBe('O+');
    expect(lifeShareStore.unitsNeeded).toBe(2);
    expect(lifeShareStore.hospitalStation).toBe('');
    expect(lifeShareStore.canSubmit).toBe(false);
  });

  it('correctly filters compatible donors by selected blood group', () => {
    const mockDonors: DonorProfile[] = [
      { id: '1', name: 'Donor 1', bloodGroup: 'O+', campusYear: '1st Yr', lastDonatedDaysAgo: 30, totalDonations: 2, verified: true },
      { id: '2', name: 'Donor 2', bloodGroup: 'B-', campusYear: '2nd Yr', lastDonatedDaysAgo: 60, totalDonations: 4, verified: true },
      { id: '3', name: 'Donor 3', bloodGroup: 'O+', campusYear: '3rd Yr', lastDonatedDaysAgo: 90, totalDonations: 1, verified: true },
    ];
    lifeShareStore.donors = mockDonors;

    lifeShareStore.setBloodGroup('O+');
    expect(lifeShareStore.compatibleDonorsCount).toBe(2);

    lifeShareStore.setBloodGroup('B-');
    expect(lifeShareStore.compatibleDonorsCount).toBe(1);

    lifeShareStore.setBloodGroup('AB+');
    expect(lifeShareStore.compatibleDonorsCount).toBe(0);
  });

  it('validates units stepper bounds (1 to 10)', () => {
    lifeShareStore.setUnits(0);
    expect(lifeShareStore.unitsNeeded).toBe(1);

    lifeShareStore.setUnits(5);
    expect(lifeShareStore.unitsNeeded).toBe(5);

    lifeShareStore.setUnits(15);
    expect(lifeShareStore.unitsNeeded).toBe(10);
  });

  it('updates canSubmit boolean based on hospitalStation input', () => {
    expect(lifeShareStore.canSubmit).toBe(false);

    lifeShareStore.setHospitalStation('Campus Clinic Station A');
    expect(lifeShareStore.canSubmit).toBe(true);
  });

  it('handles emergency blood request submission', async () => {
    lifeShareStore.setBloodGroup('O-');
    lifeShareStore.setUnits(3);
    lifeShareStore.setHospitalStation('Apollo Jubilee Hills');

    const success = await lifeShareStore.createEmergencyRequest();
    expect(success).toBe(true);
    expect(lifeShareStore.createdRequest).not.toBeNull();
    expect(lifeShareStore.createdRequest?.bloodGroup).toBe('O-');
    expect(lifeShareStore.createdRequest?.unitsNeeded).toBe(3);
  });
});
