import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import './landing.css';

/**
 * For campuses (design page 3, `LandingCampus`, Tier 3).
 *
 * The design's central pitch is a privacy boundary stated in writing: "A cohort
 * under 20 students is suppressed before the result leaves the database. Mental
 * health and sexual health categories are suppressed at every cohort size,
 * however large" — and, emphatically, "the suppression is in the query, not the
 * screen."
 *
 * None of that exists. There is no cohort or analytics endpoint for campuses at
 * all, so there is no query to put suppression in; the only `suppress` in the
 * backend is Slack notification rate limiting. Printing a numeric k-threshold
 * here would be a privacy guarantee given to an institution with nothing behind
 * it, which is the same defect as the cohort export screen deleted in 738ea46
 * for claiming k>=5 differential privacy.
 *
 * So this page says what is actually true — the student holds the record and a
 * campus cannot reach it, because nothing exposes it — and states plainly that
 * the reporting the pitch depends on is still to be built. That is a weaker
 * pitch and an honest one, and it puts the missing work in front of the person
 * who would be sold it.
 */
export function LandingCampusView(): React.ReactElement {
  return (
    <main className="sk-landing">
      <section className="sk-landing__hero">
        <span className="sk-landing__eyebrow">FOR CAMPUSES</span>
        <h1 className="sk-landing__title">
          Know your cohort is cared for without knowing who is ill.
        </h1>
        <p className="sk-landing__lede">
          Students hold their own records. Your administrators confirm who is enrolled and nothing
          more — not because a screen hides the rest, but because nothing exposes it.
        </p>
        <div className="sk-landing__actions">
          <a className="sk-landing__cta" href="/signup">
            Create an account
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a className="sk-landing__cta sk-landing__cta--quiet" href="/campuses#boundary">
            Read the boundary
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="sk-landing__section" aria-labelledby="sk-campus-liability">
        <h2 className="sk-landing__heading" id="sk-campus-liability">
          The liability sits with whoever holds the data
        </h2>
        <p className="sk-landing__footer-note">
          Under the DPDP Act a campus that stores student medical records is a data fiduciary, with
          everything that follows from that. Here the student is the record holder. Your institution
          does not receive their results, and cannot ask us for them.
        </p>
      </section>

      <section className="sk-landing__section" id="boundary" aria-labelledby="sk-campus-boundary">
        <h2 className="sk-landing__heading" id="sk-campus-boundary">
          What a campus administrator can and cannot see today
        </h2>
        <div className="sk-landing__boundary">
          <ul className="sk-landing__boundary-list">
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Can see</span>
              <p className="sk-landing__promise-body">
                Whether a student's campus enrolment has been confirmed, and the health camps your
                campus has published.
              </p>
            </li>
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Cannot see</span>
              <p className="sk-landing__promise-body">
                Any lab result, prescription, consultation, diagnosis or document. No endpoint
                returns them to a campus role.
              </p>
            </li>
            <li className="sk-landing__boundary-item">
              <span className="sk-landing__boundary-tag">Cannot see</span>
              <p className="sk-landing__promise-body">
                Whether a student left a care programme. Leaving is never reported to a campus, by
                design, so that a student can leave one they need to leave.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/*
        The design sells cohort reporting. Saying so here is the point: the
        person reading this page is the person who would be promised it.
      */}
      <div className="sk-landing__gap" role="note">
        <span className="sk-landing__gap-icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-landing__gap-title">Cohort reporting does not exist yet.</p>
          <p className="sk-landing__gap-body">
            Our designs describe attendance, coverage and camp-outcome reports with small cohorts
            suppressed inside the query. None of it is built. When it is, the suppression threshold
            will be published here and testable — we are not going to quote you a number that no
            code enforces. Until then a campus gets enrolment confirmation and camp administration,
            and that is all.
          </p>
        </div>
      </div>

      <footer className="sk-landing__footer">
        <p className="sk-landing__footer-note">
          Studentkare is still being built, and this page lists what is missing on purpose.
        </p>
        <nav className="sk-landing__footer-links" aria-label="Studentkare">
          <a href="/">For students</a>
          <a href="/clinicians">For clinicians</a>
          <a href="/lab-tests">Lab tests</a>
          <a href="/partnerships">Partnerships</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Sign in</a>
        </nav>
      </footer>
    </main>
  );
}
