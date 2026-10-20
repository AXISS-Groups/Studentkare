import React, { useId, useState } from 'react';
import { apiRequest } from '@/data/services/http';
import { FormError, useMutation } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Illustration, type SkIconName } from '@/design-system/icons';
import { PublicAudienceHeader, PublicSitePage } from '@/design-system/public-site';
import { LwIconTile, LwNote, LwRulesPanel } from './landingWebKit';
import './landingWeb.css';

const CATEGORIES = ['Laboratory', 'Pharmacy', 'Clinic', 'Campus', 'Insurer', 'Other'] as const;

const NOT_FOR_SALE: readonly MessageKey[] = ['landing.partners.nfs.search', 'landing.partners.nfs.record', 'landing.partners.nfs.ads'];

const WHO: ReadonlyArray<{ id: string; icon: SkIconName; tone: 'action' | 'positive' | 'info' | 'attention' | 'danger' }> = [
  { id: 'campus', icon: 'graduation-cap-4', tone: 'action' },
  { id: 'pharmacy', icon: 'pill-2', tone: 'positive' },
  { id: 'lab', icon: 'flask-2', tone: 'info' },
  { id: 'clinic', icon: 'doctor-2', tone: 'attention' },
  { id: 'fitness', icon: 'activity', tone: 'danger' },
];

/**
 * Partnerships (design board WebPartnerships, Tier 3).
 *
 * "There are no sponsored slots to sell" is true: provider discovery sorts by
 * whether the pincode matches and then by legal name, and the endpoint says so
 * on every response. So that claim is kept, with the actual ordering stated
 * rather than the board's "stock, distance and turnaround", which nothing
 * implements.
 *
 * The application form is real. It posts to /billing/inquiries, which exists, is
 * public, refuses to record anything without consent, and publishes to the
 * support queue staff already read — so a submission reaches a person.
 *
 * Left off the board: the partner counts ("24 campuses", "18,420 verified
 * students"), the per-partner "non-negotiable" checks (NABL, NMC, drug
 * licence: nothing verifies them yet), the onboarding timeline and the "start
 * with one campus" numbers (no partner pipeline or metrics exist), the logo
 * wall and the founder's note (both marked PLACEHOLDER on the board),
 * "Commission published" (no rate is configured) and "we reply within a week".
 */
