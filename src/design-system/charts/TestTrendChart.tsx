import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../motion';
import { color, font, motion } from '../theme';
import { trendGeometry } from './trendGeometry';
import type { TrendChartBand, TrendChartPoint, TrendTone } from './trendGeometry';

/**
 * `chart-test-trend` (M2Trends, Tier 1): one lab test's values over time, the
 * lab's printed range as a soft band, each point in its own row's tone.
 *
 * Accessibility: the drawing is hidden from assistive tech; the wrapper is an
 * image named by `summary` (the caller's text alternative, e.g. "HbA1c over
 * time: Dec 23 6.1 %, …"), and the screen offers the table view as the full
 * equivalent. The line draws itself in once on the web, never under reduced
 * motion; native (TestTrendChart.native.tsx) draws it at rest.
 */
export interface TestTrendChartProps {
  /** Oldest first. */
  points: readonly TrendChartPoint[];
  /** The lab's range, only when every plotted value shares one; null draws no band. */
  band: TrendChartBand | null;
  /** False below the settings minimum of values: points only, no line. */
  drawLine: boolean;
  /** The text alternative (spoken). */
  summary: string;
  /** Printed inside the band, e.g. "Lab range". */
  bandLabel: string;
  testID?: string;
}

export function toneColour(tone: TrendTone): string {
  if (tone === 'attention') return color.attention;
  if (tone === 'positive') return color.positive;
  return color.text3;
}

export function TestTrendChart({ points, band, drawLine, summary, bandLabel, testID = 'chart-test-trend' }: TestTrendChartProps) {
  const reduced = useReducedMotion();
  const g = trendGeometry(points, band, drawLine);
  const [drawn, setDrawn] = useState(reduced);
  const signature = g.linePath;
  useEffect(() => {
    if (reduced) {
      setDrawn(true);
      return undefined;
    }
    setDrawn(false);
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [reduced, signature]);
  const transition = reduced ? undefined : `stroke-dashoffset ${motion.duration.ambient / 4}ms ${motion.easing.standard}`;
  return (
    <View role="img" accessibilityLabel={summary} aria-label={summary} style={styles.box} testID={testID}>
      <svg width="100%" viewBox={`0 0 ${g.width} ${g.height}`} aria-hidden="true" focusable="false" data-reduced={reduced ? 'true' : 'false'}>
        {g.band ? (
          <g data-part="band">
            <rect x={0} y={g.band.top} width={g.width} height={g.band.bottom - g.band.top} rx={10}
              fill={`color-mix(in srgb, ${color.positive} 12%, ${color.surface})`} />
            <text x={g.width - 8} y={g.band.top + 14} textAnchor="end" fontFamily={font.family.sans} fontSize={10.5} fontWeight={800} fill={color.positive}>{bandLabel}</text>
          </g>
        ) : null}
        {g.areaPath ? <path d={g.areaPath} fill={color.actionSoft} fillOpacity={0.45} data-part="area" /> : null}
        {g.linePath ? (
          <path d={g.linePath} fill="none" stroke={color.chartCategorical1} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={g.lineLength} strokeDashoffset={drawn ? 0 : g.lineLength} style={{ transition }} data-part="line" />
        ) : null}
        {g.points.map((p) => (
          <g key={p.key} data-part="point" data-tone={p.tone}>
            <circle cx={p.x} cy={p.y} r={7} fill={color.surface} stroke={toneColour(p.tone)} strokeWidth={3} />
            <text x={p.x} y={p.y - 13} textAnchor="middle" fontFamily={font.family.mono} fontSize={11.5} fontWeight={700} fill={color.text}>{p.valueLabel}</text>
            <text x={p.x} y={g.dateY} textAnchor="middle" fontFamily={font.family.sans} fontSize={11} fontWeight={700} fill={color.text3}>{p.dateLabel}</text>
          </g>
        ))}
      </svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%' },
});
