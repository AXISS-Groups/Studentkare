import React, { useId, useState } from 'react';
import { useNavigate } from '@/core/navigation';
import { BrandLogo, Icon, Icon3d } from '@/design-system/icons';
import { CanvasImage, type CanvasImageName } from '@/design-system/art';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { useT, type MessageKey } from '@/i18n';
import './logged-out.css';

/** One "When you're back" card: canvas art, words and a public place to go. */
interface BackCard {
  art: CanvasImageName;
  title: MessageKey;
  body: MessageKey;
  cta: MessageKey;
  to: string;
}

const RECORDS: BackCard = { art: 'image-df2f6a.png', title: 'launch.out.records.title', body: 'launch.out.records.body', cta: 'launch.out.records.cta', to: '/landing' };
const LABS: BackCard = { art: 'image-420a70.png', title: 'launch.out.labs.title', body: 'launch.out.labs.body', cta: 'launch.out.labs.cta', to: '/lab-tests' };
const DOCTOR: BackCard = { art: 'a-doctor-on-a-screen-82be0f.png', title: 'launch.out.doctor.title', body: 'launch.out.doctor.body', cta: 'launch.out.doctor.cta', to: '/consult' };
const CRISIS: BackCard = { art: 'a-friendly-doctor-waving-hello-b859fc.png', title: 'launch.out.crisis.title', body: 'launch.out.crisis.body', cta: 'launch.out.crisis.cta', to: '/crisis' };
const CARD: BackCard = { art: 'image-894ac3.jpg', title: 'launch.out.card.title', body: 'launch.out.card.body', cta: 'launch.out.card.cta', to: '/emergency-card' };
const VACCINES: BackCard = { art: 'a-clinician-giving-a-vaccine-fe143c.png', title: 'launch.out.vaccines.title', body: 'launch.out.vaccines.body', cta: 'launch.out.vaccines.cta', to: '/preventive-care' };
const CHECKUPS: BackCard = { art: 'image-5aff5e.png', title: 'launch.out.checkups.title', body: 'launch.out.checkups.body', cta: 'launch.out.checkups.cta', to: '/lab-tests' };
const TRAINING: BackCard = { art: 'image-44bf33.jpg', title: 'launch.out.training.title', body: 'launch.out.training.body', cta: 'launch.out.training.cta', to: '/wellness' };
const PLANS: BackCard = { art: 'image-df2f6a.png', title: 'launch.out.plans.title', body: 'launch.out.plans.body', cta: 'launch.out.plans.cta', to: '/plans' };

/** The phone board's four slides, one card at a time. */
const PHONE_SLIDES: readonly BackCard[] = [RECORDS, LABS, DOCTOR, CRISIS];
/** The web board's three pages: a wide card and two beside it. */
const WEB_PAGES: readonly (readonly [BackCard, BackCard, BackCard])[] = [
  [RECORDS, LABS, DOCTOR],
  [CARD, VACCINES, CHECKUPS],
  [TRAINING, CRISIS, PLANS],
];

const SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** The board's colour bands on the 0–10 scale (detractor, passive, promoter). */
const band = (n: number): 'low' | 'mid' | 'high' => (n <= 6 ? 'low' : n <= 8 ? 'mid' : 'high');

function Wordmark({ strap }: { strap?: boolean }): React.ReactElement {
  const t = useT();
  return (
    <span className="sk-loggedout__brand">
      <BrandLogo size={strap ? 30 : 26} label="" />
      <span className="sk-loggedout__brand-words">
        {strap ? <span className="sk-loggedout__strap">{t('launch.brand.strap')}</span> : null}
        <span className="sk-loggedout__wordmark">
          {t('launch.brand.student')}
          <em>{t('launch.brand.kare')}</em>
        </span>
      </span>
    </span>
  );
}

