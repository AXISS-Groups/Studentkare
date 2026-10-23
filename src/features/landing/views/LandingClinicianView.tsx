import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { CanvasImage } from '@/design-system/art';
import { PublicAudienceHeader, PublicSitePage } from '@/design-system/public-site';
import { LwHeading, LwNote, LwRulesPanel } from './landingWebKit';
import './landingWeb.css';

type Flag = 'HH' | 'LL' | 'H' | 'N';

const CARDS = ['critical', 'timeline', 'prescribing', 'substitution', 'reviews', 'assistant'] as const;

const ACCESS: ReadonlyArray<{ label: MessageKey; on: boolean }> = [
  { label: 'landing.clinician.access.shared', on: true },
  { label: 'landing.clinician.access.why', on: true },
  { label: 'landing.clinician.access.tracker', on: true },
  { label: 'landing.clinician.access.log', on: true },
  { label: 'landing.clinician.access.noRelationship', on: false },
  { label: 'landing.clinician.access.outsideWindow', on: false },
  { label: 'landing.clinician.access.shop', on: false },
];

/**
 * For clinicians (design board LandingClinician). The queue is an
 * illustration and is labelled as one.
 *
 * Left out of the board, because nothing proves them: "90% of every fee" and
 * the hero art that prints it (no commission rate is configured), "Published
 * commission", "NMC-verified" and "verified against the register" (nothing
 * checks a registration yet). The gap note says what is missing.
 */
export function LandingClinicianView(): React.ReactElement {
  const t = useT();

  // Example rows only. Test names and units are not translated.
  const queue: { flag: Flag; name: string; meta: string; value: string; urgent: boolean }[] = [
    { flag: 'HH', name: 'Potassium 6.8 mmol/L', meta: t('landing.clinician.queue.released', { minutes: 11 }), value: t('landing.clinician.queue.ref', { range: '3.5–5.1' }), urgent: true },
    { flag: 'LL', name: 'Haemoglobin 7.1 g/dL', meta: t('landing.clinician.queue.released', { minutes: 38 }), value: t('landing.clinician.queue.ref', { range: '12.0–15.5' }), urgent: true },
    { flag: 'H', name: 'TSH 9.4 mIU/L', meta: t('landing.clinician.queue.acknowledged', { hours: 2 }), value: t('landing.clinician.queue.ref', { range: '0.4–4.0' }), urgent: false },
    { flag: 'N', name: 'Complete Blood Count', meta: t('landing.clinician.queue.allInRange', { count: 21 }), value: t('landing.clinician.queue.inRange'), urgent: false },
  ];

  return (
    <PublicSitePage
      header={<PublicAudienceHeader current="clinicians" cta={{ label: 'landing.plans.signIn', href: '/login' }} />}
      art="primary"
      footerNote={t('landing.campus.footer.building')}
    >
      <section className="lw-hero-soft lw-hero-soft--warm" aria-label={t('landing.campus.nav.forClinicians')}>
        <div className="lw-hero-soft__copy">
          <span className="lw-eyebrow">{t('landing.clinician.eyebrow')}</span>
          <p className="lw-hero-soft__title">{t('landing.clinician.banner.title')}</p>
          <ul className="lw-chips lw-chips--light">
            <li className="lw-chip">{t('landing.clinician.chip.listing')}</li>
            <li className="lw-chip">{t('landing.clinician.chip.fees')}</li>
            <li className="lw-chip">{t('landing.clinician.chip.queue')}</li>
          </ul>
        </div>
      </section>

      <section className="lw-intro lw-intro--wide" aria-labelledby="lw-clinician-title">
        <div className="lw-intro__copy">
          <span className="lw-eyebrow">{t('landing.clinician.eyebrow')}</span>
          <h1 className="lw-h1 lw-h1--xl" id="lw-clinician-title">{t('landing.clinician.title')}</h1>
          <p className="lw-lede lw-lede--lg">{t('landing.clinician.lede')}</p>
          <div className="lw-actions">
            <a className="lw-btn lw-btn--primary lw-btn--lg" href="/login">{t('landing.clinician.ctaQueue')}</a>
            <a className="lw-btn lw-btn--secondary lw-btn--lg" href="/login">{t('landing.clinician.ctaTimeline')}</a>
          </div>
        </div>
        <div className="lw-intro__side">
          <span className="lw-panel__meta lw-today__title">{t('landing.clinician.queue.eyebrow')}</span>
          <ul className="lw-queue">
            {queue.map((q) => (
              <li key={q.name} className="lw-queue__row">
                <span className={`lw-queue__flag lw-queue__flag--${q.flag === 'N' ? 'ok' : q.flag === 'H' ? 'watch' : 'urgent'}`}>{q.flag}</span>
                <span className="lw-queue__text">
                  <span className="lw-queue__name">{q.name}</span>
                  <span className="lw-queue__meta">{q.meta}</span>
                </span>
                <span className={`lw-queue__value${q.urgent ? ' lw-queue__value--urgent' : ''}`}>{q.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-clinician-cards">
        <LwHeading id="lw-clinician-cards" eyebrow={t('landing.clinician.cards.eyebrow')} title={t('landing.clinician.cards.title')} />
        <ul className="lw-grid lw-grid--3">
          {CARDS.map((c) => (
            <li key={c} className="lw-panel lw-job">
              <span className="lw-panel__meta">{t(`landing.clinician.card.${c}Eyebrow` as MessageKey)}</span>
              <span className="lw-job__title">{t(`landing.clinician.card.${c}Title` as MessageKey)}</span>
              <span className="lw-panel__body">{t(`landing.clinician.card.${c}Body` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <LwRulesPanel
        eyebrow={t('landing.clinician.access.eyebrow')}
        title={t('landing.clinician.access.title')}
        lede={t('landing.clinician.access.body')}
        rules={ACCESS.map((a) => ({ label: t(a.label), tone: a.on ? 'yes' : 'no', tag: t(a.on ? 'landing.clinician.access.tagYouSee' : 'landing.clinician.access.tagNever') }))}
      />

      <div className="lw-section lw-section--tight">
        <LwNote icon="alert-circle-3" tone="attention">
          <strong className="lw-note__title">{t('landing.clinician.gap.title')}</strong>{' '}
          <strong>{t('landing.clinician.gap.regTitle')}</strong> {t('landing.clinician.gap.regBody')}{' '}
          <strong>{t('landing.clinician.gap.payTitle')}</strong> {t('landing.clinician.gap.payBody')} {t('landing.clinician.joining.body')}
        </LwNote>
      </div>

      <section className="lw-start" aria-labelledby="lw-clinician-cta">
        <CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" className="lw-recruit__art" />
        <div className="lw-start__copy">
          <h2 className="lw-h2 lw-h2--lg" id="lw-clinician-cta">{t('landing.clinician.cta.title')}</h2>
          <p className="lw-lede">{t('landing.clinician.cta.body')}</p>
        </div>
        <div className="lw-start__cta">
          <a className="lw-btn lw-btn--primary lw-btn--lg" href="/login">{t('landing.plans.signIn')}</a>
        </div>
      </section>
    </PublicSitePage>
  );
}
