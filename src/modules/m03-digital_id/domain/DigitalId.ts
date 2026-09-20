/**
 * M03 Digital ID Domain Model.
 * Pure TypeScript entity, type definitions, and invariants.
 * Data Class: operational. No react, no fetch, no platform imports.
 */

export interface DigitalIdProfile {
  id: string;
  fullName: string;
  rollNumber: string;
  university: string;
  bloodGroup: string;
  isVerifiedStudent: boolean;
  ageVerified: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  issuedAt: number;
}

export type DigitalIdTab = 'card' | 'qr' | 'verification';

export function getVerificationBadgeText(profile: DigitalIdProfile | null): string {
  if (!profile) return 'UNVERIFIED';
  if (profile.isVerifiedStudent && profile.ageVerified) return 'VERIFIED CAMPUS MEMBER';
  if (profile.isVerifiedStudent) return 'STUDENT AFFILIATED';
  return 'SELF-REPORTED';
}

export function formatExpiryText(expiresAt: number, now: number = Date.now()): string {
  if (expiresAt === 0) return 'Valid for session';
  const remainingSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  return `Refreshes in ${mins}m ${secs.toString().padStart(2, '0')}s`;
}
