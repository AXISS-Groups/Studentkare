import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/data/http';
import { FormError, useMutation } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './landing.css';

const CATEGORIES = ['Laboratory', 'Pharmacy', 'Clinic', 'Campus', 'Insurer', 'Other'] as const;

const NOT_FOR_SALE: readonly MessageKey[] = ['landing.partners.nfs.search', 'landing.partners.nfs.record', 'landing.partners.nfs.ads'];

/**
 * Partnerships (design page 3, `WebPartnerships`, Tier 3).
 *
 * The design's commercial pitch is the rare one that checks out. "There are no
 * sponsored slots to sell" is true: provider discovery sorts by whether the
 * pincode matches and then by legal name, and the endpoint says so on every
 * response — `"rankedBy": "pincode match, then name — never by commission or
 * paid placement"`. So that claim is kept, with the actual ordering stated
 * rather than the design's "stock, distance and turnaround", which nothing
 * implements.
 *
 * The application form is real. It posts to /billing/inquiries, which exists, is
 * public, refuses to record anything without consent, and publishes to the
 * support queue staff already read — so a submission reaches a person. That is
 * why this page has a form and /clinicians does not.
 *
 * Left off: the partner logo wall and the founder's note, both of which the
 * design itself marks PLACEHOLDER; "Commission published", since no rate is
 * configured anywhere; "we reply within a week", which is a service level
 * nobody has committed to; and the shared footer's NABL and NMC verification
 * badges.
 */
export function LandingPartnershipsView(): React.ReactElement {
  const t = useT();
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
    <main className="sk-landing">
      <section className="sk-landing__hero">
        <span className="sk-landing__eyebrow">{t('landing.partners.eyebrow')}</span>
        <h1 className="sk-landing__title">{t('landing.partners.title')}</h1>
        <p className="sk-landing__lede">{t('landing.partners.lede')}</p>
      </section>

      <section className="sk-landing__section" aria-labelledby="sk-part-firewall">
        <h2 className="sk-landing__heading" id="sk-part-firewall">
          {t('landing.partners.firewall.title')}
        </h2>
        <p className="sk-landing__footer-note">{t('landing.partners.firewall.intro')}</p>
        <div className="sk-landing__boundary">
          <ul className="sk-landing__boundary-list">
            {NOT_FOR_SALE.map((key) => (
              <li className="sk-landing__boundary-item" key={key}>
                <span className="sk-landing__boundary-tag">{t('landing.partners.notForSale')}</span>
                <p className="sk-landing__promise-body">{t(key)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="sk-landing__gap" role="note">
        <span className="sk-landing__gap-icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-landing__gap-title">{t('landing.partners.gap.title')}</p>
          <p className="sk-landing__gap-body">{t('landing.partners.gap.body')}</p>
        </div>
      </div>

      <section className="sk-landing__section" aria-labelledby="sk-part-apply">
        <h2 className="sk-landing__heading" id="sk-part-apply">
          {t('landing.partners.apply.title')}
        </h2>

        {sent ? (
          <div className="sk-landing__emergency" role="status" style={SENT_STYLE}>
            <span className="sk-landing__promise-icon">
              <CheckCircle2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="sk-landing__emergency-title">{t('landing.partners.sent.title')}</p>
              <p className="sk-landing__emergency-body">{t('landing.partners.sent.body')}</p>
            </div>
          </div>
        ) : (
          <form className="sk-landing__form" onSubmit={submit} noValidate>
            <FormError message={mutation.error} />

            <label className="sk-landing__field">
              <span>{t('landing.partners.field.org')} *</span>
              <input
                required
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                maxLength={160}
                autoComplete="organization"
              />
            </label>

            <label className="sk-landing__field">
              <span>{t('landing.partners.field.name')}</span>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                maxLength={120}
                autoComplete="name"
              />
            </label>

            <label className="sk-landing__field">
              <span>{t('landing.partners.field.email')} *</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
              />
            </label>

            <label className="sk-landing__field">
              <span>{t('landing.partners.field.category')} *</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {t(`landing.partners.cat.${option}` as MessageKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="sk-landing__field">
              <span>{t('landing.partners.field.message')}</span>
              <textarea
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={4000}
              />
            </label>

            {/* Never pre-ticked, and the request is refused without it. */}
            <label className="sk-landing__consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>{t('landing.partners.consent')}</span>
            </label>

            <button className="sk-landing__cta" type="submit" disabled={mutation.busy || !consent}>
              {mutation.busy ? t('landing.partners.sending') : t('landing.partners.send')}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        )}
      </section>

      <footer className="sk-landing__footer">
        <p className="sk-landing__footer-note">{t('landing.partners.footer.note')}</p>
        <nav className="sk-landing__footer-links" aria-label="Studentkare">
          <a href="/">{t('landing.consult.footer.forStudents')}</a>
          <a href="/campuses">{t('landing.consult.footer.forCampuses')}</a>
          <a href="/clinicians">{t('landing.consult.footer.forClinicians')}</a>
          <a href="/privacy">{t('landing.partners.footer.privacy')}</a>
          <a href="/terms">{t('landing.partners.footer.terms')}</a>
        </nav>
      </footer>
    </main>
  );
}

const SENT_STYLE: React.CSSProperties = {
  borderColor: 'var(--sk-color-positive)',
  background: 'var(--sk-color-positive-bg)',
};
