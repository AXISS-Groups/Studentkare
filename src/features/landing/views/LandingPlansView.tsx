import React from 'react';
import { planPackageLabels, planPriceLabel } from '@/data/datasets/billingPrices';
import type { BillingPlan } from '@/data/datasets/billing';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Illustration } from '@/design-system/icons';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { PUBLIC_ROUTES } from '@/design-system/public-site/publicSiteNav';
import { LwFaq, LwRulesPanel } from './landingWebKit';
import { isInstitutionPlan, isNotSoldOnline, ONLINE_PLAN, usePlanCatalog } from './planCatalog';
import './landingWeb.css';
import './landingPlans.css';

/**
 * Public plans page (design board WebPlans, Tier 1; approved by Krishna
 * Chintakayala on 2026-10-21, plan docs/plans/tier1-canvas-wp01-2026-10-20.md).
 *
 * Every plan name, price, package and benefit comes from the server catalogue
 * (`GET /billing/plans`, priced from the settings registry): the same source
 * the checkout uses. One malformed plan and no price is shown at all. The
 * board's own prices, its family plan, its pay-per-use "from" prices, its
 * commission bars and its "most students" badge have no source, so they are
 * not drawn. The hero art keeps its shapes and drops its lettering, which
 * carried the board's prices.
 */

const INSTITUTION_HREF = '/partnerships';

/** Policy rows: the same on every plan (statements kept in i18n, not pricing). */
const SAME_ROWS: ReadonlyArray<{ label: MessageKey; note: MessageKey; value: MessageKey }> = [
  { label: 'landing.plans.table.records', note: 'landing.plans.table.recordsNote', value: 'landing.plans.table.included' },
  { label: 'landing.plans.table.card', note: 'landing.plans.table.cardNote', value: 'landing.plans.table.included' },
  { label: 'landing.plans.table.crisis', note: 'landing.plans.table.crisisNote', value: 'landing.plans.table.alwaysFree' },
  { label: 'landing.plans.table.critical', note: 'landing.plans.table.criticalNote', value: 'landing.plans.table.same' },
  { label: 'landing.plans.table.export', note: 'landing.plans.table.exportNote', value: 'landing.plans.table.anyTime' },
];

const PAY_PER_USE: ReadonlyArray<{ label: MessageKey; note: MessageKey }> = [
  { label: 'landing.plans.ppu.labLabel', note: 'landing.plans.ppu.labNote' },
  { label: 'landing.plans.ppu.medicinesLabel', note: 'landing.plans.ppu.medicinesNote' },
  { label: 'landing.plans.ppu.teleconsultLabel', note: 'landing.plans.ppu.teleconsultNote' },
  { label: 'landing.plans.ppu.visitLabel', note: 'landing.plans.ppu.visitNote' },
];

const NEVER_RULES: ReadonlyArray<{ label: MessageKey; pays: boolean }> = [
  { label: 'landing.plans.never.critical', pays: false },
  { label: 'landing.plans.never.crisis', pays: false },
  { label: 'landing.plans.never.access', pays: false },
  { label: 'landing.plans.never.export', pays: false },
  { label: 'landing.plans.never.benefits', pays: true },
];

const FAQS: ReadonlyArray<{ q: MessageKey; a: MessageKey }> = [
  { q: 'landing.plans.faq.q1', a: 'landing.plans.faq.a1' },
  { q: 'landing.plans.faq.q2', a: 'landing.plans.faq.a2' },
  { q: 'landing.plans.faq.q3', a: 'landing.plans.faq.a3' },
  { q: 'landing.plans.faq.q4', a: 'landing.plans.faq.a4' },
];

const SKELETON_CARDS = [1, 2, 3, 4] as const;

function badgeKey(plan: BillingPlan): MessageKey | null {
  if (isInstitutionPlan(plan)) return 'landing.plans.badge.institution';
  if (isNotSoldOnline(plan)) return 'landing.plans.badge.notOnline';
  if (typeof plan.price !== 'number') return 'landing.plans.badge.everyAccount';
  return null;
}

