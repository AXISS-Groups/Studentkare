import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Icon3d, Illustration } from '@/design-system/icons';
import type { SkIcon3dName, SkIllustrationName } from '@/design-system/icons';
import { useAutoAdvance, useOnScreen } from '@/design-system/m2';
import { useReducedMotion } from '@/design-system/motion';
import { useT, type MessageKey } from '@/i18n';

/**
 * The sign-in and create-account hero slides (founder, 2026-10-22; plan
 * tier1-canvas-wp03, amendment b). Four true things the product does, each drawn
 * only with kit art (Illustration, Icon3d): no new artwork, no numbers, no
 * claims the product can't back. Canvas words in the illustrations are dropped
 * (withoutText).
 */
interface Slide {
  id: 'records' | 'care' | 'meds' | 'crisis';
  /** The large piece: a canvas illustration, or a 3D tile on a glass disc. */
  art: { kind: 'illustration'; name: SkIllustrationName } | { kind: 'tile'; name: SkIcon3dName };
  /** Two small 3D tiles that float beside it. */
  tiles: readonly [SkIcon3dName, SkIcon3dName];
  /** The tile on the phone strip. */
  chip: SkIcon3dName;
}

export const AUTH_SLIDES: readonly Slide[] = [
  { id: 'records', art: { kind: 'illustration', name: 'illustration-phones-dashboard' }, tiles: ['vault-alt--p4', 'shield--p5'], chip: 'vault-alt--p4' },
  { id: 'care', art: { kind: 'tile', name: 'stetho-alt--p4' }, tiles: ['doctor-alt--p4', 'video-alt--p4'], chip: 'stetho-alt--p4' },
  { id: 'meds', art: { kind: 'illustration', name: 'illustration-test-tubes' }, tiles: ['pill-alt--p3', 'lab-alt--p5'], chip: 'pill-alt--p3' },
  { id: 'crisis', art: { kind: 'tile', name: 'phone--p5' }, tiles: ['heart--p1', 'sos-alt--p1'], chip: 'phone--p5' },
];

const key = (slide: Slide, part: 'eyebrow' | 'title' | 'body'): MessageKey => `authpc.slide.${slide.id}.${part}`;

function SlideArt({ slide }: { slide: Slide }): React.ReactElement {
  return (
    <div className={`sk-slide-art sk-slide-art--${slide.id}`} aria-hidden="true">
      <span className="sk-slide-art__halo" />
      {slide.art.kind === 'illustration' ? (
        <span className="sk-slide-art__main"><Illustration name={slide.art.name} width={260} height={220} withoutText /></span>
      ) : (
        <span className="sk-slide-art__disc"><Icon3d name={slide.art.name} size={128} /></span>
      )}
      <span className="sk-slide-art__tile sk-slide-art__tile--a"><Icon3d name={slide.tiles[0]} size={64} /></span>
      <span className="sk-slide-art__tile sk-slide-art__tile--b"><Icon3d name={slide.tiles[1]} size={56} /></span>
    </div>
  );
}

/** Hover and focus inside hold the slides; leaving lets them go on. */
function holdHandlers(hold: (held: boolean) => void) {
  return {
    onMouseEnter: () => hold(true),
    onMouseLeave: () => hold(false),
    onFocus: () => hold(true),
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hold(false);
    },
  };
}

function Dots({ index, onPick, labelFor }: { index: number; onPick: (i: number) => void; labelFor: (i: number) => string }) {
  return (
    <div className="sk-slides__dots">
      {AUTH_SLIDES.map((slide, i) => (
        <button
          key={slide.id}
          type="button"
          className="sk-slides__dot"
          aria-label={labelFor(i)}
          aria-current={i === index ? 'true' : undefined}
          onClick={() => onPick(i)}
        >
          <span />
        </button>
      ))}
    </div>
  );
}

/**
 * Web hero: one slide at a time, cross-fading and sliding. Advances every
 * `motion.carousel` (useAutoAdvance) while on screen and in front; hover or
 * focus holds it; a dot or the pause button stops it for good (WCAG 2.2.2), and
 * the same button (pause / play icon, labelled) starts it again. Under reduced
 * motion it never advances, nothing moves and there is no button.
 */
