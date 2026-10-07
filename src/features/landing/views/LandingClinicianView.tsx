import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import './landing.css';

/**
 * For clinicians (design page 3, `LandingClinician`, Tier 3).
 *
 * Two of the design's three headline claims are real and worth keeping:
 *
 * - "A queue sorted by severity, not by arrival." /work/critical-results exists
 *   and the clinical inbox is built around it.
 * - "The share is the authorisation. Not your role." True, and enforced: the
 *   report-review queue requires an owner-granted document share that has not
 *   expired, and every access is audited. Being a clinician opens nothing.
 *
 * Three are not, and are left off:
 *
 * - "NMC-verified", "Verified against the NMC register, not a form", "your
 *   registration number ... is printed on every prescription you issue here."
 *   No registration number is stored anywhere and nothing is checked against
 *   any register. `NMC_DOCTOR` is a role an administrator sets. Printing
 *   "NMC-verified" on a recruitment page would be a compliance assertion with
 *   nothing computing it — Guardrail 6 — and it is the claim a clinician would
 *   most reasonably rely on when deciding we are serious.
 * - "90% of every consult is yours" and "Published commission". The design does
 *   specify 10% consistently, here and on ClinicianEarnings, but nothing in the
 *   repo configures a rate, so /work/earnings reports gross only. A percentage
 *   of someone's fee is not a number to hardcode into marketing ahead of the
 *   system that pays it.
 * - "Apply to practise". There is no application endpoint, so the button would
 *   submit nowhere. It points at sign-in instead and says what is missing.
 */
export function LandingClinicianView(): React.ReactElement {
  return (
    <main className="sk-landing">
      <section className="sk-landing__hero">
        <span className="sk-landing__eyebrow">FOR CLINICIANS</span>
        <h1 className="sk-landing__title">A queue sorted by severity, not by arrival.</h1>
        <p className="sk-landing__lede">
          A potassium of 6.8 does not sit behind forty routine results. You see what needs you first,
          with the reference range beside the value and the consent that makes it readable stated on
          the row.
        </p>
        <div className="sk-landing__actions">
          <a className="sk-landing__cta" href="/login">
            Sign in
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="sk-landing__section" aria-labelledby="sk-clin-access">
        <h2 className="sk-landing__heading" id="sk-clin-access">
          The share is the authorisation. Not your role.
        </h2>
        <p className="sk-landing__footer-note">
          Being a clinician here does not open anyone's record. A student shares specific documents
          for a number of days they choose; you see exactly those, and every open is written to an
          audit trail.
        </p>
        <div className="sk-landing__boundary">
          <ul className="sk-landing__boundary-list">
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Enforced</span>
              <p className="sk-landing__promise-body">
                A report reaches your review queue only with a current, owner-granted share. An
                expired or revoked share removes it.
              </p>
            </li>
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Enforced</span>
              <p className="sk-landing__promise-body">
                Your chronic tracker shows only students who agreed to a care programme with you, by
                room and initials rather than by name.
              </p>
            </li>
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Enforced</span>
              <p className="sk-landing__promise-body">
                A student can end a share or leave a programme without asking you, and without it
                being reported to their campus.
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
          <p className="sk-landing__gap-title">Two things we are not claiming yet.</p>
          <p className="sk-landing__gap-body">
            <strong>Registration checking.</strong> We do not yet verify a registration number
            against the NMC register — the clinician role is granted by an administrator. Until that
            check is built we will not describe anyone here as verified, including on a prescription.
          </p>
          <p className="sk-landing__gap-body">
            <strong>What you are paid.</strong> Earnings currently report gross consult fees only.
            No commission rate is configured, so no share is published on this page. When one is set
            it will appear on every line of your statement.
          </p>
        </div>
      </div>

      <section className="sk-landing__section" aria-labelledby="sk-clin-apply">
        <h2 className="sk-landing__heading" id="sk-clin-apply">
          Joining
        </h2>
        <p className="sk-landing__footer-note">
          There is no application form here yet. If you already have an account, sign in; otherwise
          the campus that invited you can arrange access while the application flow and the
          registration check are built.
        </p>
      </section>

      <footer className="sk-landing__footer">
        <p className="sk-landing__footer-note">
          Studentkare is still being built, and this page lists what is missing on purpose.
        </p>
        <nav className="sk-landing__footer-links" aria-label="Studentkare">
          <a href="/">For students</a>
          <a href="/campuses">For campuses</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Sign in</a>
        </nav>
      </footer>
    </main>
  );
}
