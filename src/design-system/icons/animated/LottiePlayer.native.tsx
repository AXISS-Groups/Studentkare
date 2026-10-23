// Native player for the animated set (lottie-react-native, the version Expo SDK 52 pins).
// Same props as LottiePlayer.tsx (web). Colours are token values from the native palette (hex).
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
import { color } from '../../theme';
import { useReducedMotion } from '../../motion';
import { M2ActiveContext, usePageVisible } from '../../m2/m2Motion';
import { skAnimated, type SkAnimatedName } from '../generated/skAnimatedData';
import { applyPalette, parseColour } from './palette';
import type { LottiePlayerProps } from './types';

const palette = color as Readonly<Record<string, string>>;

export function LottiePlayer({ name, width, height, trigger, active, ink, bg, onReady }: LottiePlayerProps): React.ReactElement {
  const def = skAnimated[name as SkAnimatedName];
  const ref = useRef<LottieView | null>(null);
  const played = useRef(false);
  const wasActive = useRef(active);
  const reduced = useReducedMotion();
  const appVisible = usePageVisible();
  const screenActive = useContext(M2ActiveContext);
  const [source, setSource] = useState<AnimationObject | null>(null);

  useEffect(() => {
    let live = true;
    def?.load().then((raw) => {
      if (!live) return;
      const resolve = (role: string) => {
        const value = role === '@ink' ? ink : role === '@bg' ? bg : palette[role];
        return value ? parseColour(value) : null;
      };
      setSource(applyPalette(raw, resolve) as AnimationObject);
      onReady?.();
    }).catch(() => undefined);
    return () => { live = false; };
    // Rebuilt only for what changes the drawing.
  }, [name, ink, bg]);

  const running = appVisible && screenActive && !reduced;
  useEffect(() => {
    const view = ref.current;
    if (!source || !view || reduced) return;
    if (trigger === 'loop') {
      if (running) view.play(); else view.pause();
    } else if (trigger === 'mount' && running && !played.current) {
      played.current = true;
      view.play();
    }
  }, [source, reduced, running, trigger]);

  useEffect(() => {
    const turnedOn = active && !wasActive.current;
    wasActive.current = active;
    if (turnedOn && !reduced) ref.current?.play(0);
  }, [active, reduced]);

  if (!source || !def) return <View style={{ width, height }} />;
  // Reduced motion (or a trigger that never fired): the still frame the build chose.
  const still = reduced || trigger === 'hover' || trigger === 'none';
  return (
    <View style={{ width, height }} onTouchStart={trigger === 'press' && !reduced ? () => ref.current?.play(0) : undefined}>
      <LottieView
        ref={ref}
        source={source}
        style={{ width, height }}
        loop={trigger === 'loop' && def.loop}
        autoPlay={false}
        progress={still ? def.rest : undefined}
        resizeMode="contain"
      />
    </View>
  );
}
