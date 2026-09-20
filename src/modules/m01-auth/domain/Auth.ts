/**
 * M01 Auth Domain Model.
 * Pure TypeScript entity, type definitions, and invariants.
 * Data Class: operational. No react, no fetch, no platform imports.
 * Rule 2: No auth fallback grants a session.
 */

export type AuthMode = 'login' | 'signup';
export type Channel = 'EMAIL' | 'WHATSAPP';

export interface OtpSendResponse {
  targetMasked: string;
  fallbackSent?: boolean;
  fallbackTargetMasked?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
}

export interface SessionResponse {
  success: boolean;
  user?: AuthUser;
  requires2FA?: boolean;
  tempToken?: string;
  requiresSignup?: boolean;
  csrfToken?: string;
  message?: string;
}

export function isValidIndianPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length === 10 && /^[6-9]/.test(clean);
}

export function isValidEmail(email: string): boolean {
  return Boolean(email) && email.includes('@') && email.includes('.');
}
