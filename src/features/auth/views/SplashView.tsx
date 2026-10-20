import React from 'react';
import { BrandLogo, Icon, Illustration } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { CanvasImage } from '@/design-system/art';
import { useT, type MessageKey } from '@/i18n';
import { timeOfDay, type TimeOfDay } from './timeOfDay';
import './splash.css';

/** The greeting pill's icon: the canvas sun and moon symbols, drawn as `sun` and `moon`. */
const GREETING_ICON: Record<TimeOfDay, SkIconName> = {
  morning: 'sun',
  afternoon: 'sun',
  evening: 'moon',
};

/** Headline (two lines) and the line under it, per part of the day (canvas Main A/B/C). */
const WORDS: Record<TimeOfDay, { title1: MessageKey; title2: MessageKey; body: MessageKey }> = {
  morning: { title1: 'onboard.splash.title1', title2: 'onboard.splash.title2', body: 'onboard.splash.body' },
  afternoon: { title1: 'launch.splash.pulse.title1', title2: 'launch.splash.pulse.title2', body: 'launch.splash.pulse.body' },
  evening: { title1: 'launch.splash.vault.title1', title2: 'launch.splash.vault.title2', body: 'launch.splash.vault.body' },
};

/** The afternoon chips (the canvas stethoscope, test tube and card-index symbols): what Student Kare covers, not a claim about anyone. */
const PULSE_CHIPS: readonly { icon: SkIconName; label: MessageKey }[] = [
  { icon: 'stethoscope', label: 'launch.splash.chip.doctors' },
  { icon: 'flask', label: 'launch.splash.chip.labs' },
  { icon: 'file', label: 'launch.splash.chip.records' },
];

export interface SplashViewProps {
  /** Begin the intro. */
  onStart: () => void;
  /** Skip the intro — this student already has an account. */
  onSignIn: () => void;
  /** Fixed clock, for tests. */
  now?: Date;
  /**
   * Draw one variant whatever the time (the SplashPulse and SplashVault boards).
   * Without it the clock picks, as on the Main board's "Auto".
   */
  variant?: TimeOfDay;
  /** The greeting pill under the brand (Main shows it; the single-variant boards do not). */
  greeting?: boolean;
}

/** Morning (Main A): the doctor waving hello, a heart and a pill floating beside. */
function MorningArt(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-splash__stage sk-splash__stage--morning">
      <span className="sk-splash__disc" aria-hidden="true" />
      <CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" alt={t('launch.splash.art.morning')} className="sk-splash__hero sk-splash__float" />
      <CanvasImage name="a-glossy-3d-heart-beating-gently-350fa7.png" className="sk-splash__satellite sk-splash__satellite--top" />
      <CanvasImage name="image-ccaceb.png" className="sk-splash__satellite sk-splash__satellite--bottom" />
      {/* The board's "Doctor online now" pill is left out: nothing can answer that for a
          signed-out visitor, and a student in trouble would act on it. */}
    </div>
  );
}

