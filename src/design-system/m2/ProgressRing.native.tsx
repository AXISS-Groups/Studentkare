import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color, font, fontWeight } from '../theme';
import { clampRing } from './ProgressRing';
import type { ProgressRingProps } from './ProgressRing';

export { clampRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';

const VIEW = 64;
const R = 28;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Native twin of ProgressRing.tsx (drawn at its value; no fill-in motion on native). */
export function ProgressRing({ value, centre, size = 86, tone = color.onHeroPositive, track = color.onHeroTrack, testID }: ProgressRingProps) {
  const shown = clampRing(value);
  return (
    <View style={[styles.box, { width: size, height: size }]} testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Circle cx={VIEW / 2} cy={VIEW / 2} r={R} fill="none" stroke={track} strokeWidth={STROKE} />
        <Circle cx={VIEW / 2} cy={VIEW / 2} r={R} fill="none" stroke={tone} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={CIRCUMFERENCE * (1 - shown)} transform={`rotate(-90 ${VIEW / 2} ${VIEW / 2})`} />
      </Svg>
      <Text style={styles.centre}>{centre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  centre: { position: 'absolute', fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
});
