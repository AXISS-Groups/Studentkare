import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color } from '../theme';
import type { GradientProps } from './Gradient';

export type { GradientProps } from './Gradient';

const DEG = Math.PI / 180;
const HALF = 0.5;

/** CSS angle (0 = to top, 90 = to right) to the gradient line across a unit box. */
function line(angle: number) {
  const rad = angle * DEG;
  const dx = Math.sin(rad) * HALF;
  const dy = -Math.cos(rad) * HALF;
  return { x1: HALF - dx, y1: HALF - dy, x2: HALF + dx, y2: HALF + dy };
}

/** Native twin of Gradient.tsx: the same token stops, drawn with react-native-svg behind the children. */
export function Gradient({ colors, angle = 150, radial, gloss = false, style, children, testID, pointerEvents }: GradientProps): React.ReactElement {
  const id = useId().replace(/:/g, '');
  const last = colors.length - 1;
  const stops = colors.map((c, i) => <Stop key={i} offset={last > 0 ? i / last : 0} stopColor={c} />);
  const l = line(angle);
  return (
    <View testID={testID} pointerEvents={pointerEvents} style={[styles.box, { backgroundColor: colors[last] ?? color.surface }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" accessible={false}>
        <Defs>
          {radial ? (
            <RadialGradient id={`g${id}`} cx={radial.x} cy={radial.y} r={1} gradientUnits="objectBoundingBox">{stops}</RadialGradient>
          ) : (
            <LinearGradient id={`g${id}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} gradientUnits="objectBoundingBox">{stops}</LinearGradient>
          )}
          {gloss ? (
            <RadialGradient id={`s${id}`} cx={0.28} cy={0.22} r={0.46} gradientUnits="objectBoundingBox">
              <Stop offset={0} stopColor={color.illustrationHighlight} stopOpacity={0.55} />
              <Stop offset={1} stopColor={color.illustrationHighlight} stopOpacity={0} />
            </RadialGradient>
          ) : null}
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#g${id})`} />
        {gloss ? <Rect x={0} y={0} width="100%" height="100%" fill={`url(#s${id})`} /> : null}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ box: { overflow: 'hidden' } });