/** Afternoon (Main B, SplashPulse): a beating heart, the heartbeat line and three chips. */
function PulseArt(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-splash__stage sk-splash__stage--pulse">
      <div className="sk-splash__rings">
        <span className="sk-splash__ring" aria-hidden="true" />
        <span className="sk-splash__ring-fill" aria-hidden="true" />
        <CanvasImage name="a-glossy-3d-heart-beating-gently-350fa7.png" alt={t('launch.splash.art.afternoon')} className="sk-splash__heart" />
      </div>
      <span className="sk-splash__beat">
        <Illustration name="illustration-heartbeat-line" width={342} height={70} />
      </span>
      <ul className="sk-splash__chips" aria-label={t('launch.splash.chip.label')}>
        {PULSE_CHIPS.map((chip) => (
          <li key={chip.label} className="sk-splash__chip">
            <Icon name={chip.icon} size={14} />
            {t(chip.label)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Evening (Main C, SplashVault): the campus clinic with the care circle orbiting it. */
function VaultArt(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-splash__stage sk-splash__stage--vault">
      <span className="sk-splash__orbit" aria-hidden="true" />
      <span className="sk-splash__disc sk-splash__disc--vault" aria-hidden="true" />
      <span className="sk-splash__orbiter sk-splash__orbiter--1" aria-hidden="true"><CanvasImage name="image-ccaceb.png" /></span>
      <span className="sk-splash__orbiter sk-splash__orbiter--2" aria-hidden="true"><CanvasImage name="a-clinician-giving-a-vaccine-fe143c.png" /></span>
      <span className="sk-splash__orbiter sk-splash__orbiter--3" aria-hidden="true"><CanvasImage name="a-doctor-on-a-video-consult-460112.png" /></span>
      <span className="sk-splash__orbiter sk-splash__orbiter--4" aria-hidden="true"><CanvasImage name="a-glossy-3d-heart-beating-gently-350fa7.png" /></span>
      <CanvasImage name="a-small-clinic-building-care-close-to-yo-a054b1.png" alt={t('launch.splash.art.evening')} className="sk-splash__clinic sk-splash__float" />
    </div>
  );
}

/**
 * The first screen (design page 1): Main, which changes with the time of day —
 * morning is the doctor hello, afternoon the heartbeat (SplashPulse), evening
 * the care circle (SplashVault). The canvas preview switcher (Auto / Play all /
 * Morning / Afternoon / Evening) is a design-review control, so the app shows
 * "Auto": the clock picks.
 *
 * Left out, because nothing can make them true for a signed-out visitor:
 * - "Doctor online now" (morning): no endpoint answers who is on call.
 * - "ABHA-linked" (evening pill): there is no ABHA integration, and guardrail 6
 *   forbids asserting an integration state that is not computed from evidence.
 *   The pill keeps the half that is true of every account: private by default.
 */
export function SplashView({ onStart, onSignIn, now, variant, greeting = true }: SplashViewProps): React.ReactElement {
  const part = variant ?? timeOfDay(now);
  const words = WORDS[part];
  const t = useT();

  return (
    <section className={`sk-splash sk-splash--${part}`} aria-label={t('onboard.splash.label')} data-part={part}>
      <span className="sk-splash__blob sk-splash__blob--1" aria-hidden="true" />
      <span className="sk-splash__blob sk-splash__blob--2" aria-hidden="true" />
      <span className="sk-splash__blob sk-splash__blob--3" aria-hidden="true" />

      <div className="sk-splash__brand sk-splash__in">
        <BrandLogo size={34} label="" />
        <span className="sk-splash__wordmark">
          {t('launch.brand.student')}
          <em>{t('launch.brand.kare')}</em>
        </span>
      </div>

      {greeting ? (
        <p className="sk-splash__greeting sk-splash__in">
          <Icon name={GREETING_ICON[part]} size={14} />
          {t(`onboard.greeting.${part}`)}
        </p>
      ) : null}

      {part === 'morning' ? <MorningArt /> : part === 'afternoon' ? <PulseArt /> : <VaultArt />}

      <div className="sk-splash__words sk-splash__in">
        <h1 className="sk-splash__title">
          {t(words.title1)}
          <br />
          {t(words.title2)}
        </h1>
        <p className="sk-splash__body">{t(words.body)}</p>
        {part === 'evening' ? (
          <span className="sk-splash__private">
            <Icon name="lock" size={13} />
            {t('launch.splash.private')}
          </span>
        ) : null}
      </div>

      <div className="sk-splash__actions sk-splash__in">
        <button type="button" className="sk-splash__primary" onClick={onStart}>
          {t('onboard.splash.start')}
          <Icon name="arrow-right" size={18} strokeWidth={2.4} />
        </button>
        <button type="button" className="sk-splash__secondary" onClick={onSignIn}>
          {t('onboard.splash.haveAccount')}
        </button>
        {/* Guardrail: help is one tap away, before any account exists. */}
        <a className="sk-splash__emergency" href="tel:112">
          {t('onboard.splash.emergency')}
        </a>
      </div>
    </section>
  );
}
