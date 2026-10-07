import React from 'react';
import { ArrowRight, Moon, PhoneCall, Sun, Sunrise, type LucideIcon } from 'lucide-react';
import { StudentKareLogo } from '@/components/StudentKareLogo';
import { greeting, timeOfDay, type TimeOfDay } from './timeOfDay';
import './splash.css';

const GREETING_ICON: Record<TimeOfDay, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

export interface SplashViewProps {
  /** Begin the intro. */
  onStart: () => void;
  /** Skip the intro — this student already has an account. */
  onSignIn: () => void;
  /** Fixed clock, for tests. */
  now?: Date;
}

/**
 * The first screen (design page 1, Main — "Splash option A").
 *
 * The pack carries three alternatives for this one screen: A (this one, which
 * greets by the time of day), B/SplashPulse (a heartbeat) and C/SplashVault (a
 * care circle). They are options to choose between, not three screens in a
 * flow, so only A is built. Picking a different one is a design decision.
 *
 * Two elements of the design are not here:
 *
 * - "Doctor online now". Nothing can answer that for a signed-out visitor:
 *   /appointments/availability needs a session and a catalogItemId, and
 *   returns slots for one item rather than whether anyone is on call. A green
 *   dot claiming a doctor is available is the kind of promise a student in
 *   trouble would act on.
 * - "ABHA-linked · private by default" (from option C). There is no ABHA
 *   route, model or column in the backend, and guardrail 6 forbids asserting
 *   a compliance state that is not computed from evidence.
 */
export function SplashView({ onStart, onSignIn, now }: SplashViewProps): React.ReactElement {
  const part = timeOfDay(now);
  const GreetingIcon = GREETING_ICON[part];

  return (
    <section className={`sk-splash sk-splash--${part}`} aria-label="Welcome to Studentkare">
      <div className="sk-splash__brand">
        <StudentKareLogo size={34} showStrapline={false} />
      </div>

      <p className="sk-splash__greeting">
        <GreetingIcon size={16} />
        {greeting(part)}
      </p>

      <div className="sk-splash__stage" aria-hidden="true">
        <span className="sk-splash__halo" />
      </div>

      <div className="sk-splash__words">
        <h1 className="sk-splash__title">
          A little care.
          <br />
          A healthier every day.
        </h1>
        <p className="sk-splash__body">
          Doctors, lab tests and your health records — made for campus life.
        </p>
      </div>

      <div className="sk-splash__actions">
        <button type="button" className="sk-splash__primary" onClick={onStart}>
          Get started
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button type="button" className="sk-splash__secondary" onClick={onSignIn}>
          I already have an account
        </button>
      </div>

      {/* Guardrail: help is one tap away, before any account exists. */}
      <a className="sk-splash__emergency" href="tel:112">
        <PhoneCall size={14} aria-hidden="true" />
        In an emergency? Call 112 · crisis help 24×7
      </a>
    </section>
  );
}
