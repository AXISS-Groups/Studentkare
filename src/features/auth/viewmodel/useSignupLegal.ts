import { useEffect } from 'react';
import { apiRequest } from '@/data/services/http';
import type { MessageKey, Vars } from '@/i18n';
import type { SignupConsentState, SignupConsentTerms } from './signupConsent';

/** What a sign-up records when nothing was published (backend legal_documents.UNPUBLISHED). */
export const UNPUBLISHED = 'unpublished';

/**
 * Loads which privacy notice and terms versions are published (GET /auth/consent)
 * into the sign-up consent, so the screen shows them and registration records
 * exactly those ("unpublished" when none is). A failed load leaves both null:
 * the screen still works, and claims no version it did not show.
 */
const loadTerms = (): Promise<SignupConsentTerms> => apiRequest<SignupConsentTerms>('/auth/consent');

export function useSignupLegal(consent: SignupConsentState, load: () => Promise<SignupConsentTerms> = loadTerms): void {
  useEffect(() => {
    let live = true;
    load().then(
      (terms) => { if (live) consent.setLegal(terms.noticeVersion ?? null, terms.termsVersion ?? null); },
      () => { if (live) consent.setLegal(null, null); },
    );
    return () => { live = false; };
  }, [consent, load]);
}

/** "Privacy notice, version …", or "… will be published soon" when none is published. */
export function legalLine(t: (key: MessageKey, vars?: Vars) => string, version: string, published: MessageKey, soon: MessageKey): string {
  return version === UNPUBLISHED ? t(soon) : t(published, { version });
}
