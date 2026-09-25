import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/core/navigation';
import { ArrowLeft, ArrowRight, FileText, FlaskConical, Heart, Lock, Sparkles } from 'lucide-react';
import {
  WELCOME_SLIDES,
  clampSlide,
  isLastSlide,
  stepLabel,
  type WelcomeSlide,
} from './welcomeSlides';
import './welcome-carousel.css';

/** Where every exit from the carousel leads. */
const EXIT_TO = '/login';

function CampusPanel(): React.ReactElement {
  return (
    <div className="sk-welcome__panel sk-welcome__panel--campus">
      <div className="sk-welcome__card">
        <span className="sk-welcome__card-icon sk-welcome__card-icon--crisis">
          <Heart size={18} aria-hidden="true" />
        </span>
        <span className="sk-welcome__card-title">Crisis support</span>
        <span className="sk-welcome__card-note">24×7 on campus</span>
      </div>
      <div className="sk-welcome__card sk-welcome__card--end">
        <span className="sk-welcome__card-icon sk-welcome__card-icon--lab">
          <FlaskConical size={18} aria-hidden="true" />
        </span>
        <span className="sk-welcome__card-title">NABL lab tests</span>
        <span className="sk-welcome__card-note">Dorm sample pickup</span>
      </div>
    </div>
  );
}

function VaultPanel(): React.ReactElement {
  return (
    <div className="sk-welcome__panel sk-welcome__panel--vault">
      <span className="sk-welcome__badge sk-welcome__badge--vault">
        <Lock size={14} aria-hidden="true" />
        ABDM linked
      </span>
      {['Complete Blood Count', 'Vitamin D3 panel', 'Consult prescriptions'].map((row) => (
        <span className="sk-welcome__row" key={row}>
          <FileText size={16} aria-hidden="true" />
          {row}
        </span>
      ))}
    </div>
  );
}

function AyushPanel(): React.ReactElement {
  return (
    <div className="sk-welcome__panel sk-welcome__panel--ayush">
      <span className="sk-welcome__badge sk-welcome__badge--ayush">
        <Sparkles size={14} aria-hidden="true" />
        Ayush AI
      </span>
      {/* An illustration of a conversation, not a transcript of a real one. */}
      <span className="sk-welcome__bubble sk-welcome__bubble--student">
        Sore throat and a fever since last night. What do I do?
      </span>
      <span className="sk-welcome__bubble sk-welcome__bubble--ayush">
        Sounds like it needs a look. Dr. Ananya is free in 15 mins at the campus clinic — shall I
        hold the slot?
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
    <section className="sk-welcome" aria-label="What Studentkare does">
      <div className={`sk-welcome__top${index === 0 ? ' sk-welcome__top--end' : ''}`}>
        {index > 0 && (
          <button type="button" className="sk-welcome__back" onClick={back} aria-label="Previous">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="sk-welcome__skip" onClick={leave}>
          Skip
        </button>
      </div>

      <Panel id={slide.id} />

      <div className="sk-welcome__words">
        <h1 className="sk-welcome__title" ref={headingRef} tabIndex={-1}>
          {slide.title}
        </h1>
        <p className="sk-welcome__body">{slide.body}</p>
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
          {slide.cta}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

      <p className="sk-welcome__sr" aria-live="polite">
        {stepLabel(index)}
      </p>
    </section>
  );
}
