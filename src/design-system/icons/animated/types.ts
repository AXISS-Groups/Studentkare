/** How an animation starts. `loop` runs while on screen; the others play once and rest. */
export type AnimatedPlay = 'mount' | 'loop' | 'hover' | 'press' | 'none';

/** Props shared by the web and native players (internal: screens use AnimatedIcon / AnimatedIllustration). */
export interface LottiePlayerProps {
  name: string;
  width: number;
  height: number;
  trigger: AnimatedPlay;
  /** Turning true plays it once (e.g. a tab becoming current). */
  active: boolean;
  /** Token value for `@ink` (single-ink icons). */
  ink: string;
  /** Token value for `@bg` (knock-out lines drawn in the surface colour). */
  bg: string;
  /** Called once the animation is drawn, so a poster can step aside. */
  onReady?: () => void;
}
