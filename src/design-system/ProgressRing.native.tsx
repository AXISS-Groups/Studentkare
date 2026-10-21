import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color, font, fontWeight } from './theme';
import type { ProgressRingProps } from './ProgressRing';

export type { ProgressRingProps } from './ProgressRing';

const STROKE = 7;

/** Native twin of ProgressRing.tsx (react-native-svg). Same props, same drawing. */
export function ProgressRing({ value, total, size = 72, label, testID }: ProgressRingProps): React.ReactElement {
  const share = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const r = (size - STROKE) / 2;
  const length = 2 * Math.PI * r;
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.box, { width: size, height: size }]}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.surface3} strokeWidth={STROKE} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.action} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${length}`} strokeDashoffset={length * (1 - share)} />
      </Svg>
      <Text style={styles.count}>{`${value}/${total}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: font.family.mono, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
