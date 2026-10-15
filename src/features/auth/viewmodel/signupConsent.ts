import { makeAutoObservable } from 'mobx';
import type { Lang } from '@/i18n';

/**
 * DPDP consent at signup (SK-027). Must match SIGNUP_CONSENT_VERSION and
 * SIGNUP_REQUIRED_PURPOSES in backend/services/workflow_auth.py; the server
 * refuses any other version, so a stale screen fails closed rather than
 * recording consent to wording the student never saw.
 *
 * Change the "member.consent.*" copy → change the version on both sides.
 */
export const SIGNUP_CONSENT_VERSION = 'signup-2026-10-16';
export const SIGNUP_PURPOSES = ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'] as const;
export type SignupPurpose = (typeof SIGNUP_PURPOSES)[number];

export interface SignupConsentPayload {
  version: string;
  purposes: SignupPurpose[];
  language: Lang;
}

/** Every item starts unticked. Nothing is agreed on the student's behalf. */
export class SignupConsentState {
  agreed: Record<SignupPurpose, boolean> = { RECORDS_STORAGE: false, CAMPUS_ENROLMENT: false, ADULT_18_PLUS: false };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  toggle(purpose: SignupPurpose): void {
    this.agreed[purpose] = !this.agreed[purpose];
  }

  get complete(): boolean {
    return SIGNUP_PURPOSES.every((purpose) => this.agreed[purpose]);
  }

  payload(language: Lang): SignupConsentPayload | null {
    if (!this.complete) return null;
    return { version: SIGNUP_CONSENT_VERSION, purposes: [...SIGNUP_PURPOSES], language };
  }

  reset(): void {
    this.agreed = { RECORDS_STORAGE: false, CAMPUS_ENROLMENT: false, ADULT_18_PLUS: false };
  }
}
