import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform } from 'react-native';
import { motion } from '../theme';
import { useReducedMotion } from '../motion';

/**
 * Motion for the Mobile 2.0 boards (the carousel, tile shine, floating art,
 * the orb, live dots), on React Native's Animated so web and Expo share it.
 *
 * Every loop here stops under reduced motion, while the screen is not the one
 * in front (M2ActiveContext: the Expo route passes its focus; the web passes
 * the page's visibility), and when it unmounts. Stopped, everything rests at
 * its start, which is the drawn design.
 */

/** False while the screen is behind another one (Expo: the route is not focused). */
export const M2ActiveContext = createContext(true);
export const M2ActiveProvider = M2ActiveContext.Provider;

function pageVisibleNow(): boolean {
  if (Platform.OS === 'web') return typeof document === 'undefined' || document.visibilityState !== 'hidden';
  return AppState.currentState === 'active' || AppState.currentState === null;
}

/** The page (web tab) or the app (native) is in front. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(pageVisibleNow);
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return undefined;
      const onChange = () => setVisible(document.visibilityState !== 'hidden');
      document.addEventListener('visibilitychange', onChange);
      return () => document.removeEventListener('visibilitychange', onChange);
    }
    const sub = AppState.addEventListener('change', (state: string) => setVisible(state === 'active'));
    return () => sub.remove();
  }, []);
  return visible;
}

/** Decorative motion may run: not reduced, the screen in front, the page visible. */
export function useAmbientMotion(): boolean {
  const reduced = useReducedMotion();
  const active = useContext(M2ActiveContext);
  const visible = usePageVisible();
  return !reduced && active && visible;
}

const useNativeDriver = Platform.OS !== 'web';

/**
 * A value that runs 0 to 1 once every `duration` ms, repeating, while `run` is
 * true. Stopped (or reduced) it rests at 0. Each consumer interpolates it.
 */
export function useLoop(run: boolean, duration: number = motion.duration.ambient, delay = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) {
      value.stopAnimation();
      value.setValue(0);
      return undefined;
    }
    value.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver, isInteraction: false }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      value.setValue(0);
    };
  }, [run, duration, delay, value]);
  return value;
}

/** A gentle up-and-down float (canvas skFloat): 0 to -distance to 0 over one loop. */
export function floatTransform(value: Animated.Value, distance: number) {
  return [{ translateY: value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -distance, 0] }) }];
}

export interface AutoAdvance {
  index: number;
  /** The student picked one: show it and stop advancing for good (WCAG 2.2.2). */
  pick: (index: number) => void;
  /** Hover / focus inside the carousel holds it. */
  hold: (held: boolean) => void;
  /** Whether it is still advancing by itself. */
  running: boolean;
  /** Whether it can move at all: ambient motion allowed (not reduced) and more than one item. */
  canRun: boolean;
  /** The student stopped it (a pick or a pause); hover and focus holds don't count. */
  paused: boolean;
  /** Play again after a pause: lets go of any hold too, since the student asked for it. */
  resume: () => void;
}

/**
 * The highlight carousel's clock: moves to the next of `count` every
 * `motion.duration.carousel` ms, only while ambient motion is allowed, the
 * carousel is on screen (`onScreen`) and nothing holds it.
 */
export function useAutoAdvance(count: number, onScreen: boolean): AutoAdvance {
  const ambient = useAmbientMotion();
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const canRun = ambient && count > 1;
  const running = canRun && onScreen && !held && !stopped;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), motion.duration.carousel);
    return () => clearInterval(timer);
  }, [running, count]);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [index, count]);

  const pick = useCallback((i: number) => {
    setStopped(true);
    setIndex(i);
  }, []);
  const resume = useCallback(() => {
    setStopped(false);
    setHeld(false);
  }, []);
  return { index: count > 0 ? index % count : 0, pick, hold: setHeld, running, canRun, paused: stopped, resume };
}

/**
 * Web: whether a node is in the viewport (IntersectionObserver). Native, or a
 * browser without the observer: true (the route's focus covers off-screen).
 */
export function useOnScreen(node: unknown): boolean {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined') return undefined;
    if (!(typeof Element !== 'undefined' && node instanceof Element)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setOnScreen(entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return onScreen;
}
