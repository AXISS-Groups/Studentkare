import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, fontWeight } from './theme';

export interface ProgressRingProps {
  /** Done so far (verified checks, for example). */
  value: number;
  /** Out of how many. 0 draws an empty track. */
  total: number;
  /** px, default 72. */
  size?: number;
  /** Spoken instead of the drawing, e.g. "1 of 1 checks verified". */
  label: string;
  testID?: string;
}

const STROKE = 7;

/**
 * Progress ring with the count in the middle (canvas chart-verifyidentity /
 * chart-webverify: a data-driven graphic, not an icon). The arc is the share
 * done; the number is mono (DESIGN.md §3). One accessible image with a label.
 * Web: SVG. Native twin: ProgressRing.native.tsx.
 */
export function ProgressRing({ value, total, size = 72, label, testID }: ProgressRingProps): React.ReactElement {
  const share = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const r = (size - STROKE) / 2;
  const length = 2 * Math.PI * r;
  return (
    <View testID={testID} role="img" aria-label={label} accessibilityLabel={label} style={[styles.box, { width: size, height: size }]}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.surface3} strokeWidth={STROKE} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.action} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={length} strokeDashoffset={length * (1 - share)} />
      </svg>
      <Text aria-hidden style={styles.count}>{`${value}/${total}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  count: { fontFamily: font.family.mono, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
