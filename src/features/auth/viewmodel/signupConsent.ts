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
export const SIGNUP_CONSENT_VERSION = 'signup-2026-10-16b';
export const SIGNUP_PURPOSES = ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'] as const;
export type SignupPurpose = (typeof SIGNUP_PURPOSES)[number];

export interface SignupConsentPayload {
  version: string;
  purposes: SignupPurpose[];
  language: Lang;
  /** The privacy notice and terms versions shown ("unpublished" when none was); sent only once known. */
  noticeVersion?: string;
  termsVersion?: string;
}

/** GET /auth/consent: the wording version, and the legal versions the screen links to. */
export interface SignupConsentTerms {
  version: string;
  required: string[];
  noticeVersion: string;
  termsVersion: string;
}

/** Every item starts unticked. Nothing is agreed on the student's behalf. */
export class SignupConsentState {
  agreed: Record<SignupPurpose, boolean> = { RECORDS_STORAGE: false, CAMPUS_ENROLMENT: false, ADULT_18_PLUS: false };
  /**
   * The published privacy notice and terms versions this screen shows, from
   * GET /auth/consent ("unpublished" when none is). Null until loaded, or when it
   * couldn't load: then nothing is claimed and the server records none.
   */
  noticeVersion: string | null = null;
  termsVersion: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  toggle(purpose: SignupPurpose): void {
    this.agreed[purpose] = !this.agreed[purpose];
  }

  setLegal(noticeVersion: string | null, termsVersion: string | null): void {
    this.noticeVersion = noticeVersion;
    this.termsVersion = termsVersion;
  }

  get complete(): boolean {
    return SIGNUP_PURPOSES.every((purpose) => this.agreed[purpose]);
  }

  payload(language: Lang): SignupConsentPayload | null {
    if (!this.complete) return null;
    return {
      version: SIGNUP_CONSENT_VERSION, purposes: [...SIGNUP_PURPOSES], language,
      ...(this.noticeVersion !== null ? { noticeVersion: this.noticeVersion } : {}),
      ...(this.termsVersion !== null ? { termsVersion: this.termsVersion } : {}),
    };
  }

  reset(): void {
    this.agreed = { RECORDS_STORAGE: false, CAMPUS_ENROLMENT: false, ADULT_18_PLUS: false };
  }
}
