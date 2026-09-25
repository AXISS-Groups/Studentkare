import React from 'react';
import { useNavigate } from '@/core/navigation';
import { CheckCircle2, PhoneCall } from 'lucide-react';
import './logged-out.css';

/**
 * Shown after a student signs out (design page 1, LoggedOut, Tier 3).
 *
 * Three things from the design are deliberately absent, because the app cannot
 * honestly show them yet:
 *
 * - "Your offline emergency card was removed from this phone." Signing out
 *   clears the session and nothing else; no emergency card is cached on the
 *   device. Saying otherwise would be a security assurance we do not keep.
 * - The 0–10 recommendation survey. There is no feedback endpoint, so the
 *   scores would go nowhere.
 * - The "records go where you go, ABHA-linked" panel. There is no ABHA
 *   integration in the backend at all.
 *
 * What stays is the part that matters most: emergency help reachable with no
 * session, because a student in trouble is not going to sign in first.
 */
export function LoggedOutView(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <section className="sk-loggedout" aria-labelledby="sk-loggedout-title">
      <div className="sk-loggedout__note" role="status">
        <span className="sk-loggedout__note-icon">
          <CheckCircle2 size={20} aria-hidden="true" />
        </span>
        <div>
          <h1 className="sk-loggedout__title" id="sk-loggedout-title">
            You&rsquo;re signed out
          </h1>
          <p className="sk-loggedout__body">
            This device no longer has access to your records. Sign in again whenever you need them.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="sk-loggedout__primary"
        onClick={() => {
          void navigate('/login');
        }}
      >
        Log in again
      </button>

      {/* Guardrail: help is one tap away, session or no session. */}
      <a className="sk-loggedout__emergency" href="tel:112">
        <PhoneCall size={16} aria-hidden="true" />
        Emergency? Call 112 — no login needed
      </a>

      <p className="sk-loggedout__promise">No ads, no sponsored offers.</p>
    </section>
  );
}