function footKey(plan: BillingPlan): MessageKey | null {
  if (isInstitutionPlan(plan)) return 'landing.plans.foot.institution';
  if (isNotSoldOnline(plan)) return 'landing.plans.foot.notOnline';
  if (typeof plan.price !== 'number') return 'landing.plans.foot.free';
  if (plan.id === ONLINE_PLAN) return 'landing.plans.foot.paid';
  return null;
}

function PlanCard({ plan }: { plan: BillingPlan }): React.ReactElement {
  const t = useT();
  const institution = isInstitutionPlan(plan);
  const free = !institution && typeof plan.price !== 'number';
  const notOnline = isNotSoldOnline(plan);
  const badge = badgeKey(plan);
  const foot = footKey(plan);
  const headingId = `lp-plan-${plan.id}`;
  const tone = institution ? ' lp-plan--institution' : free ? ' lp-plan--free' : '';
  return (
    <article className={`lp-plan${tone}`} aria-labelledby={headingId}>
      {badge ? <span className="lp-plan__badge">{t(badge)}</span> : null}
      <h3 className="lp-plan__name" id={headingId}>{plan.name}</h3>
      <p className="lp-plan__price">
        <span className="lp-plan__amount">{planPriceLabel(plan, t)}</span>
        <span className="lp-plan__period">{plan.period}</span>
      </p>
      {planPackageLabels(plan, t).map((label) => (
        <span key={label} className="lp-plan__package">{label}</span>
      ))}
      <p className="lp-plan__desc">{plan.description}</p>
      <span className="lp-plan__rule" aria-hidden="true" />
      {plan.benefits.length > 0 ? (
        <ul className="lp-plan__benefits">
          {plan.benefits.map((b) => (
            <li key={b} className="lp-plan__benefit">
              <Icon name="check" size={15} strokeWidth={2.6} className="lp-plan__tick" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lp-plan__pending">{t('landing.plans.benefitsPending')}</p>
      )}
      <span className="lp-plan__spacer" />
      {notOnline ? null : (
        <a
          className={`lp-plan__cta${free ? ' lp-plan__cta--primary' : institution ? ' lp-plan__cta--light' : ''}`}
          href={institution ? INSTITUTION_HREF : PUBLIC_ROUTES.signIn}
        >
          {free ? t('landing.plans.ctaStudent') : institution ? t('landing.plans.ctaInstitution') : t('landing.plans.choose', { name: plan.name })}
        </a>
      )}
      {foot ? <p className="lp-plan__foot">{t(foot)}</p> : null}
    </article>
  );
}

export function LandingPlansView(): React.ReactElement {
  const t = useT();
  const { state, reload } = usePlanCatalog();
  const plans = state.status === 'ready' ? state.plans : [];
  const studentPlans = plans.filter((p) => !isInstitutionPlan(p));

  return (
    <PublicSitePage header={<PublicSiteHeader current="plans" variant="compact" />} art="alternate">
      <section className="lp-hero" aria-label={t('landing.plans.hero.eyebrow')}>
        <div className="lp-hero__copy">
          <span className="lw-eyebrow">{t('landing.plans.hero.eyebrow')}</span>
          <p className="lp-hero__title" aria-hidden="true">{t('landing.plans.hero.title')}</p>
          {studentPlans.length > 0 ? (
            <ul className="lp-hero__chips" aria-label={t('landing.plans.hero.chipsAria')}>
              {studentPlans.map((p) => (
                <li key={p.id} className="lp-hero__chip">
                  {t('landing.plans.hero.chip', { name: p.name, price: planPriceLabel(p, t) })}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="lp-hero__art">
          <Illustration name="illustration-care-circle-network" width={640} height={187} withoutText />
        </div>
      </section>

      <section className="lp-intro" aria-labelledby="lp-title">
        <h1 className="lw-h1 lp-intro__title" id="lp-title">{t('landing.plans.hero.title')}</h1>
        <p className="lw-lede lp-intro__lede">{t('landing.plans.intro')}</p>
        <span className="lp-intro__lock" aria-hidden="true">
          <Icon name="lock-6" size={44} strokeWidth={1.9} />
        </span>
      </section>

      <section className="lw-section lp-cards-section" aria-label={t('landing.plans.cardsAria')}>
        <div aria-live="polite">
          {state.status === 'loading' ? (
            <div role="status" aria-label={t('landing.plans.loading')} className="lp-cards">
              {SKELETON_CARDS.map((n) => (
                <div key={n} className="lp-plan lp-plan--skeleton" aria-hidden="true">
                  <span className="lp-skel lp-skel--short" />
                  <span className="lp-skel lp-skel--price" />
                  <span className="lp-skel" />
                  <span className="lp-skel" />
                  <span className="lp-skel lp-skel--short" />
                </div>
              ))}
            </div>
          ) : null}
          {state.status === 'error' ? (
            <div role="alert" className="lw-state lw-state--error lp-error">
              <span className="lw-state__title">{t('landing.plans.loadFailedTitle')}</span>
              <span className="lw-state__body">{t('landing.plans.loadFailedBody')}</span>
              <button type="button" className="lw-btn lw-btn--primary" onClick={reload}>
                {t('common.tryAgain')}
              </button>
              <span className="lp-error__ref">{t('landing.plans.errorRef')}</span>
            </div>
          ) : null}
          {state.status === 'ready' && plans.length === 0 ? (
            <p className="lw-state">{t('landing.plans.empty')}</p>
          ) : null}
          {plans.length > 0 ? (
            <ul className="lp-cards">
              {plans.map((p) => (
                <li key={p.id} className="lp-cards__item">
                  <PlanCard plan={p} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="lw-card lp-table" aria-labelledby="lp-table-title">
        <h2 className="lw-h2" id="lp-table-title">{t('landing.plans.table.title')}</h2>
        <table className="lp-table__grid">
          <caption className="sk-visually-hidden">{t('landing.plans.table.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('landing.plans.table.colWhat')}</th>
              <th scope="col">{t('landing.plans.table.colFree')}</th>
              <th scope="col" className="lp-table__paid">{t('landing.plans.table.colPaid')}</th>
            </tr>
          </thead>
          <tbody>
            {SAME_ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row">
                  <span className="lp-table__label">{t(r.label)}</span>
                  <span className="lp-table__note">{t(r.note)}</span>
                </th>
                <td data-label={t('landing.plans.table.colFree')}>{t(r.value)}</td>
                <td data-label={t('landing.plans.table.colPaid')}>{t(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lp-table__foot">{t('landing.plans.table.note')}</p>
      </section>

      <section className="lw-card lp-ppu" aria-labelledby="lp-ppu-title">
        <div className="lp-ppu__copy">
          <span className="lw-eyebrow">{t('landing.plans.payPerUse.eyebrow')}</span>
          <h2 className="lw-h2" id="lp-ppu-title">{t('landing.plans.payPerUse.title')}</h2>
          <p className="lw-lede">{t('landing.plans.payPerUse.body')}</p>
        </div>
        <ul className="lp-ppu__grid">
          {PAY_PER_USE.map((p) => (
            <li key={p.label} className="lp-ppu__tile">
              <span className="lp-ppu__label">{t(p.label)}</span>
              <span className="lp-ppu__note">{t(p.note)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-money" aria-labelledby="lp-money-title">
        <div className="lp-money__copy">
          <span className="lp-money__eyebrow">{t('landing.plans.money.eyebrow')}</span>
          <h2 className="lw-h2 lp-money__title" id="lp-money-title">{t('landing.plans.money.title')}</h2>
          <p className="lp-money__body">{t('landing.plans.money.body')}</p>
        </div>
        <p className="lp-money__ranking">{t('landing.plans.money.ranking')}</p>
      </section>

      <div className="lp-rules">
        <LwRulesPanel
          eyebrow={t('landing.plans.never.eyebrow')}
          title={t('landing.plans.never.title')}
          lede={t('landing.plans.never.body')}
          rules={NEVER_RULES.map((r) => ({
            label: t(r.label),
            tone: r.pays ? 'yes' : 'no',
            tag: t(r.pays ? 'landing.plans.never.tagPayFor' : 'landing.plans.never.tagNeverPaid'),
          }))}
        />
      </div>

      <LwFaq title={t('landing.plans.faq.title')} items={FAQS.map((f) => ({ q: t(f.q), a: t(f.a) }))} />
    </PublicSitePage>
  );
}
