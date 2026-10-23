import React from 'react';
import { observer } from 'mobx-react-lite';
import { LANGUAGE_NAMES, useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SignupConsentState, SignupPurpose } from '../viewmodel/signupConsent';
import { legalLine, useSignupLegal } from '../viewmodel/useSignupLegal';
import './onboarding-consent.css';

/**
 * DPDP consent at signup (canvas OnboardingConsent, Tier 1, approved 2026-10-21;
 * plan tier1-canvas-wp03, SK-027).
 *
 * The wording is the versioned "member.consent.*" copy the server records
 * (SIGNUP_CONSENT_VERSION): it is laid out to the board, not reworded. Differs
 * from the board on purpose:
 * - no "Ask a parent or guardian" (DESIGN.md D4: 18+ only);
 * - no optional switches: "Partner offers" breaks Rule L, and "campus totals"
 *   and "research" have no feature or server purpose to consent to (D3-4);
 * - no named grievance officer or reply time until legal names one (D3-5);
 * - the three required items can only be withdrawn by deleting the account, so
 *   that line stays; optional consents are given and withdrawn later in
 *   Profile, Privacy & consent (D3-4, amended 2026-10-23).
 * The privacy notice and terms versions shown come from GET /auth/consent and
 * are recorded with the consent; when none is published it says so and the
 * server records "unpublished" (audit H2).
 */
const ITEMS: { purpose: SignupPurpose; title: MessageKey; body: MessageKey }[] = [
  { purpose: 'RECORDS_STORAGE', title: 'member.consent.store.title', body: 'member.consent.store.body' },
  { purpose: 'CAMPUS_ENROLMENT', title: 'member.consent.campus.title', body: 'member.consent.campus.body' },
  { purpose: 'ADULT_18_PLUS', title: 'member.consent.adult.title', body: 'member.consent.adult.body' },
];

const PLAIN: [MessageKey, MessageKey][] = [
  ['member.consent.keepK', 'member.consent.keepV'],
  ['member.consent.neverK', 'member.consent.neverV'],
  ['member.consent.canK', 'member.consent.canV'],
  ['member.consent.keptK', 'member.consent.keptV'],
];

const LANGS: readonly Lang[] = ['en', 'te', 'hi'];

export interface SignupConsentProps {
  consent: SignupConsentState;
  /** Registration in flight: the button shows it and stays off. */
  busy?: boolean;
  /** Back to the campus details (the header's arrow-left). */
  onBack?: () => void;
  /** Where this sits in sign-up, e.g. 6 of 6. */
  progress?: { position: number; total: number };
}

/** Lives inside the sign-up <form>; its submit button sends the consent with registration. */
export const SignupConsent = observer(function SignupConsent({ consent, busy = false, onBack, progress }: SignupConsentProps) {
  const t = useT();
  const { lang, setLang } = useLanguage();
  useSignupLegal(consent);
  return (
    <section className="sk-consent" aria-labelledby="signup-consent-title">
      <div className="sk-consent__bar">
        {onBack ? (
          <button type="button" className="sk-consent__back" aria-label={t('ident.consent.back')} onClick={onBack} disabled={busy}>
            <Icon name="arrow-left" size={20} />
          </button>
        ) : null}
        {progress ? (
          <>
            <span className="sk-consent__track" role="progressbar" aria-valuemin={1} aria-valuemax={progress.total} aria-valuenow={progress.position}
              aria-label={t('auth.signup.stepOf', progress)}>
              {Array.from({ length: progress.total }, (_, index) => (
                <span key={index} data-on={index < progress.position} />
              ))}
            </span>
            <span className="sk-consent__step" aria-hidden="true">{t('auth.signup.position', progress)}</span>
          </>
        ) : null}
      </div>

      <div className="sk-consent__langs" role="group" aria-labelledby="sk-consent-read-in">
        <span id="sk-consent-read-in">{t('ident.consent.readIn')}</span>
        {LANGS.map((code) => (
          <button key={code} type="button" lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}>
            {LANGUAGE_NAMES[code]}
          </button>
        ))}
      </div>

      <div className="sk-consent__head">
        <h1 id="signup-consent-title" className="sk-consent__title">{t('member.consent.eyebrow')}</h1>
        <p className="sk-consent__lead">{t('member.consent.lead')}</p>
      </div>

      <div className="sk-consent__plain">
        <h2 className="sk-consent__eyebrow sk-consent__eyebrow--action">{t('member.consent.plainTitle')}</h2>
        <dl>
          {PLAIN.map(([k, v]) => (
            <div key={k}><dt>{t(k)}</dt><dd>{t(v)}</dd></div>
          ))}
        </dl>
      </div>

      <fieldset className="sk-consent__items">
        <legend className="sk-consent__eyebrow">{t('member.consent.requiredTitle')}</legend>
        {ITEMS.map(({ purpose, title, body }) => {
          const on = consent.agreed[purpose];
          return (
            <label key={purpose} className="sk-consent__item" data-on={on}>
              <input
                type="checkbox"
                className="sk-sr-only"
                checked={on}
                disabled={busy}
                onChange={() => consent.toggle(purpose)}
                aria-describedby={`consent-${purpose}-body`}
              />
              <span className="sk-consent__box" aria-hidden="true">{on ? <Icon name="check-2" size={16} strokeWidth={2.8} /> : null}</span>
              <span className="sk-consent__words">
                <strong>{t(title)}</strong>
                <small id={`consent-${purpose}-body`}>{t(body)}</small>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="sk-consent__note">
        <p>{t('member.consent.withdraw')}</p>
        <p><a href="/privacy" target="_blank" rel="noopener noreferrer">{t('member.consent.privacy')}</a></p>
        {consent.noticeVersion ? <p data-testid="consent-notice-version">{legalLine(t, consent.noticeVersion, 'privacy.signup.notice', 'privacy.signup.noticeSoon')}</p> : null}
        {consent.termsVersion ? <p data-testid="consent-terms-version">{legalLine(t, consent.termsVersion, 'privacy.signup.terms', 'privacy.signup.termsSoon')}</p> : null}
      </div>

      <div className="sk-consent__actions">
        <button type="submit" className="sk-consent__continue" disabled={!consent.complete || busy} aria-busy={busy}>
          {consent.complete ? t('ident.consent.continue') : t('member.consent.incomplete')}
          {consent.complete ? <Icon name="arrow-right" size={18} /> : null}
        </button>
        <p className="sk-consent__recorded">{t('member.consent.recorded')}</p>
      </div>
    </section>
  );
});
