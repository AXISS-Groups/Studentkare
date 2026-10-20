import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/core/navigation';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { CanvasImage } from '@/design-system/art';
import { useT, type MessageKey } from '@/i18n';
import {
  WELCOME_SLIDES,
  WELCOME_SLIDE_COUNT,
  clampSlide,
  isLastSlide,
  type WelcomeSlide,
} from './welcomeSlides';
import './welcome-carousel.css';

/** Where every exit from the carousel leads. */
const EXIT_TO = '/login';

function CampusPanel(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-welcome__panel sk-welcome__panel--campus">
      <CanvasImage
        name="a-small-clinic-building-care-close-to-yo-a054b1.png"
        alt={t('launch.welcome.campusArt')}
        className="sk-welcome__campus-art"
      />
      <div className="sk-welcome__card sk-welcome__card--start">
        <span className="sk-welcome__card-icon sk-welcome__card-icon--crisis">
          <Icon name="heart-3" size={18} />
        </span>
        <span className="sk-welcome__card-title">{t('onboard.welcome.crisisTitle')}</span>
        <span className="sk-welcome__card-note">{t('onboard.welcome.crisisNote')}</span>
      </div>
      <div className="sk-welcome__card sk-welcome__card--end">
        <span className="sk-welcome__card-icon sk-welcome__card-icon--lab">
          <Icon name="flask-3" size={18} />
        </span>
        <span className="sk-welcome__card-title">{t('onboard.welcome.labTitle')}</span>
        <span className="sk-welcome__card-note">{t('onboard.welcome.labNote')}</span>
      </div>
    </div>
  );
}

/** Kinds of record (canvas Onboarding2 rows), each with its board icon. */
const VAULT_ROWS: readonly { icon: SkIconName; label: MessageKey }[] = [
  { icon: 'file-2', label: 'onboard.welcome.vaultConsults' },
  { icon: 'flask-4', label: 'onboard.welcome.vaultLabs' },
  { icon: 'align-left-2', label: 'onboard.welcome.vaultPrescriptions' },
];

function VaultPanel(): React.ReactElement {
  const t = useT();
  // Kinds of record, not a made-up student's results: signed-out visitors see this.
  return (
    <div className="sk-welcome__panel sk-welcome__panel--vault">
      <span className="sk-welcome__vault-head">
        <span className="sk-welcome__vault-lock">
          <Icon name="lock-5" size={20} />
        </span>
        {/* Not "ABDM linked": there is no ABDM integration, and guardrail 6 forbids
            asserting a compliance state not computed from evidence. */}
        <span className="sk-welcome__vault-label">{t('onboard.welcome.vaultBadge')}</span>
      </span>
      {VAULT_ROWS.map((row) => (
        <span className="sk-welcome__row" key={row.label}>
          <Icon name={row.icon} size={18} />
          {t(row.label)}
        </span>
      ))}
    </div>
  );
}

function AyushPanel(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-welcome__panel sk-welcome__panel--ayush">
      <span className="sk-welcome__badge sk-welcome__badge--ayush">
        <Icon name="sparkle" size={14} />
        {/* The name the app uses for Ayush everywhere else. Ayush answers from
            approved sources and may run with no model at all, so not "AI". */}
        {t('nav.ayush')}
      </span>
      {/* An illustration of a conversation, not a transcript of a real one. */}
      <span className="sk-welcome__bubble sk-welcome__bubble--student">
        {t('onboard.welcome.ayushAsk')}
      </span>
      <span className="sk-welcome__bubble sk-welcome__bubble--ayush">
        {/* No named doctor, "free in 15 mins" or slot finding: signed-out visitors
            see this, Ayush answers only from approved knowledge, and nothing here
            knows who is on call. */}
        {t('onboard.welcome.ayushReply')}
      </span>
      <span className="sk-welcome__typing" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

function Panel({ id }: { id: WelcomeSlide['id'] }): React.ReactElement {
  if (id === 'vault') return <VaultPanel />;
  if (id === 'ayush') return <AyushPanel />;
  return <CampusPanel />;
}

/**
 * The three-slide intro (design page 1, Onboarding1–3, Tier 2).
 *
 * Every control leaves for sign-in or moves one slide; nothing here reads or
 * writes an account, so it is safe to show before a session exists.
 */
export function WelcomeCarouselView(): React.ReactElement {
  const navigate = useNavigate();
  const t = useT();
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasMoved = useRef(false);

  const slide = WELCOME_SLIDES[clampSlide(index)];
  const last = isLastSlide(index);

  useEffect(() => {
    // Move focus to the new heading so the slide change is announced — but not
    // on first paint, where stealing focus would be unprompted.
    if (!hasMoved.current) {
      hasMoved.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  const leave = (): void => {
    void navigate(EXIT_TO);
  };
  const forward = (): void => {
    if (last) leave();
    else setIndex((at) => clampSlide(at + 1));
  };
  const back = (): void => setIndex((at) => clampSlide(at - 1));

  return (
    <section className="sk-welcome" aria-label={t('onboard.welcome.label')}>
      <div className={`sk-welcome__top${index === 0 ? ' sk-welcome__top--end' : ''}`}>
        {index > 0 && (
          <button type="button" className="sk-welcome__back" onClick={back} aria-label={t('onboard.welcome.previous')}>
            <Icon name="arrow-left" size={18} />
          </button>
        )}
        <button type="button" className="sk-welcome__skip" onClick={leave}>
          {t('onboard.welcome.skip')}
        </button>
      </div>

      <Panel id={slide.id} />

      <div className="sk-welcome__words">
        <h1 className="sk-welcome__title" ref={headingRef} tabIndex={-1}>
          {t(`onboard.welcome.${slide.id}.title`)}
        </h1>
        <p className="sk-welcome__body">{t(`onboard.welcome.${slide.id}.body`)}</p>
      </div>

      <div className="sk-welcome__spacer" />

      <div className="sk-welcome__foot">
        {/* Decorative: the position is announced by the live region below. */}
        <div className="sk-welcome__dots" aria-hidden="true">
          {WELCOME_SLIDES.map((each, at) => (
            <span
              key={each.id}
              className={`sk-welcome__dot${at === clampSlide(index) ? ' sk-welcome__dot--on' : ''}`}
            />
          ))}
        </div>
        <button type="button" className="sk-welcome__next" onClick={forward}>
          {t(last ? 'onboard.welcome.continue' : 'onboard.welcome.next')}
          <Icon name="arrow-right" size={18} />
        </button>
      </div>

      <p className="sk-welcome__sr" aria-live="polite">
        {t('auth.signup.stepOf', { position: clampSlide(index) + 1, total: WELCOME_SLIDE_COUNT })}
      </p>
    </section>
  );
}
