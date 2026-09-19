import { describe, it, expect, beforeEach } from 'vitest';
import { DataSubjectRightsEngine, StudentProfileData } from '../dataSubjectRights';

describe('DataSubjectRightsEngine (P44)', () => {
  let engine: DataSubjectRightsEngine;

  beforeEach(() => {
    engine = new DataSubjectRightsEngine();
  });

  it('generates a valid FHIR R4 Bundle patient resource', () => {
    const student: StudentProfileData = {
      studentId: 'STUDENT-PORTABLE-1',
      fullName: 'Aarav Sharma',
      dob: '2004-05-15',
      gender: 'Male',
      abhaId: '91-1234-5678-9012',
      activeMedicalHold: false
    };

    const bundle = engine.generateFhirExport(student);
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0].resource.resourceType).toBe('Patient');
    expect(bundle.entry[0].resource.id).toBe('STUDENT-PORTABLE-1');
  });

  it('crypto-shreds student records when no active medical hold exists', () => {
    const student: StudentProfileData = {
      studentId: 'STUDENT-ERASE-1',
      fullName: 'Ananya Gupta',
      dob: '2003-11-20',
      gender: 'Female',
      activeMedicalHold: false
    };

    const result = engine.executeErasureRequest(student);
    expect(result.cryptoShredded).toBe(true);
    expect(result.anonymizedHoldApplied).toBe(false);
  });

  it('anonymizes identifiers but retains clinical record under mandatory 7-year NMC hold', () => {
    const student: StudentProfileData = {
      studentId: 'STUDENT-HOLD-1',
      fullName: 'Vikram Singh',
      dob: '2002-08-10',
      gender: 'Male',
      activeMedicalHold: true
    };

    const result = engine.executeErasureRequest(student);
    expect(result.cryptoShredded).toBe(false);
    expect(result.anonymizedHoldApplied).toBe(true);
  });
});
