import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color } from '../theme';

export interface CountdownRingProps {
  secondsLeft: number;
  totalSeconds: number;
  size?: number;
  stroke?: number;
}

export function ringFraction(secondsLeft: number, totalSeconds: number): number {
  if (!Number.isFinite(secondsLeft) || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
  return Math.max(0, Math.min(1, secondsLeft / totalSeconds));
}

/** Native twin of CountdownRing.tsx (react-native-svg); same props, decorative. */
export function CountdownRing({ secondsLeft, totalSeconds, size = 40, stroke = 3 }: CountdownRingProps): React.ReactElement {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const left = ringFraction(secondsLeft, totalSeconds);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.surface3} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color.action}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - left)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}
