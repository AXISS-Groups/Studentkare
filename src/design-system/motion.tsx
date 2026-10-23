import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import type { EasingFunction } from 'react-native';
import { motion } from './theme';

/**
 * Motion for the design system, driven by the motion tokens and the system
 * reduced-motion setting (DESIGN.md §3; canvas board "Motion & interaction").
 *
 * Built on React Native's Animated so the same code runs on web and native —
 * no animation dependency. Motion explains a change; it is never decoration on
 * clinical content, and nothing here exists only as an animation: with motion
 * reduced, every component renders straight at its end state.
 */

/** Parses a token like `cubic-bezier(0.16, 1, 0.3, 1)`. A malformed token falls back to linear rather than throwing. */
export function bezierFromToken(token: string): EasingFunction {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(token.trim());
  const parts = match ? match[1].split(',').map((p) => Number(p.trim())) : [];
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return Easing.linear;
  const [x1, y1, x2, y2] = parts;
  return Easing.bezier(x1, y1, x2, y2);
}

export const easing = {
  standard: bezierFromToken(motion.easing.standard),
  sheet: bezierFromToken(motion.easing.sheet),
};

/** The last value the system reported, shared so a later mount knows it synchronously. */
let knownReduced: boolean | null = readWebPreference();

function readWebPreference(): boolean | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Whether motion should be reduced. Until the system answers, this reports
 * `true`: the safe reading is "don't animate", so the first frame on native
 * may skip an entrance rather than play one the student asked not to see.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(knownReduced ?? true);

  useEffect(() => {
    let live = true;
    const apply = (value: boolean) => {
      knownReduced = value;
      if (live) setReduced(value);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(apply, () => apply(true));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', apply);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

const useNativeDriver = Platform.OS !== 'web';

export interface RiseProps {
  children: React.ReactNode;
  /** Position in a staggered group. Only the first eight are staggered (canvas: "never more than eight before it feels slow"). */
  index?: number;
  style?: object;
}

/** Content arriving on a screen: rises 14 px and fades in over the `base` duration. */
export function Rise({ children, index = 0, style }: RiseProps) {
  const reduced = useReducedMotion();
  // Start at the end state unless motion is known to be allowed at mount.
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: motion.duration.base,
      delay: Math.min(index, 7) * 60,
      easing: easing.standard,
      useNativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, index, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/**
 * A slow opacity pulse for loading placeholders. Loops only while motion is
 * allowed; reduced, it holds still at full opacity.
 */
export function usePulse(): Animated.Value {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver }),
        Animated.timing(value, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, value]);

  return value;
}
