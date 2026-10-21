import React from 'react';
import { useT, type MessageKey } from '@/i18n';
import { Illustration, type SkIllustrationName } from '../icons';
import './public-site.css';

/**
 * The canvas draws the same four pillars and the app band in two art sets:
 * `primary` (Landing, Training, the campus, clinician and partnership pages)
 * and `alternate` (lab tests, consult, programmes, plans). The drawings differ
 * slightly; each page asks for the set its board uses.
 */
export type PublicArtSet = 'primary' | 'alternate';

interface Pillar {
  title: MessageKey;
  body: MessageKey;
  art: Record<PublicArtSet, SkIllustrationName>;
}

/**
 * The canvas's second pillar is "Verified clinicians: every doctor is
 * NMC-registered and every lab NABL-accredited". Nothing in the product checks
 * either register yet, so the pillar says what is true today (AGENTS.md
 * guardrail 6) and keeps the canvas's badge art.
 */
const PILLARS: readonly Pillar[] = [
  {
    title: 'landing.site.trust.privateTitle',
    body: 'landing.site.trust.privateBody',
    art: { primary: 'illustration-lock-shield', alternate: 'illustration-lock-shield-2' },
  },
  {
    title: 'landing.site.trust.listedTitle',
    body: 'landing.site.trust.listedBody',
    art: { primary: 'illustration-verified-badge', alternate: 'illustration-verified-badge-2' },
  },
  {
    title: 'landing.site.trust.nearTitle',
    body: 'landing.site.trust.nearBody',
    art: { primary: 'illustration-hostel-pin', alternate: 'illustration-hostel-pin-2' },
  },
  {
    title: 'landing.site.trust.priceTitle',
    body: 'landing.site.trust.priceBody',
    art: { primary: 'illustration-rupee-receipt', alternate: 'illustration-rupee-receipt-2' },
  },
];

export interface PublicTrustBandProps {
  art: PublicArtSet;
}

/** "Private by default · Listed providers · Near your hostel · Price before you book". */
export function PublicTrustBand({ art }: PublicTrustBandProps): React.ReactElement {
  const t = useT();
  return (
    <section className="sk-psite sk-psite-trust" aria-label={t('landing.site.trust.aria')}>
      {PILLARS.map((p) => (
        <div key={p.title} className="sk-psite-trust__item">
          <Illustration name={p.art[art]} size={84} />
          <h2 className="sk-psite-trust__title">{t(p.title)}</h2>
          <p className="sk-psite-trust__body">{t(p.body)}</p>
        </div>
      ))}
    </section>
  );
}
