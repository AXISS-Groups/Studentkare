import { describe, it, expect, beforeEach } from 'vitest';
import { InstitutionOnboardingEngine } from '../institutionOnboardingEngine';

describe('InstitutionOnboardingEngine (P51)', () => {
  let engine: InstitutionOnboardingEngine;

  beforeEach(() => {
    engine = new InstitutionOnboardingEngine();
  });

  it('validates campus student import dry-run roster', () => {
    const validRoster = [
      { rollNumber: '2024CS101', fullName: 'Rohan Mehta', email: 'rohan@campus.ac.in', department: 'CS' },
      { rollNumber: '2024CS102', fullName: 'Priya Verma', email: 'priya@campus.ac.in', department: 'CS' }
    ];

    const result = engine.executeDryRunValidation(validRoster);
    expect(result.isReadyForImport).toBe(true);
    expect(result.validRecords).toBe(2);
    expect(result.errorRecords).toHaveLength(0);
  });

  it('detects invalid records in dry-run roster', () => {
    const invalidRoster = [
      { rollNumber: '', fullName: 'No Roll', email: 'bad@campus.ac.in', department: 'CS' },
      { rollNumber: '2024CS104', fullName: 'Bad Email', email: 'invalid-email', department: 'CS' }
    ];

    const result = engine.executeDryRunValidation(invalidRoster);
    expect(result.isReadyForImport).toBe(false);
    expect(result.errorRecords).toHaveLength(2);
  });

  it('generates invitation tokens', () => {
    const token = engine.generateInvitationToken('IIT-DELHI', '2024CS101');
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(10);
  });
});
