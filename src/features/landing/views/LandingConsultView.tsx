import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Illustration, type SkIconName } from '@/design-system/icons';
import { CanvasImage } from '@/design-system/art';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { LwFaq, LwIconTile, LwRulesPanel } from './landingWebKit';
import './landingWeb.css';

/**
 * Consult a doctor (design board WebConsult).
 *
 * Left out of the board, because nothing proves them:
 * - Fixed per-speciality fees and "₹149 on Premium" discounts. No consult fee
 *   or plan discount exists in any data this page can read; the fee is the
 *   doctor's and is shown before booking.
 * - "NMC-registered" and "verified against the register". Nothing checks a
 *   registration against any register.
 * - "Usually seen within 30 minutes": a service level nobody has committed to.
 * - The "on shift right now" doctors: no clinician roster is published, so the
 *   card shows its empty state.
 */

/** LandingConsultNativeView keeps the same lists, so both say the same thing. */
const CONSULT_PROMISES = ['price', 'rx', 'private'] as const;
const CONSULT_SPECS = ['general', 'fever', 'report', 'mental', 'skin', 'women'] as const;
const CONSULT_RULES = [
  { key: 'shared', on: true },
  { key: 'note', on: true },
  { key: 'wholeVault', on: false },
  { key: 'expired', on: false },
  { key: 'commerce', on: false },
] as const;
const CONSULT_FAQS = ['eduId', 'rx', 'again', 'cancel', 'private', 'emergency'] as const;

type Tone = 'action' | 'positive' | 'attention' | 'danger' | 'info';

const PROMISE_ICON: Record<(typeof CONSULT_PROMISES)[number], { icon: SkIconName; tone: Tone }> = {
  price: { icon: 'clock-3', tone: 'action' },
  rx: { icon: 'prescription-2', tone: 'positive' },
  private: { icon: 'lock-6', tone: 'info' },
};

const SPEC_ICON: Record<(typeof CONSULT_SPECS)[number], { icon: SkIconName; tone: Tone }> = {
  general: { icon: 'doctor-2', tone: 'action' },
  fever: { icon: 'droplet-2', tone: 'danger' },
  report: { icon: 'prescription-2', tone: 'action' },
  mental: { icon: 'brain-2', tone: 'info' },
  skin: { icon: 'sparkle', tone: 'attention' },
  women: { icon: 'person-badge', tone: 'positive' },
};

const promiseKey = (k: (typeof CONSULT_PROMISES)[number]) => `landing.consult.promise.${k}` as MessageKey;
const specKey = (k: (typeof CONSULT_SPECS)[number]) => `landing.consult.spec.${k}` as MessageKey;
const ruleKey = (k: (typeof CONSULT_RULES)[number]['key']) => `landing.consult.rule.${k}` as MessageKey;
const faqKey = (k: (typeof CONSULT_FAQS)[number], part: 'q' | 'a') => `landing.consult.faq.${k}.${part}` as MessageKey;

export function LandingConsultView(): React.ReactElement {
  const t = useT();

  return (
    <PublicSitePage header={<PublicSiteHeader current="findDoctor" variant="compact" />} art="alternate">
      <section className="lw-hero-soft lw-hero-soft--rose" aria-label={t('landing.consult.banner.label')}>
        <div className="lw-hero-soft__copy">
          <span className="lw-eyebrow">{t('landing.consult.eyebrow')}</span>
          <p className="lw-hero-soft__title">{t('landing.consult.banner.title')}</p>
          <ul className="lw-chips lw-chips--light">
            <li className="lw-chip">{t('landing.consult.chip.mode')}</li>
            <li className="lw-chip">{t('landing.consult.chip.price')}</li>
          </ul>
        </div>
        <div className="lw-hero-soft__art">
          <Illustration name="illustration-nmc-registration" width={560} height={164} />
        </div>
      </section>

      <section className="lw-intro" aria-labelledby="lw-consult-title">
        <div className="lw-intro__copy">
          <h1 className="lw-h1" id="lw-consult-title">{t('landing.consult.hero.title')}</h1>
          <p className="lw-lede">{t('landing.consult.hero.lede')}</p>
          <ul className="lw-promises">
            {CONSULT_PROMISES.map((k) => (
              <li key={k} className="lw-promise">
                <LwIconTile icon={PROMISE_ICON[k].icon} tone={PROMISE_ICON[k].tone} size={36} />
                {t(promiseKey(k))}
              </li>
            ))}
          </ul>
          <div className="lw-actions">
            <a className="lw-btn lw-btn--primary lw-btn--lg" href="/appointments">
              {t('landing.consult.hero.ctaLabel')}
              <Icon name="arrow-right" size={17} />
            </a>
          </div>
        </div>

        <div className="lw-intro__side">
          <div className="lw-panel lw-shift">
            <CanvasImage name="a-doctor-on-a-video-consult-460112.png" className="lw-shift__art" />
            <span className="lw-panel__meta lw-shift__eyebrow">{t('landing.consult.shift.title')}</span>
            {/* No clinician roster is published yet, so nobody is listed as on shift. */}
            <p className="lw-shift__empty" role="status">{t('landing.consult.shift.empty')}</p>
            <p className="lw-shift__order">{t('landing.consult.shift.order')}</p>
          </div>
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-consult-specs">
        <h2 className="lw-h2" id="lw-consult-specs">{t('landing.consult.specs.title')}</h2>
        <ul className="lw-grid lw-grid--6">
          {CONSULT_SPECS.map((k) => (
            <li key={k}>
              <a className="lw-panel lw-spec" href="/appointments">
                <LwIconTile icon={SPEC_ICON[k].icon} tone={SPEC_ICON[k].tone} size={36} />
                <span className="lw-spec__name">{t(specKey(k))}</span>
                <span className="lw-spec__fee">{t('landing.consult.spec.fee')}</span>
                <span className="lw-spec__note">{t(k === 'mental' ? 'landing.consult.spec.crisisFree' : 'landing.consult.spec.feeNote')}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <LwRulesPanel
        eyebrow={t('landing.consult.rules.eyebrow')}
        title={t('landing.consult.rules.title')}
        lede={t('landing.consult.rules.lede')}
        rules={CONSULT_RULES.map((r) => ({ label: t(ruleKey(r.key)), tone: r.on ? 'yes' : 'no', tag: t(r.on ? 'landing.consult.tag.yes' : 'landing.consult.tag.never') }))}
      />

      <LwFaq title={t('landing.consult.faq.title')} items={CONSULT_FAQS.map((k) => ({ q: t(faqKey(k, 'q')), a: t(faqKey(k, 'a')) }))} />

      <section className="lw-recruit" aria-labelledby="lw-consult-recruit">
        <div className="lw-recruit__copy">
          <span className="lw-eyebrow">{t('landing.consult.recruit.eyebrow')}</span>
          <h2 className="lw-h2" id="lw-consult-recruit">{t('landing.consult.recruit.title')}</h2>
          <p className="lw-lede">{t('landing.consult.recruit.body')}</p>
        </div>
        <CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" className="lw-recruit__art" />
        <a className="lw-btn lw-btn--primary lw-btn--lg" href="/clinicians">
          {t('landing.consult.recruit.ctaLabel')}
          <Icon name="arrow-right" size={17} />
        </a>
      </section>
    </PublicSitePage>
  );
}
