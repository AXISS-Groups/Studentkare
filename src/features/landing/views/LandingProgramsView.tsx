import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { CanvasImage, CanvasVideo, type CanvasImageName } from '@/design-system/art';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { LwBanner, LwFaq, LwRulesPanel, LwSteps } from './landingWebKit';
import './landingWeb.css';

/** Each programme with the canvas art the board gives it. */
const PROGRAMMES: ReadonlyArray<{ id: string; art: CanvasImageName }> = [
  { id: 'diabetes', art: 'image-ccaceb.png' },
  { id: 'asthma', art: 'image-e4c535.png' },
  { id: 'mental', art: 'a-glossy-3d-heart-beating-gently-350fa7.png' },
  { id: 'pcos', art: 'image-aa86cc.png' },
];

const INCLUDES = [1, 2, 3, 4, 5] as const;
const STEPS = [1, 2, 3, 4] as const;
const RULES = [
  { n: 1, on: true },
  { n: 2, on: true },
  { n: 3, on: true },
  { n: 4, on: false },
  { n: 5, on: false },
  { n: 6, on: false },
] as const;
const FAQS = [1, 2, 3, 4, 5] as const;

const k = (key: string): MessageKey => `landing.programs.${key}` as MessageKey;

/**
 * Care programmes (design board WebPrograms). There is no self-enrolment
 * endpoint — a clinician enrols a student after a consult — so the board's
 * "Join" buttons lead to a consult instead, and "open now" is not claimed.
 */
export function LandingProgramsView(): React.ReactElement {
  const t = useT();

  return (
    <PublicSitePage header={<PublicSiteHeader current="programmes" variant="compact" />} art="alternate" footerNote={t(k('footerNote'))}>
      <LwBanner
        label={t(k('bannerLabel'))}
        eyebrow={t(k('eyebrow'))}
        title={t(k('bannerTitle'))}
        chips={[t(k('chipClinician')), t(k('chipCheckins')), t(k('chipNoScores'))]}
        media={<CanvasVideo name="video-2c18e6.mp4" />}
      />

      <section className="lw-intro" aria-labelledby="lw-programs-title">
        <div className="lw-intro__copy">
          <span className="lw-eyebrow">{t(k('introEyebrow'))}</span>
          <h1 className="lw-h1" id="lw-programs-title">{t(k('title'))}</h1>
          <p className="lw-lede">{t(k('intro'))}</p>
          <div className="lw-actions">
            <a className="lw-btn lw-btn--primary lw-btn--lg" href="/consult">
              {t(k('ctaLabel'))}
              <Icon name="arrow-right" size={17} />
            </a>
          </div>
          <p className="lw-note">{t(k('ctaNote'))}</p>
        </div>

        <div className="lw-intro__side">
          <div className="lw-panel lw-includes">
            <span className="lw-panel__meta lw-includes__eyebrow">{t(k('includesTitle'))}</span>
            <ul className="lw-includes__list">
              {INCLUDES.map((n) => (
                <li key={n} className="lw-includes__row">
                  <Icon name="check" size={16} strokeWidth={2.6} className="lw-includes__tick" />
                  <span className="lw-includes__text">
                    <span className="lw-includes__title">{t(k(`include${n}Title`))}</span>
                    <span className="lw-includes__body">{t(k(`include${n}Body`))}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-programs-list">
        <div className="lw-heading__text">
          <h2 className="lw-h2" id="lw-programs-list">{t(k('listTitle'))}</h2>
          <p className="lw-lede">{t(k('listNote'))}</p>
        </div>
        <ul className="lw-grid lw-grid--4">
          {PROGRAMMES.map((p) => {
            const name = t(k(`prog.${p.id}.name`));
            return (
              <li key={p.id} className="lw-panel lw-prog">
                <CanvasImage name={p.art} className="lw-prog__art" />
                <h3 className="lw-prog__name">{name}</h3>
                <p className="lw-prog__body">{t(k(`prog.${p.id}.body`))}</p>
                <ul className="lw-prog__points">
                  {[1, 2, 3].map((n) => (
                    <li key={n}>{t(k(`prog.${p.id}.p${n}`))}</li>
                  ))}
                </ul>
                <span className="lw-spacer" />
                <a className="lw-btn lw-btn--soft lw-btn--block" href="/consult" aria-label={t(k('askAria'), { name })}>
                  {t(k('ask'))}
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <LwSteps title={t(k('stepsTitle'))} steps={STEPS.map((n) => ({ title: t(k(`step${n}Title`)), body: t(k(`step${n}Body`)) }))} />

      <LwRulesPanel
        eyebrow={t(k('notEyebrow'))}
        title={t(k('notTitle'))}
        lede={t(k('notBody'))}
        rules={RULES.map((r) => ({ label: t(k(`rule${r.n}`)), tone: r.on ? 'yes' : 'no', tag: t(k(r.on ? 'tagYes' : 'tagNever')) }))}
      />

      <LwFaq title={t(k('faqTitle'))} items={FAQS.map((n) => ({ q: t(k(`faq${n}Q`)), a: t(k(`faq${n}A`)) }))} />
    </PublicSitePage>
  );
}
