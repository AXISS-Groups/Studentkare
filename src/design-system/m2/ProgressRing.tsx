import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../motion';
import { color, font, fontWeight, motion } from '../theme';

/**
 * A progress ring with its count in the middle (M2Home "Medicines today",
 * brief graphic `chart-medicines-today-ring`). Web: an SVG circle whose arc
 * fills in once on mount (skipped under reduced motion). Native:
 * ProgressRing.native.tsx draws it with react-native-svg. The ring is
 * aria-hidden; the caller names the value in words next to it.
 */
export interface ProgressRingProps {
  /** 0 … 1. */
  value: number;
  /** Text in the middle, e.g. "2/3". */
  centre: string;
  size?: number;
  /** Arc colour on the navy card (`on-hero-positive`). */
  tone?: string;
  /** Track colour (`on-hero-track`). */
  track?: string;
  testID?: string;
}

const VIEW = 64;
const R = 28;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function clampRing(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function ProgressRing({ value, centre, size = 86, tone = color.onHeroPositive, track = color.onHeroTrack, testID }: ProgressRingProps) {
  const reduced = useReducedMotion();
  const target = clampRing(value);
  const [shown, setShown] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setShown(target);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(frame);
  }, [reduced, target]);
  const transition = reduced ? undefined : `stroke-dashoffset 1200ms ${motion.easing.standard}`;
  return (
    <View style={[styles.box, { width: size, height: size }]} testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true" focusable="false">
        <circle cx={VIEW / 2} cy={VIEW / 2} r={R} fill="none" stroke={track} strokeWidth={STROKE} />
        <circle cx={VIEW / 2} cy={VIEW / 2} r={R} fill="none" stroke={tone} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
          transform={`rotate(-90 ${VIEW / 2} ${VIEW / 2})`} style={{ transition }} />
      </svg>
      <Text style={styles.centre} aria-hidden>{centre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  centre: { position: 'absolute', fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
});
