import { describe, it, expect, beforeEach } from 'vitest';
import { digitalIdStore } from '../state/DigitalIdStore';
import type { DigitalIdProfile } from '../domain/DigitalId';

describe('M03 Digital ID Module Characterisation Tests', () => {
  beforeEach(() => {
    digitalIdStore.reset();
  });

  it('initializes with default state', () => {
    expect(digitalIdStore.activeTab).toBe('card');
    expect(digitalIdStore.profile).toBeNull();
    expect(digitalIdStore.qrToken).toBe('');
    expect(digitalIdStore.verificationBadgeText).toBe('UNVERIFIED');
  });

  it('correctly formats verification badge text based on profile verification state', () => {
    const verifiedProfile: DigitalIdProfile = {
      id: 'P1',
      fullName: 'Test User',
      rollNumber: 'R101',
      university: 'Campus Univ',
      bloodGroup: 'O+',
      isVerifiedStudent: true,
      ageVerified: true,
      emergencyContactName: 'Contact',
      emergencyContactPhone: '9999999999',
      emergencyContactRelation: 'Parent',
      issuedAt: Date.now(),
    };

    digitalIdStore.profile = verifiedProfile;
    expect(digitalIdStore.verificationBadgeText).toBe('VERIFIED CAMPUS MEMBER');

    digitalIdStore.profile = { ...verifiedProfile, ageVerified: false };
    expect(digitalIdStore.verificationBadgeText).toBe('STUDENT AFFILIATED');

    digitalIdStore.profile = { ...verifiedProfile, isVerifiedStudent: false, ageVerified: false };
    expect(digitalIdStore.verificationBadgeText).toBe('SELF-REPORTED');
  });

  it('handles tab switching between card, qr, and verification', () => {
    expect(digitalIdStore.activeTab).toBe('card');

    digitalIdStore.setActiveTab('qr');
    expect(digitalIdStore.activeTab).toBe('qr');

    digitalIdStore.setActiveTab('verification');
    expect(digitalIdStore.activeTab).toBe('verification');
  });

  it('does not hold on to a pass when the refresh fails', async () => {
    digitalIdStore.profile = {
      id: 'TEST-123',
      fullName: 'Test Student',
      rollNumber: 'ROLL-1',
      university: 'Univ',
      bloodGroup: 'B+',
      isVerifiedStudent: true,
      ageVerified: true,
      emergencyContactName: 'Father',
      emergencyContactPhone: '9876543210',
      emergencyContactRelation: 'Father',
      issuedAt: Date.now(),
    };

    // There is no server in this test, so the refresh fails. It used to pin
    // the old behaviour — a device-minted `QR-PASS-<id>-<now>` with five
    // minutes of apparent validity. A failed refresh now yields no pass at
    // all. The successful path is covered in DigitalIdCredential.test.ts,
    // where the response is mocked.
    await digitalIdStore.refreshQrPass();
    expect(digitalIdStore.qrToken).toBe('');
    expect(digitalIdStore.expiresAt).toBe(0);
    expect(digitalIdStore.errorMessage).toBeTruthy();
  });
});
