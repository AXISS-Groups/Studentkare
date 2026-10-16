import React from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { SignupConsentState, SignupPurpose } from '../viewmodel/signupConsent';

/**
 * DPDP consent at signup (design: OnboardingConsent, Tier 1, SK-027).
 *
 * Differs from the canvas on purpose:
 * - no "Ask a parent or guardian" (DESIGN.md D4: 18+ only, guardian flow dropped);
 * - no named grievance officer or reply time — none is appointed yet, and the
 *   privacy notice says so (LegalView); naming one would be a made-up claim;
 * - no "Partner offers" switch (Rule L) and no "campus totals" or "research"
 *   switches, because neither feature exists to consent to;
 * - no "stored encrypted in India" line: not something this code can verify.
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

const box: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 'var(--sk-space-12)', minHeight: 44, padding: 'var(--sk-space-14)',
  borderRadius: 'var(--sk-radius-lg)', cursor: 'pointer', textAlign: 'left',
};

export const SignupConsent = observer(function SignupConsent({ consent }: { consent: SignupConsentState }) {
  const t = useT();
  return (
    <section aria-labelledby="signup-consent-title" style={{ display: 'grid', gap: 'var(--sk-space-12)' }}>
      <span className="care-eyebrow">{t('member.consent.eyebrow')}</span>
      <h3 id="signup-consent-title" style={{ margin: 0 }}>{t('member.consent.title')}</h3>
      <p style={{ margin: 0 }}>{t('member.consent.lead')}</p>

      <h4 style={{ margin: 0 }}>{t('member.consent.plainTitle')}</h4>
      <dl style={{ margin: 0, display: 'grid', gap: 'var(--sk-space-6)' }}>
        {PLAIN.map(([k, v]) => (
          <div key={k}><dt style={{ fontWeight: 700 }}>{t(k)}</dt><dd style={{ margin: 0 }}>{t(v)}</dd></div>
        ))}
      </dl>

      <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: 'var(--sk-space-8)' }}>
        <legend style={{ fontWeight: 700, marginBottom: 'var(--sk-space-8)' }}>{t('member.consent.requiredTitle')}</legend>
        {ITEMS.map(({ purpose, title, body }) => {
          const on = consent.agreed[purpose];
          return (
            <label key={purpose} style={{
              ...box,
              background: on ? 'var(--sk-color-surface-2)' : 'var(--sk-color-surface)',
              border: `1.5px solid ${on ? 'var(--sk-color-focus)' : 'var(--sk-color-rule-soft)'}`,
            }}>
              <input type="checkbox" checked={on} onChange={() => consent.toggle(purpose)}
                style={{ width: 24, height: 24, flexShrink: 0, margin: 0, accentColor: 'var(--sk-color-action)' }} />
              <span style={{ display: 'grid', gap: 'var(--sk-space-4)' }}>
                <strong>{t(title)}</strong>
                <small>{t(body)}</small>
              </span>
            </label>
          );
        })}
      </fieldset>

      <p style={{ margin: 0 }}>{t('member.consent.withdraw')}</p>
      <p style={{ margin: 0 }}>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
          {t('member.consent.privacy')}
        </a>
      </p>
      <p className="wf-fineprint" style={{ margin: 0 }}>{t('member.consent.recorded')}</p>
    </section>
  );
});