export function LandingPartnershipsView(): React.ReactElement {
  const t = useT();
  const id = useId();
  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const mutation = useMutation();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void mutation.run(
      () =>
        apiRequest('/billing/inquiries', {
          method: 'POST',
          body: JSON.stringify({
            organization,
            contactName,
            email,
            // Seats belong to a campus seat licence, not a partner listing.
            seats: 0,
            planId: 'ENTERPRISE',
            message: `Partnership enquiry · ${category}\n\n${message}`,
            consent,
          }),
        }),
      () => setSent(true),
    );
  };

  return (
    <PublicSitePage
      header={<PublicAudienceHeader current="partnerships" cta={{ label: 'landing.partners.applyCta', href: '#apply' }} />}
      art="primary"
      footerNote={t('landing.partners.footer.note')}
    >
      <section className="lw-hero-soft lw-hero-soft--warm" aria-label={t('landing.partners.eyebrow')}>
        <div className="lw-hero-soft__copy">
          <span className="lw-eyebrow">{t('landing.partners.eyebrow')}</span>
          <p className="lw-hero-soft__title">{t('landing.partners.banner.title')}</p>
          <ul className="lw-chips lw-chips--light">
            <li className="lw-chip">{t('landing.partners.chip.noPaid')}</li>
            <li className="lw-chip">{t('landing.partners.chip.pincode')}</li>
          </ul>
        </div>
        <div className="lw-hero-soft__art">
          <Illustration name="illustration-commission-network" width={560} height={164} />
        </div>
      </section>

      <section className="lw-intro lw-intro--wide" aria-labelledby="lw-partners-title">
        <div className="lw-intro__copy">
          <span className="lw-eyebrow">{t('landing.partners.eyebrow')}</span>
          <h1 className="lw-h1 lw-h1--xl" id="lw-partners-title">{t('landing.partners.title')}</h1>
          <p className="lw-lede lw-lede--lg">{t('landing.partners.lede')}</p>
        </div>
        <div className="lw-intro__side">
          <LwNote icon="alert-circle-3" tone="attention">
            <strong className="lw-note__title">{t('landing.partners.gap.title')}</strong> {t('landing.partners.gap.body')}
          </LwNote>
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-partners-who">
        <h2 className="lw-h2" id="lw-partners-who">{t('landing.partners.who.title')}</h2>
        <ul className="lw-grid lw-grid--who">
          {WHO.map((w) => (
            <li key={w.id} className="lw-panel lw-who">
              <LwIconTile icon={w.icon} tone={w.tone} size={36} />
              <span className="lw-panel__title">{t(`landing.partners.who.${w.id}.name` as MessageKey)}</span>
              <span className="lw-panel__body">{t(`landing.partners.who.${w.id}.body` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <LwRulesPanel
        eyebrow={t('landing.partners.firewall.eyebrow')}
        title={t('landing.partners.firewall.heading')}
        lede={t('landing.partners.firewall.intro')}
        rules={NOT_FOR_SALE.map((key) => ({ label: t(key), tone: 'no', tag: t('landing.partners.notForSale') }))}
      />

      <section id="apply" className="lw-card lw-apply" aria-labelledby="lw-partners-apply">
        <div className="lw-apply__copy">
          <h2 className="lw-h2" id="lw-partners-apply">{t('landing.partners.apply.title')}</h2>
          <p className="lw-lede">{t('landing.partners.apply.lede')}</p>
          <p className="lw-count">{t('landing.partners.requiredNote')}</p>
        </div>

        {sent ? (
          <div className="lw-apply__sent" role="status">
            <Icon name="check-circle-2" size={22} className="lw-apply__sent-icon" />
            <div>
              <p className="lw-apply__sent-title">{t('landing.partners.sent.title')}</p>
              <p className="lw-apply__sent-body">{t('landing.partners.sent.body')}</p>
            </div>
          </div>
        ) : (
          <form className="lw-form" onSubmit={submit} noValidate>
            <FormError message={mutation.error} />

            <label className="lw-field">
              <span className="lw-field__label">{t('landing.partners.field.org')} *</span>
              <input className="lw-field__input" required value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={160} autoComplete="organization" />
            </label>
            <label className="lw-field">
              <span className="lw-field__label">{t('landing.partners.field.name')}</span>
              <input className="lw-field__input" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={120} autoComplete="name" />
            </label>
            <label className="lw-field">
              <span className="lw-field__label">{t('landing.partners.field.email')} *</span>
              <input className="lw-field__input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
            </label>

            <fieldset className="lw-field lw-field--wide">
              <legend className="lw-field__label">{t('landing.partners.field.category')} *</legend>
              <div className="lw-chooser">
                {CATEGORIES.map((option) => (
                  <span key={option} className="lw-chooser__item">
                    <input
                      className="lw-chooser__radio"
                      type="radio"
                      id={`${id}-${option}`}
                      name={`${id}-category`}
                      value={option}
                      checked={category === option}
                      onChange={() => setCategory(option)}
                    />
                    <label className="lw-chooser__chip" htmlFor={`${id}-${option}`}>
                      {t(`landing.partners.cat.${option}` as MessageKey)}
                    </label>
                  </span>
                ))}
              </div>
            </fieldset>

            <label className="lw-field lw-field--wide">
              <span className="lw-field__label">{t('landing.partners.field.message')}</span>
              <textarea className="lw-field__input lw-field__input--area" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} />
            </label>

            {/* Never pre-ticked, and the request is refused without it. */}
            <label className="lw-consent lw-field--wide">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t('landing.partners.consent')}</span>
            </label>

            <div className="lw-field--wide">
              <button className="lw-btn lw-btn--primary lw-btn--lg" type="submit" disabled={mutation.busy || !consent} aria-busy={mutation.busy || undefined}>
                {mutation.busy ? t('landing.partners.sending') : t('landing.partners.send')}
                <Icon name="arrow-right" size={16} />
              </button>
            </div>
          </form>
        )}
      </section>
    </PublicSitePage>
  );
}