export function AuthHeroSlides(): React.ReactElement {
  const t = useT();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const onScreen = useOnScreen(node);
  const { index, pick, hold, running, canRun, paused, resume } = useAutoAdvance(AUTH_SLIDES.length, onScreen);
  const total = AUTH_SLIDES.length;
  const labelFor = (i: number) => t('authpc.slide.go', { n: i + 1, title: t(key(AUTH_SLIDES[i], 'title')) });

  return (
    <section
      ref={setNode}
      className="sk-slides"
      aria-roledescription={t('authpc.hero.carousel')}
      aria-label={t('authpc.hero.label')}
      data-running={running ? 'true' : 'false'}
      {...holdHandlers(hold)}
    >
      <div className="sk-slides__stage" aria-live={running ? 'off' : 'polite'}>
        {AUTH_SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="sk-slide"
            role="group"
            aria-roledescription={t('authpc.hero.slide')}
            aria-label={t('authpc.slide.position', { n: i + 1, total })}
            aria-hidden={i === index ? undefined : true}
            data-active={i === index ? 'true' : 'false'}
            data-testid={`auth-slide-${slide.id}`}
          >
            <SlideArt slide={slide} />
            <div className="sk-slide__words">
              <span className="sk-slide__eyebrow">{t(key(slide, 'eyebrow'))}</span>
              <h2 className="sk-slide__title">{t(key(slide, 'title'))}</h2>
              <p className="sk-slide__body">{t(key(slide, 'body'))}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="sk-slides__controls">
        <Dots index={index} onPick={pick} labelFor={labelFor} />
        {canRun ? (
          <button
            type="button"
            className="sk-slides__pause"
            aria-label={t(paused ? 'authpc.slide.play' : 'authpc.slide.pause')}
            onClick={() => (paused ? resume() : pick(index))}
          >
            <Icon name={paused ? 'play' : 'pause'} size={20} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Phone: the same slides as a small swipeable strip under the compact header.
 * It scrolls by itself on the same clock (smoothly, unless motion is reduced);
 * a swipe, a tap on a dot, hover or focus stops or holds it.
 */
export function AuthSlideStrip(): React.ReactElement {
  const t = useT();
  const reduced = useReducedMotion();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const onScreen = useOnScreen(node);
  const { index, pick, hold, running } = useAutoAdvance(AUTH_SLIDES.length, onScreen);
  const track = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const labelFor = (i: number) => t('authpc.slide.go', { n: i + 1, title: t(key(AUTH_SLIDES[i], 'title')) });

  const scrollTo = useCallback((i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card || typeof el.scrollTo !== 'function') return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced]);

  useEffect(() => {
    if (!touched.current) scrollTo(index);
  }, [index, scrollTo]);

  const onScroll = () => {
    const el = track.current;
    if (!el || !touched.current || el.clientWidth === 0) return;
    const nearest = Math.round(el.scrollLeft / el.clientWidth);
    if (nearest !== index && nearest >= 0 && nearest < AUTH_SLIDES.length) pick(nearest);
  };
  const stopForGood = () => {
    if (!touched.current) {
      touched.current = true;
      pick(index);
    }
  };

  return (
    <section
      ref={setNode}
      className="sk-strip"
      aria-roledescription={t('authpc.hero.carousel')}
      aria-label={t('authpc.hero.label')}
      data-running={running ? 'true' : 'false'}
      {...holdHandlers(hold)}
    >
      <div className="sk-strip__track" ref={track} onScroll={onScroll} onTouchStart={stopForGood} onPointerDown={stopForGood}>
        {AUTH_SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="sk-strip__card"
            role="group"
            aria-roledescription={t('authpc.hero.slide')}
            aria-label={t('authpc.slide.position', { n: i + 1, total: AUTH_SLIDES.length })}
            data-active={i === index ? 'true' : 'false'}
          >
            <span className="sk-strip__tile" aria-hidden="true"><Icon3d name={slide.chip} size={44} /></span>
            <span className="sk-strip__words">
              <span className="sk-strip__title">{t(key(slide, 'title'))}</span>
              <span className="sk-strip__body">{t(key(slide, 'body'))}</span>
            </span>
          </div>
        ))}
      </div>
      <Dots index={index} onPick={(i) => { touched.current = false; pick(i); scrollTo(i); touched.current = true; }} labelFor={labelFor} />
    </section>
  );
}
