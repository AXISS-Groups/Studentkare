import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BrandLogo, Icon } from '@/design-system/icons';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { useRoutePath } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { LegalView } from './LegalView';
import { LegalText, useLegalDocument } from '@/features/privacy/LegalText';
import type { LegalKind } from '@/features/privacy/privacyRepository';
import '@/features/studentweb/studentweb.css';
import '@/features/studentweb/views/t1/t1web.css';
import './legal.css';
import '@/design-system/design-system.css';

type LegalTab = 'privacy' | 'terms' | 'grievance';
const TABS: ReadonlyArray<{ id: LegalTab; label: MessageKey }> = [
  { id: 'privacy', label: 'member.legal.privacyTitle' },
  { id: 'terms', label: 'member.legal.termsTitle' },
  { id: 'grievance', label: 'swt.legal.tab.grievance' },
];
const KIND: Record<LegalTab, LegalKind> = { privacy: 'PRIVACY_NOTICE', terms: 'TERMS', grievance: 'GRIEVANCE_OFFICER' };
const NOW: readonly MessageKey[] = ['member.legal.nowShare', 'member.legal.nowEndShare', 'member.legal.nowConsents', 'member.legal.nowAdults'];
const REQUIRED: ReadonlyArray<{ lead: MessageKey; body: MessageKey }> = [
  { lead: 'member.legal.officerLead', body: 'member.legal.officerBody' },
  { lead: 'member.legal.purposeLead', body: 'member.legal.purposeBody' },
  { lead: 'member.legal.retentionLead', body: 'member.legal.retentionBody' },
  { lead: 'member.legal.reviewLead', body: 'member.legal.reviewBody' },
];

/**
 * Privacy, terms and grievances, web (canvas 3b, WebLegal, Tier 1 — approved
 * by Krishna Chintakayala, 2026-10-21). Its own frame (logo and Help centre, no
 * sidebar) with the board's three tabs, public at /privacy and /terms.
 *
 * The notice text comes only from legal (D6-10): a super admin publishes the
 * version legal supplies (Super admin, Legal documents, GET /legal/{kind}) and
 * this page shows it with its version and date. Until a kind is published its
 * tab says plainly that it isn't, what has to exist first, and what the code
 * does today; no officer name, address, version or response time is printed
 * then. At phone width the phone board (LegalView) is drawn instead.
 */
export function WebLegalView(): React.ReactElement {
  const phone = usePhoneFrame();
  if (phone) return <LegalView />;
  return <WebLegalPage />;
}

function WebLegalPage(): React.ReactElement {
  const t = useT();
  const route = useRoutePath();
  const [tab, setTab] = useState<LegalTab>(route.includes('terms') ? 'terms' : 'privacy');
  const doc = useLegalDocument(KIND[tab]);
  return (
    <div className="sk-swt-legal">
      <header className="sk-swt-legal__top">
        {/* Named by the wordmark it shows (label-in-name), then where it goes. */}
        <a className="sk-swt-legal__brand" href="/">
          <BrandLogo size={30} label="" />
          <span>{t('shell.brand.student')}<em>&nbsp;{t('shell.brand.kare')}</em></span>
          <span className="sk-visually-hidden">{t('member.legal.backHome')}</span>
        </a>
        <button type="button" className="sk-sw-link" onClick={() => navigate('support')}>{t('swt.legal.help')}</button>
      </header>
      <main className="sk-sw-page sk-swt-legal__main" id="main">
        <div className="sk-swt-two">
          <div className="sk-swt-col">
            <h1 className="sk-sw-title">{t('swt.legal.title')}</h1>
            <div className="sk-sw-tabs" role="group" aria-label={t('swt.legal.tabsLabel')}>
              {TABS.map((entry) => (
                <button key={entry.id} type="button" className="sk-sw-tab is-dark" aria-pressed={tab === entry.id} onClick={() => setTab(entry.id)}>{t(entry.label)}</button>
              ))}
            </div>
            {doc.status === 'loading' ? <p className="sk-sw-muted" role="status">{t('privacy.legal.loading')}</p>
              : doc.status === 'error' ? (
                <div className="sk-swt-col">
                  <p className="sk-sw-error" role="alert">{t('privacy.legal.error')}</p>
                  <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={doc.retry}>{t('common.tryAgain')}</button>
                </div>
              ) : doc.doc.published ? (
                <section className="sk-swt-col" aria-label={t(TABS.find((entry) => entry.id === tab)?.label ?? 'member.legal.privacyTitle')}>
                  <LegalText doc={doc.doc} />
                  {tab === 'grievance' ? <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={() => navigate('my-requests')}>{t('swt.legal.grievanceCta')}<Icon name="arrow-right" size={16} /></button> : null}
                </section>
              ) : tab === 'grievance' ? (
              <section className="sk-swt-col" aria-labelledby="sk-swt-legal-g">
                <h2 id="sk-swt-legal-g" className="sk-sw-h2">{t('swt.legal.grievanceTitle')}</h2>
                <p className="sk-sw-note" role="status">{t('member.legal.officerBody')}</p>
                <p className="sk-sw-muted">{t('swt.legal.grievanceNow')}</p>
                <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={() => navigate('my-requests')}>{t('swt.legal.grievanceCta')}<Icon name="arrow-right" size={16} /></button>
              </section>
            ) : (
              <section className="sk-swt-col" aria-labelledby="sk-swt-legal-n">
                <h2 id="sk-swt-legal-n" className="sk-sw-h2">{tab === 'privacy' ? t('member.legal.privacyNotPublished') : t('member.legal.termsNotPublished')}</h2>
                <p className="sk-sw-muted">{t('member.legal.noticeBody')}</p>
                <h3 className="sk-sw-card__title">{t('member.legal.requiredHeading')}</h3>
                <ul className="sk-swt-checks">
                  {REQUIRED.map((item) => <li key={item.lead}><span><strong>{t(item.lead)}</strong> {t(item.body)}</span></li>)}
                </ul>
              </section>
            )}
            <p className="sk-sw-fine">
              {t('member.legal.emergencyBefore')} <a href="tel:112">112</a>{t('member.legal.emergencyAfter')}
            </p>
          </div>
          <aside className="sk-sw-card sk-swt-side" aria-labelledby="sk-swt-legal-now">
            <h2 id="sk-swt-legal-now" className="sk-sw-eyebrow">{t('member.legal.nowHeading')}</h2>
            <p className="sk-sw-fine">{t('member.legal.nowBody')}</p>
            <ul>{NOW.map((key) => <li key={key}>{t(key)}</li>)}</ul>
            <button type="button" className="sk-sw-link" onClick={() => navigate('delete-account')}>{t('swt.legal.manage')}<Icon name="arrow-right" size={15} /></button>
          </aside>
        </div>
      </main>
    </div>
  );
}
