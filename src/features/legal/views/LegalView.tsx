import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useRoutePath } from '@/core/navigation';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './legal.css';

type LegalTopic = 'privacy' | 'terms';

const TITLES: Record<LegalTopic, MessageKey> = {
  privacy: 'member.legal.privacyTitle',
  terms: 'member.legal.termsTitle',
};

/**
 * Privacy, terms and grievance (design page 3, `WebLegal`, Tier 1).
 *
 * `/privacy` and `/terms` were both routed to `LiveMarketplaceScreen`, so
 * someone following either link was served the shop. On a product that holds
 * student health records that is the worst of the mis-routings: these are the
 * two pages a person opens precisely when they want to know what is being done
 * with their data, and they are required rather than optional.
 *
 * This page does not contain a privacy notice or terms, and that is deliberate.
 * DESIGN.md section 5 puts `WebLegal` in Tier 1 — a named design reviewer *and*
 * legal sign-off, never authored without them — and the reason is exactly this
 * screen. A privacy notice is a binding statement of what an organisation does
 * with personal data and what it promises not to do; under the DPDP Act it also
 * has to name a real grievance officer who answers real complaints. Generating
 * that text would be inventing legal commitments on the company's behalf and
 * naming an officer who does not exist. Guardrail 6 rules out the softer
 * version too: no string may assert a compliance state that nothing computes.
 *
 * So the page states the gap. That is worse marketing than boilerplate and far
 * better than a notice nobody has agreed to honour — and unlike the shop, it
 * tells the reader something true.
 */
export function LegalView(): React.ReactElement {
  const t = useT();
  const route = useRoutePath();
  const topic: LegalTopic = route.includes('terms') ? 'terms' : 'privacy';

  return (
    <main className="sk-legal">
      <header className="sk-legal__head">
        <span className="sk-legal__eyebrow">STUDENTKARE</span>
        <h1 className="sk-legal__title">{t(TITLES[topic])}</h1>
      </header>

      <div className="sk-legal__notice" role="status">
        <span className="sk-legal__notice-icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-legal__notice-title">
            {topic === 'privacy' ? t('member.legal.privacyNotPublished') : t('member.legal.termsNotPublished')}
          </p>
          <p className="sk-legal__notice-body">{t('member.legal.noticeBody')}</p>
        </div>
      </div>

      <section className="sk-legal__section" aria-labelledby="sk-legal-required">
        <h2 className="sk-legal__heading" id="sk-legal-required">
          {t('member.legal.requiredHeading')}
        </h2>
        <ul className="sk-legal__list">
          <li>
            <strong>{t('member.legal.officerLead')}</strong> {t('member.legal.officerBody')}
          </li>
          <li>
            <strong>{t('member.legal.purposeLead')}</strong> {t('member.legal.purposeBody')}
          </li>
          <li>
            <strong>{t('member.legal.retentionLead')}</strong> {t('member.legal.retentionBody')}
          </li>
          <li>
            <strong>{t('member.legal.reviewLead')}</strong> {t('member.legal.reviewBody')}
          </li>
        </ul>
      </section>

      <section className="sk-legal__section" aria-labelledby="sk-legal-meanwhile">
        <h2 className="sk-legal__heading" id="sk-legal-meanwhile">
          {t('member.legal.nowHeading')}
        </h2>
        <p className="sk-legal__body">{t('member.legal.nowBody')}</p>
        <ul className="sk-legal__list">
          <li>{t('member.legal.nowShare')}</li>
          <li>{t('member.legal.nowEndShare')}</li>
          <li>{t('member.legal.nowConsents')}</li>
          <li>{t('member.legal.nowAdults')}</li>
        </ul>
      </section>

      <nav className="sk-legal__links" aria-label={t('member.legal.relatedPages')}>
        <a className="sk-legal__link" href={topic === 'privacy' ? '/terms' : '/privacy'}>
          {topic === 'privacy' ? t('member.legal.termsTitle') : t('member.legal.privacyTitle')}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
        <a className="sk-legal__link" href="/">
          {t('member.legal.backHome')}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </nav>

      <p className="sk-legal__emergency">
        {t('member.legal.emergencyBefore')} <a href="tel:112">112</a>{t('member.legal.emergencyAfter')}
      </p>
    </main>
  );
}
