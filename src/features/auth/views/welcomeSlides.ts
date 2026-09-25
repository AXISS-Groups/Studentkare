/** Copy and step arithmetic for the three-slide intro (design page 1, Tier 2).
 *
 * The copy lives here rather than in the view so it can be read by a test and,
 * later, handed to the translation pipeline without touching layout.
 */

export interface WelcomeSlide {
  /** Stable key — used for the panel variant and as the React key. */
  id: 'campus' | 'vault' | 'ayush';
  title: string;
  body: string;
  /** The forward control's label on this slide. */
  cta: string;
}

export const WELCOME_SLIDES: readonly WelcomeSlide[] = [
  {
    id: 'campus',
    title: 'Care that lives on your campus.',
    body:
      'Lab tests, verified medicines, doctor consults and 24×7 crisis support — all tied to ' +
      'your hostel block, not a hospital across town.',
    cta: 'Next',
  },
  {
    id: 'vault',
    title: 'Your records stay yours. For good.',
    body:
      'Every test, prescription and consult lands in one vault you own — portable across ' +
      'campuses, hospitals and the years after you graduate.',
    cta: 'Next',
  },
  {
    id: 'ayush',
    title: 'Ask Ayush before you Google it.',
    body:
      'Describe what you feel in plain words. Ayush routes you to the right test, medicine ' +
      'or clinician — and never sells you anything.',
    cta: 'Continue',
  },
] as const;

export const WELCOME_SLIDE_COUNT = WELCOME_SLIDES.length;

/** Clamp rather than wrap: the last slide's control leaves the carousel. */
export function clampSlide(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), WELCOME_SLIDE_COUNT - 1);
}

export function isLastSlide(index: number): boolean {
  return clampSlide(index) === WELCOME_SLIDE_COUNT - 1;
}

/** "Step 2 of 3" — announced on change, since the dots are decorative. */
export function stepLabel(index: number): string {
  return `Step ${clampSlide(index) + 1} of ${WELCOME_SLIDE_COUNT}`;
}
