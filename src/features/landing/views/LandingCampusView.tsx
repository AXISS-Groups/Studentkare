import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Illustration } from '@/design-system/icons';
import { PublicAudienceHeader, PublicSitePage } from '@/design-system/public-site';
import { LwHeading, LwNote, LwRulesPanel } from './landingWebKit';
import './landingWeb.css';

const TODAY: readonly MessageKey[] = ['landing.campus.today.enrolment', 'landing.campus.today.camps', 'landing.campus.today.noRecords'];

const BOUNDARY: ReadonlyArray<{ label: MessageKey; on: boolean }> = [
  { label: 'landing.campus.boundary.enrolment', on: true },
  { label: 'landing.campus.boundary.records', on: false },
  { label: 'landing.campus.boundary.nameDiagnosis', on: false },
  { label: 'landing.campus.boundary.leaving', on: false },
  { label: 'landing.campus.boundary.crisis', on: false },
];

const JOBS = ['camps', 'verify', 'coverage', 'governance'] as const;
/** Cohort coverage reporting is planned, not built: its card says so in amber. */
const PLANNED = new Set<(typeof JOBS)[number]>(['coverage']);

const COMPARE = [1, 2, 3, 4] as const;

/**
 * For campuses (design board LandingCampus). No campus statistics are shown:
 * the "24 campuses live", "95.6% attendance", "11 mins" and "86%
 * auto-verified" figures on the board have no source, and cohort reporting
 * does not exist yet, so a note says so where the board shows its numbers.
 */
export function LandingCampusView(): React.ReactElement {
  const t = useT();

  return (
    <PublicSitePage
      header={<PublicAudienceHeader current="campuses" cta={{ label: 'landing.campus.enquire', href: '/partnerships' }} />}
      art="primary"
      footerNote={t('landing.campus.footer.building')}
    >
      <section className="lw-hero-soft" aria-label={t('landing.campus.nav.forCampuses')}>
        <div className="lw-hero-soft__copy">
          <span className="lw-eyebrow">{t('landing.campus.bannerEyebrow')}</span>
          <p className="lw-hero-soft__title">{t('landing.campus.banner.title')}</p>
          <ul className="lw-chips lw-chips--light">
            <li className="lw-chip">{t('landing.campus.chip.camps')}</li>
            <li className="lw-chip">{t('landing.campus.chip.enrolment')}</li>
            <li className="lw-chip">{t('landing.campus.chip.oneCamp')}</li>
          </ul>
        </div>
        <div className="lw-hero-soft__art">
          <Illustration name="illustration-campus-map-route" width={560} height={164} />
        </div>
      </section>

      <section className="lw-intro lw-intro--wide" aria-labelledby="lw-campus-title">
        <div className="lw-intro__copy">
          <span className="lw-eyebrow">{t('landing.campus.eyebrow')}</span>
          <h1 className="lw-h1 lw-h1--xl" id="lw-campus-title">{t('landing.campus.title')}</h1>
          <p className="lw-lede lw-lede--lg">{t('landing.campus.lede')}</p>
          <div className="lw-actions">
            <a className="lw-btn lw-btn--primary lw-btn--lg" href="/login">{t('landing.campus.ctaConsole')}</a>
            <a className="lw-btn lw-btn--secondary lw-btn--lg" href="/campuses#camps">{t('landing.campus.ctaCamp')}</a>
          </div>
        </div>
        <div className="lw-intro__side">
          <h2 className="lw-panel__meta lw-today__title">{t('landing.campus.today.title')}</h2>
          <ul className="lw-today">
            {TODAY.map((item) => (
              <li key={item} className="lw-today__row">{t(item)}</li>
            ))}
          </ul>
        </div>
      </section>

      <LwRulesPanel
        eyebrow={t('landing.campus.boundary.eyebrow')}
        title={t('landing.campus.boundary.title')}
        lede={t('landing.campus.boundary.body')}
        rules={BOUNDARY.map((b) => ({ label: t(b.label), tone: b.on ? 'yes' : 'no', tag: t(b.on ? 'landing.campus.boundary.canSee' : 'landing.campus.boundary.cannotSee') }))}
      />

      <div className="lw-section lw-section--tight">
        <LwNote icon="alert-circle-3" tone="attention">
          <strong className="lw-note__title">{t('landing.campus.gap.title')}</strong> {t('landing.campus.gap.body')}
        </LwNote>
      </div>

      <section id="camps" className="lw-section" aria-labelledby="lw-campus-jobs">
        <LwHeading id="lw-campus-jobs" eyebrow={t('landing.campus.jobs.eyebrow')} title={t('landing.campus.jobs.title')} />
        <ul className="lw-grid lw-grid--4">
          {JOBS.map((j) => (
            <li key={j} className="lw-panel lw-job">
              <span className="lw-panel__meta">{t(`landing.campus.jobs.${j}Eyebrow` as MessageKey)}</span>
              <span className="lw-job__title">{t(`landing.campus.jobs.${j}Title` as MessageKey)}</span>
              <span className="lw-panel__body">{t(`landing.campus.jobs.${j}Body` as MessageKey)}</span>
              <span className="lw-spacer" />
              <span className={`lw-job__foot lw-job__foot--${PLANNED.has(j) ? 'planned' : 'live'}`}>{t(`landing.campus.jobs.${j}Foot` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lw-intro lw-liability" aria-labelledby="lw-campus-liability">
        <div className="lw-intro__copy">
          <span className="lw-eyebrow">{t('landing.campus.liability.eyebrow')}</span>
          <h2 className="lw-h2 lw-h2--lg" id="lw-campus-liability">{t('landing.campus.liability.title')}</h2>
          <p className="lw-lede">{t('landing.campus.liability.body')}</p>
        </div>
        <ul className="lw-intro__side lw-compare">
          {COMPARE.map((n) => (
            <li key={n} className="lw-compare__row">
              <span className="lw-compare__cell">
                <span className="lw-compare__label">{t('landing.campus.compare.today')}</span>
                <span className="lw-compare__before">{t(`landing.campus.compare.r${n}Before` as MessageKey)}</span>
              </span>
              <span className="lw-compare__cell">
                <span className="lw-compare__label lw-compare__label--with">{t('landing.campus.compare.with')}</span>
                <span className="lw-compare__after">{t(`landing.campus.compare.r${n}After` as MessageKey)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* The walkthrough button used to go to the sign-in page; the enquiry form is what reaches us. */}
      <section id="walkthrough" className="lw-start" aria-labelledby="lw-campus-walk">
        <div className="lw-start__copy">
          <h2 className="lw-h2 lw-h2--lg" id="lw-campus-walk">{t('landing.campus.walk.title')}</h2>
          <p className="lw-lede">{t('landing.campus.walk.body')}</p>
        </div>
        <div className="lw-start__cta">
          <a className="lw-btn lw-btn--primary lw-btn--lg" href="/partnerships">{t('landing.campus.enquire')}</a>
          <span className="lw-count">{t('landing.campus.walk.note')}</span>
        </div>
      </section>
    </PublicSitePage>
  );
}
