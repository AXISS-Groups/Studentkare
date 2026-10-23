// Web player for the animated set: lottie-web's light SVG build, loaded as its own chunk the
// first time an animation scrolls into view (nothing on the initial page load). Native twin:
// LottiePlayer.native.tsx (lottie-react-native).
import React, { useContext, useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { color } from '../../theme';
import { useReducedMotion } from '../../motion';
import { M2ActiveContext, usePageVisible } from '../../m2/m2Motion';
import { skAnimated, type SkAnimatedName } from '../generated/skAnimatedData';
import { applyPalette, parseColour, rolesOf, type Rgb } from './palette';
import type { LottiePlayerProps } from './types';

type LottieApi = { loadAnimation: (params: { container: Element; renderer: 'svg'; loop: boolean; autoplay: boolean; animationData: unknown; rendererSettings?: { preserveAspectRatio?: string } }) => AnimationItem };

let lottie: Promise<LottieApi> | null = null;
/** One shared chunk for every animation on the page. */
function loadLottie(): Promise<LottieApi> {
  lottie ??= import('lottie-web/build/player/lottie_light').then((mod) => mod.default as unknown as LottieApi);
  return lottie;
}

/** The scheme the page is drawn in right now (ThemeProvider sets data-theme; System follows the OS). */
function schemeNow(): string {
  if (typeof document === 'undefined') return 'light';
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The app's own "Reduce motion" setting (InterfaceProvider sets data-ui-motion), on top of the system one. */
function appMotionReduced(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.uiMotion === 'reduced';
}

/** The drawn scheme and the app motion setting, kept current as the person changes either. */
function usePagePrefs(): { scheme: string; appReduced: boolean } {
  const [prefs, setPrefs] = useState(() => ({ scheme: schemeNow(), appReduced: appMotionReduced() }));
  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return undefined;
    const update = () => setPrefs((p) => {
      const next = { scheme: schemeNow(), appReduced: appMotionReduced() };
      return next.scheme === p.scheme && next.appReduced === p.appReduced ? p : next;
    });
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-ui-motion', 'class'] });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', update);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.('change', update);
    };
  }, []);
  return prefs;
}

/** A token value (`var(--sk-color-…)`) → the colour the browser resolves it to inside `host`. */
function resolveCss(value: string, host: Element): Rgb | null {
  const direct = parseColour(value);
  if (direct) return direct;
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = value;
  host.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return parseColour(resolved);
}

const palette = color as Readonly<Record<string, string>>;

/** The interactive element the animation sits in (hover/press start it), or the animation itself. */
function triggerTarget(host: HTMLElement): HTMLElement {
  return host.closest<HTMLElement>('a, button, [role="button"], [role="link"], [role="tab"]') ?? host;
}

export function LottiePlayer({ name, width, height, trigger, active, ink, bg, onReady }: LottiePlayerProps): React.ReactElement {
  const def = skAnimated[name as SkAnimatedName];
  const host = useRef<HTMLDivElement | null>(null);
  const item = useRef<AnimationItem | null>(null);
  const played = useRef(false);
  const wasActive = useRef(active);
  const systemReduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const screenActive = useContext(M2ActiveContext);
  const { scheme, appReduced } = usePagePrefs();
  // The media query is read here as well: the shared hook answers from a value cached at start-up.
  const mediaReduced = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const reduced = systemReduced || appReduced || mediaReduced;
  const [seen, setSeen] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [ready, setReady] = useState(false);

  // Load only once it is (nearly) on screen. No IntersectionObserver (old browsers, jsdom): stay still,
  // the poster or empty box stands in. Motion is decoration; nothing depends on it.
  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      setOnScreen(visible);
      if (visible) setSeen(true);
    }, { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const restFrame = (a: AnimationItem) => Math.max(0, Math.round((a.totalFrames - 1) * def.rest));

  // Build (or rebuild for a new scheme or colour) once seen.
  useEffect(() => {
    const node = host.current;
    if (!seen || !node || !def) return undefined;
    let live = true;
    Promise.all([loadLottie(), def.load()]).then(([api, raw]) => {
      if (!live || !host.current) return;
      const cache = new Map<string, Rgb | null>();
      const resolve = (role: string) => {
        if (!cache.has(role)) {
          const value = role === '@ink' ? ink : role === '@bg' ? bg : palette[role];
          cache.set(role, value ? resolveCss(value, node) : null);
        }
        return cache.get(role) ?? null;
      };
      rolesOf(raw).forEach(resolve);
      const frame = item.current ? item.current.currentFrame : null;
      item.current?.destroy();
      const a = api.loadAnimation({
        container: node, renderer: 'svg', loop: def.loop && trigger === 'loop', autoplay: false,
        animationData: applyPalette(raw, resolve), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      });
      a.addEventListener('complete', () => { if (!a.loop) a.goToAndStop(restFrame(a), true); });
      a.goToAndStop(frame ?? (trigger === 'mount' && !played.current ? 0 : restFrame(a)), true);
      item.current = a;
      setReady(true);
      onReady?.();
    }).catch(() => {
      // A chunk that fails to load leaves the still poster: decoration must never break a screen.
    });
    return () => { live = false; };
    // Rebuilt only for what changes the drawing (not for the callbacks).
  }, [seen, name, scheme, ink, bg]);

  useEffect(() => () => { item.current?.destroy(); item.current = null; }, []);

  // Playback: reduced motion rests; loops run only on screen with the page and screen in front.
  useEffect(() => {
    const a = item.current;
    if (!ready || !a) return;
    if (reduced) { a.loop = false; a.goToAndStop(restFrame(a), true); return; }
    const running = onScreen && pageVisible && screenActive;
    if (trigger === 'loop') {
      a.loop = true;
      if (running) a.play(); else a.pause();
      return;
    }
    a.loop = false;
    if (trigger === 'mount' && running && !played.current) {
      played.current = true;
      a.goToAndPlay(0, true);
    } else if (!running && !a.isPaused) {
      a.goToAndStop(restFrame(a), true);
    }
    // restFrame reads def, which is fixed per name.
  }, [ready, reduced, onScreen, pageVisible, screenActive, trigger]);

  // Hover / press on the control the animation belongs to plays it once.
  useEffect(() => {
    const node = host.current;
    if (!ready || !node || (trigger !== 'hover' && trigger !== 'press')) return undefined;
    const target = triggerTarget(node);
    const event = trigger === 'hover' ? 'pointerenter' : 'pointerdown';
    const run = () => { if (!reduced && item.current) item.current.goToAndPlay(0, true); };
    target.addEventListener(event, run);
    if (trigger === 'hover') target.addEventListener('focus', run);
    return () => {
      target.removeEventListener(event, run);
      target.removeEventListener('focus', run);
    };
  }, [ready, trigger, reduced]);

  // `active` turning on (a tab becoming current) plays it once.
  useEffect(() => {
    const turnedOn = active && !wasActive.current;
    wasActive.current = active;
    if (turnedOn && ready && !reduced && item.current) item.current.goToAndPlay(0, true);
  }, [active, ready, reduced]);

  return <div ref={host} data-anim={name} aria-hidden="true" style={{ width, height, flexShrink: 0, lineHeight: 0 }} />;
}