/** "Successfully logged out" and what it did — only what signing out really does. */
function Status({ web }: { web: boolean }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-loggedout__note" role="status">
      <span className="sk-loggedout__note-icon">
        <Icon name="check-circle" size={24} />
      </span>
      <div className="sk-loggedout__note-words">
        <h1 className="sk-loggedout__title" id="sk-loggedout-title">
          {t('launch.out.title')}
        </h1>
        <p className="sk-loggedout__body">{t(web ? 'launch.out.body.web' : 'launch.out.body.phone')}</p>
        <ul className="sk-loggedout__done">
          <li><Icon name="check" size={14} strokeWidth={2.6} />{t(web ? 'launch.out.done.session.web' : 'launch.out.done.session.phone')}</li>
          <li><Icon name="check" size={14} strokeWidth={2.6} />{t('launch.out.done.records')}</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * The board's "We value your feedback" card. There is no feedback endpoint, so
 * a score would go nowhere: the card is shown with its scale switched off and
 * says so, rather than collecting an answer and throwing it away.
 */
function Feedback(): React.ReactElement {
  const t = useT();
  const titleId = useId();
  return (
    <section className="sk-loggedout__feedback" aria-labelledby={titleId}>
      <span className="sk-loggedout__tiles" aria-hidden="true">
        <Icon3d name="chat-alt--p4" size={44} />
        <Icon3d name="heart--p1" size={56} />
        <Icon3d name="chart-alt--p4" size={44} />
      </span>
      <h2 className="sk-loggedout__feedback-title" id={titleId}>{t('launch.out.feedback.title')}</h2>
      <p className="sk-loggedout__feedback-q">{t('launch.out.feedback.question')}</p>
      <fieldset className="sk-loggedout__scale" disabled aria-describedby={`${titleId}-off`}>
        <legend className="sk-loggedout__sr">{t('launch.out.feedback.question')}</legend>
        <div className="sk-loggedout__scale-row">
          {SCALE.map((n) => (
            <button key={n} type="button" className={`sk-loggedout__score sk-loggedout__score--${band(n)}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="sk-loggedout__scale-ends" aria-hidden="true">
          <span>{t('launch.out.feedback.low')}</span>
          <span>{t('launch.out.feedback.high')}</span>
        </div>
      </fieldset>
      <p className="sk-loggedout__off" id={`${titleId}-off`}>{t('launch.out.feedback.unavailable')}</p>
    </section>
  );
}

function BackCardView({ card, wide = false, onGo }: { card: BackCard; wide?: boolean; onGo: (to: string) => void }): React.ReactElement {
  const t = useT();
  return (
    <article className={`sk-loggedout__card${wide ? ' sk-loggedout__card--wide' : ''}`}>
      <div className="sk-loggedout__card-art">
        <CanvasImage name={card.art} />
      </div>
      <div className="sk-loggedout__card-words">
        <h3 className="sk-loggedout__card-title">{t(card.title)}</h3>
        <p className="sk-loggedout__card-body">{t(card.body)}</p>
        <button type="button" className="sk-loggedout__card-cta" onClick={() => onGo(card.to)}>
          {t(card.cta)}
        </button>
      </div>
    </article>
  );
}

function Dots({ count, at, onPick }: { count: number; at: number; onPick: (n: number) => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-loggedout__dots">
      {Array.from({ length: count }, (_, n) => (
        <button
          key={n}
          type="button"
          className={`sk-loggedout__dot${n === at ? ' is-on' : ''}`}
          aria-label={t('launch.out.slide', { n: n + 1, total: count })}
          aria-current={n === at ? 'true' : undefined}
          onClick={() => onPick(n)}
        >
          <span />
        </button>
      ))}
    </div>
  );
}

/**
 * After signing out: LoggedOut (phone board) and WebLoggedOut (web board).
 *
 * What is true is said; what the app cannot do is shown unavailable or left out:
 * - Signing out ends this session and nothing else, so nothing is said about an
 *   offline emergency card being removed from the device (none is cached).
 * - The 0–10 survey has no endpoint, so its scale is drawn switched off.
 * - "ABHA-linked", "a doctor in 20 minutes", "from ₹199", "report in about 24
 *   hours", "works offline", "book in two taps" and "up to 5 people" are not
 *   claims the app can back, so the cards say what each service is instead.
 * - The carousel does not move on its own (WCAG 2.2.2); dots and arrows move it.
 * Emergency help stays one tap away with no session, on both layouts.
 */
export function LoggedOutView(): React.ReactElement {
  const navigate = useNavigate();
  const phone = usePhoneFrame();
  const t = useT();
  const [slide, setSlide] = useState(0);
  const go = (to: string): void => {
    void navigate(to);
  };
  const logIn = (
    <button type="button" className="sk-loggedout__primary" onClick={() => go('/login')}>
      {t('onboard.out.logIn')}
    </button>
  );
  const emergency = (
    <a className="sk-loggedout__emergency" href="tel:112">
      {t('onboard.out.emergency')}
    </a>
  );

  if (phone) {
    const count = PHONE_SLIDES.length;
    return (
      <div className="sk-loggedout sk-loggedout--phone" aria-labelledby="sk-loggedout-title" role="region">
        <div className="sk-loggedout__top">
          <button type="button" className="sk-loggedout__home" onClick={() => go('/welcome')} aria-label={t('launch.out.home')}>
            <Wordmark />
          </button>
          <Status web={false} />
          {logIn}
          {emergency}
          <Feedback />
        </div>
        <section className="sk-loggedout__back" aria-labelledby="sk-loggedout-back">
          <h2 className="sk-loggedout__eyebrow" id="sk-loggedout-back">{t('launch.out.whenBack')}</h2>
          <div className="sk-loggedout__slide" aria-live="polite">
            <BackCardView card={PHONE_SLIDES[slide % count]} onGo={go} />
          </div>
          <Dots count={count} at={slide % count} onPick={setSlide} />
          <p className="sk-loggedout__promise">{t('onboard.out.promise')}</p>
        </section>
      </div>
    );
  }

  const pages = WEB_PAGES.length;
  const page = WEB_PAGES[slide % pages];
  return (
    <div className="sk-loggedout sk-loggedout--web">
      <section className="sk-loggedout__panel" aria-labelledby="sk-loggedout-carousel" aria-roledescription={t('launch.out.carousel')}>
        <h2 className="sk-loggedout__sr" id="sk-loggedout-carousel">{t('launch.out.whenBack')}</h2>
        <div className="sk-loggedout__page" aria-live="polite">
          <BackCardView card={page[0]} wide onGo={go} />
          <div className="sk-loggedout__pair">
            <BackCardView card={page[1]} onGo={go} />
            <BackCardView card={page[2]} onGo={go} />
          </div>
        </div>
        <div className="sk-loggedout__controls">
          <button type="button" className="sk-loggedout__arrow sk-loggedout__arrow--prev" aria-label={t('launch.out.previous')} onClick={() => setSlide((at) => (at + pages - 1) % pages)}>
            <Icon name="chevron-left" size={18} />
          </button>
          <Dots count={pages} at={slide % pages} onPick={setSlide} />
          <button type="button" className="sk-loggedout__arrow" aria-label={t('launch.out.next')} onClick={() => setSlide((at) => (at + 1) % pages)}>
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
        <p className="sk-loggedout__promise">{t('launch.out.promiseWeb')}</p>
      </section>

      <div className="sk-loggedout__side">
        <div className="sk-loggedout__side-inner">
          <button type="button" className="sk-loggedout__home" onClick={() => go('/')} aria-label={t('launch.out.home')}>
            <Wordmark strap />
          </button>
          <Status web />
          {logIn}
          <p className="sk-loggedout__shared">
            <Icon name="monitor" size={16} />
            {t('launch.out.shared')}
          </p>
          {emergency}
          <span className="sk-loggedout__rule" aria-hidden="true" />
          <Feedback />
          <span className="sk-loggedout__rule" aria-hidden="true" />
          <p className="sk-loggedout__legal">
            {t('launch.out.copyright', { year: new Date().getFullYear() })}
            {' · '}
            <a href="/terms" onClick={(event) => { event.preventDefault(); go('/terms'); }}>{t('launch.out.terms')}</a>
            {' · '}
            <a href="/privacy" onClick={(event) => { event.preventDefault(); go('/privacy'); }}>{t('launch.out.privacy')}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
