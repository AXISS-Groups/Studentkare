/**
 * Geometry for `chart-test-trend` (M2Trends): one lab test over time, oldest
 * on the left, with the lab's printed range as a band. Pure, shared by the web
 * (TestTrendChart.tsx) and native (TestTrendChart.native.tsx) drawings.
 *
 * It only places what it is given. It never decides whether a value is in
 * range (each point arrives with its tone, from the server's `rangeState`),
 * never projects a line forward and draws no target.
 */
export type TrendTone = 'attention' | 'positive' | 'neutral';

export interface TrendChartPoint {
  key: string;
  value: number;
  tone: TrendTone;
  /** Under the point, e.g. "Jun 26". */
  dateLabel: string;
  /** Over the point, e.g. "7.6". */
  valueLabel: string;
}

export interface TrendChartBand {
  low: number | null;
  high: number | null;
}

export interface PlacedPoint extends TrendChartPoint {
  x: number;
  y: number;
}

export interface TrendGeometry {
  width: number;
  height: number;
  points: PlacedPoint[];
  /** "M x y L x y …"; empty when no line is drawn. */
  linePath: string;
  /** The soft fill under the line, down to the plot's floor; empty when no line. */
  areaPath: string;
  /** Approximate length of the line, for the draw-in animation. */
  lineLength: number;
  band: { top: number; bottom: number } | null;
  /** Where the date labels sit. */
  dateY: number;
}

export const TREND_WIDTH = 314;
export const TREND_HEIGHT = 196;
const TOP = 26;
const FLOOR = 160;
const PAD_X = 30;

function domain(values: number[], band: TrendChartBand | null): [number, number] {
  const all = [...values, ...(band ? [band.low, band.high].filter((n): n is number => n !== null) : [])];
  if (all.length === 0) return [0, 1];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min;
  const pad = span === 0 ? Math.max(Math.abs(max) * 0.2, 1) : span * 0.18;
  return [min - pad, max + pad];
}

export function trendGeometry(points: readonly TrendChartPoint[], band: TrendChartBand | null, drawLine: boolean): TrendGeometry {
  const [lo, hi] = domain(points.map((p) => p.value), band);
  const y = (v: number) => FLOOR - ((v - lo) / (hi - lo)) * (FLOOR - TOP);
  const step = points.length > 1 ? (TREND_WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  const x = (i: number) => (points.length > 1 ? PAD_X + i * step : TREND_WIDTH / 2);
  const placed = points.map((p, i) => ({ ...p, x: x(i), y: y(p.value) }));
  const line = drawLine && placed.length > 1;
  const linePath = line ? placed.map((p, i) => `${i ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`).join(' ') : '';
  const first = placed[0];
  const last = placed[placed.length - 1];
  const areaPath = line && first && last ? `${linePath} L${round(last.x)} ${FLOOR} L${round(first.x)} ${FLOOR} Z` : '';
  let lineLength = 0;
  if (line) {
    for (let i = 1; i < placed.length; i += 1) {
      const a = placed[i - 1];
      const b = placed[i];
      if (a && b) lineLength += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  const bandBox = band && (band.low !== null || band.high !== null)
    ? { top: clamp(band.high === null ? TOP - 8 : y(band.high)), bottom: clamp(band.low === null ? FLOOR : y(band.low)) }
    : null;
  return {
    width: TREND_WIDTH, height: TREND_HEIGHT, points: placed, linePath, areaPath, lineLength: Math.ceil(lineLength),
    band: bandBox && bandBox.bottom > bandBox.top ? bandBox : null, dateY: FLOOR + 26,
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.min(FLOOR, Math.max(TOP - 8, n));
