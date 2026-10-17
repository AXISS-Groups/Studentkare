import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, fontWeight, radius, space } from './theme';

export interface StepperProps {
  /** 1-based. */
  current: number;
  total: number;
  /** The caller's localised "Step 2 of 4"; the component never builds copy itself. */
  label: string;
}

/**
 * Stepper / progress (DESIGN.md §4): step n of m. Exposed as a progressbar so
 * the position is announced, not just drawn.
 */
export function Stepper({ current, total, label }: StepperProps) {
  const safeTotal = Math.max(1, Math.floor(total));
  const step = Math.min(Math.max(1, Math.floor(current)), safeTotal);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: safeTotal, now: step }}
      // react-native-web 0.19 drops accessibilityValue; the aria props carry it on web.
      aria-valuemin={1}
      aria-valuemax={safeTotal}
      aria-valuenow={step}
      style={styles.wrap}
    >
      <View style={styles.track} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {Array.from({ length: safeTotal }, (_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i < step ? color.action : color.rule }]} />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s8 },
  track: { flexDirection: 'row', gap: space.s6 },
  segment: { flex: 1, height: 4, borderRadius: radius.full },
  label: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    fontWeight: fontWeight(font.weight.strong),
    color: color.text2,
  },
});
