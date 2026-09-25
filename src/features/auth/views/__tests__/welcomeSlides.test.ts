import { describe, expect, it } from 'vitest';
import {
  WELCOME_SLIDES,
  WELCOME_SLIDE_COUNT,
  clampSlide,
  isLastSlide,
  stepLabel,
} from '../welcomeSlides';

describe('step arithmetic', () => {
  it('clamps instead of wrapping, so the last slide leads out rather than back', () => {
    expect(clampSlide(-3)).toBe(0);
    expect(clampSlide(99)).toBe(WELCOME_SLIDE_COUNT - 1);
  });

  it('survives a nonsense index rather than indexing past the end', () => {
    // clampSlide is what stands between a bad index and `undefined.title`.
    expect(clampSlide(Number.NaN)).toBe(0);
    expect(clampSlide(1.7)).toBe(1);
    expect(WELCOME_SLIDES[clampSlide(Number.POSITIVE_INFINITY)]).toBeDefined();
  });

  it('knows where it ends', () => {
    expect(isLastSlide(WELCOME_SLIDE_COUNT - 1)).toBe(true);
    expect(isLastSlide(0)).toBe(false);
    expect(isLastSlide(99)).toBe(true);
  });

  it('counts from one, the way a person would read it', () => {
    expect(stepLabel(0)).toBe('Step 1 of 3');
    expect(stepLabel(2)).toBe('Step 3 of 3');
  });
});

describe('the slides themselves', () => {
  it('ends on a control that leaves, not one that implies more', () => {
    expect(WELCOME_SLIDES[WELCOME_SLIDE_COUNT - 1].cta).toBe('Continue');
    for (const slide of WELCOME_SLIDES.slice(0, -1)) {
      expect(slide.cta).toBe('Next');
    }
  });

  it('carries no empty copy', () => {
    for (const slide of WELCOME_SLIDES) {
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.body.length).toBeGreaterThan(0);
    }
  });

  it('has a distinct key per slide, so the panel variants cannot collide', () => {
    expect(new Set(WELCOME_SLIDES.map((s) => s.id)).size).toBe(WELCOME_SLIDE_COUNT);
  });
});

describe('what the copy may not do', () => {
  it('shows no price, discount or offer', () => {
    // Rule L: this is the first screen a student sees. It introduces care,
    // not a storefront.
    const words = WELCOME_SLIDES.map((s) => `${s.title} ${s.body}`).join(' ');
    expect(words).not.toMatch(/₹|discount|offer|free trial|cashback|sale\b/i);
  });

  it('states plainly that Ayush does not sell', () => {
    const ayush = WELCOME_SLIDES.find((s) => s.id === 'ayush');
    expect(ayush?.body).toMatch(/never sells you anything/i);
  });

  it('claims no compliance state', () => {
    // Guardrail 6: "ABDM linked" is a label on an illustration, not a claim
    // the app is certified. Nothing in the prose may assert one.
    const words = WELCOME_SLIDES.map((s) => `${s.title} ${s.body}`).join(' ');
    expect(words).not.toMatch(/certified|compliant|accredited|approved by/i);
  });
});
