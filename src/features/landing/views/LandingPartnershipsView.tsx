import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/data/http';
import { FormError, useMutation } from '@/components/interface/WorkflowUI';
import './landing.css';

const CATEGORIES = ['Laboratory', 'Pharmacy', 'Clinic', 'Campus', 'Insurer', 'Other'] as const;

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
        <span className="sk-landing__eyebrow">PARTNERSHIPS</span>
        <h1 className="sk-landing__title">Reach students without buying your way to the top.</h1>
        <p className="sk-landing__lede">
          There are no sponsored slots, because there is nothing to sell you. Provider search sorts
          by whether you serve the student's pincode, then alphabetically — never by what you pay.
          The way to be seen is to serve a campus well.
        </p>
      </section>

      <section className="sk-landing__section" aria-labelledby="sk-part-firewall">
        <h2 className="sk-landing__heading" id="sk-part-firewall">
          What you cannot buy here
        </h2>
        <p className="sk-landing__footer-note">
          Read this before you apply. If your model needs targeting or placement, we are the wrong
          platform, and we would rather say so now than after a contract.
        </p>
        <div className="sk-landing__boundary">
          <ul className="sk-landing__boundary-list">
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Not for sale</span>
              <p className="sk-landing__promise-body">
                Position in search results. The ordering is pincode match, then name, and the API
                states that on every response.
              </p>
            </li>
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Not for sale</span>
              <p className="sk-landing__promise-body">
                Anything in a student's health record — for targeting, segmentation or any other
                purpose. Clinical data does not reach commercial surfaces.
              </p>
            </li>
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Not for sale</span>
              <p className="sk-landing__promise-body">
                Advertising slots. There are none, and paying for anything never grants sight of a
                member's record.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <div className="sk-landing__gap" role="note">
        <span className="sk-landing__gap-icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-landing__gap-title">Commission is not published yet.</p>
          <p className="sk-landing__gap-body">
            Our designs say the rate is published on every line. No rate is configured in the system
            yet, so there is nothing honest to print here. It will appear on this page and on every
            statement line once it is set — and not before.
          </p>
        </div>
      </div>

      <section className="sk-landing__section" aria-labelledby="sk-part-apply">
        <h2 className="sk-landing__heading" id="sk-part-apply">
          Tell us what you can serve
        </h2>

        {sent ? (
          <div className="sk-landing__emergency" role="status" style={SENT_STYLE}>
            <span className="sk-landing__promise-icon">
              <CheckCircle2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="sk-landing__emergency-title">Your enquiry is with our team.</p>
              <p className="sk-landing__emergency-body">
                It has been recorded and raised to the people who read these. We have not set a
                response time, so we are not going to promise you one.
              </p>
            </div>
          </div>
        ) : (
          <form className="sk-landing__form" onSubmit={submit} noValidate>
            <FormError message={mutation.error} />

            <label className="sk-landing__field">
              <span>Organisation *</span>
              <input
                required
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                maxLength={160}
                autoComplete="organization"
              />
            </label>

            <label className="sk-landing__field">
              <span>Your name</span>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                maxLength={120}
                autoComplete="name"
              />
            </label>

            <label className="sk-landing__field">
              <span>Email *</span>
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
              <span>Category *</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="sk-landing__field">
              <span>What can you serve, and where?</span>
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
              <span>
                You may contact me about this enquiry. We do not sell or share what you send here,
                and this form is not a contract.
              </span>
            </label>

            <button className="sk-landing__cta" type="submit" disabled={mutation.busy || !consent}>
              {mutation.busy ? 'Sending…' : 'Send application'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        )}
      </section>

      <footer className="sk-landing__footer">
        <p className="sk-landing__footer-note">
          Studentkare is still being built, and this page lists what is missing on purpose. We do not
          show partner logos until a partner has signed and agreed in writing to appear.
        </p>
        <nav className="sk-landing__footer-links" aria-label="Studentkare">
          <a href="/">For students</a>
          <a href="/campuses">For campuses</a>
          <a href="/clinicians">For clinicians</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </footer>
    </main>
  );
}

const SENT_STYLE: React.CSSProperties = {
  borderColor: 'var(--sk-color-positive)',
  background: 'var(--sk-color-positive-bg)',
};
