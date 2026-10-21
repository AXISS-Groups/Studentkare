import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { color } from '../theme';
import { trendGeometry } from './trendGeometry';
import type { TrendTone } from './trendGeometry';
import type { TestTrendChartProps } from './TestTrendChart';

export type { TestTrendChartProps } from './TestTrendChart';

export function toneColour(tone: TrendTone): string {
  if (tone === 'attention') return color.attention;
  if (tone === 'positive') return color.positive;
  return color.text3;
}

/**
 * Native twin of TestTrendChart.tsx, drawn with react-native-svg at rest (no
 * draw-in on native, so nothing to stop under reduced motion). The drawing is
 * hidden from the screen reader; the wrapper is an image named by `summary`.
 */
export function TestTrendChart({ points, band, drawLine, summary, bandLabel, testID = 'chart-test-trend' }: TestTrendChartProps) {
  const g = trendGeometry(points, band, drawLine);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={styles.box} testID={testID}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width="100%" height={g.height} viewBox={`0 0 ${g.width} ${g.height}`}>
          {g.band ? (
            <G>
              <Rect x={0} y={g.band.top} width={g.width} height={g.band.bottom - g.band.top} rx={10} fill={color.positiveBg} />
              <SvgText x={g.width - 8} y={g.band.top + 14} textAnchor="end" fontSize={10.5} fontWeight="800" fill={color.positive}>{bandLabel}</SvgText>
            </G>
          ) : null}
          {g.linePath ? <Path d={g.linePath} fill="none" stroke={color.chartCategorical1} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {g.points.map((p) => (
            <G key={p.key}>
              <Circle cx={p.x} cy={p.y} r={7} fill={color.surface} stroke={toneColour(p.tone)} strokeWidth={3} />
              <SvgText x={p.x} y={p.y - 13} textAnchor="middle" fontSize={11.5} fontWeight="700" fill={color.text}>{p.valueLabel}</SvgText>
              <SvgText x={p.x} y={g.dateY} textAnchor="middle" fontSize={11} fontWeight="700" fill={color.text3}>{p.dateLabel}</SvgText>
            </G>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%' },
});
