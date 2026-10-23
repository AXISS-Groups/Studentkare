import type {
  BodySystemSummary,
  LabReportGroup,
  LabValue,
  LabValuesList,
  RangeState,
  ValueInput,
} from '../data/LabResultsRepository';

/**
 * Pure projections of the server's lab values for the M2 screens (web and Expo).
 *
 * Nothing here decides whether a value is in range: the tone comes from the
 * server's `rangeState`, which it computes from the lab's printed range. No
 * direction words, no score, no target (plan rules, WP-07 D7-8).
 */

/** Token family a value is drawn in: amber outside the lab's range, green inside, neutral without one. Never red. */
export type ValueTone = 'attention' | 'positive' | 'neutral';

export function toneOf(state: RangeState): ValueTone {
  if (state === 'ABOVE' || state === 'BELOW') return 'attention';
  if (state === 'IN_RANGE') return 'positive';
  return 'neutral';
}

export const isOutside = (state: RangeState): boolean => toneOf(state) === 'attention';

// ── M2Insights ───────────────────────────────────────────────────────────────

/** The two count cards are toggles; with neither pressed every row shows. */
export type InsightsFilter = 'all' | 'needsLook' | 'inRange';

export function latestReport(list: LabValuesList): LabReportGroup | null {
  return list.reports[0] ?? null;
}

export function filterValues(items: readonly LabValue[], filter: InsightsFilter): LabValue[] {
  if (filter === 'needsLook') return items.filter(i => isOutside(i.rangeState));
  if (filter === 'inRange') return items.filter(i => i.rangeState === 'IN_RANGE');
  return [...items];
}

export interface BodySystemRow extends BodySystemSummary {
  /** Dots are never the only cue: the view also prints "n of m outside the lab's range". */
  tone: ValueTone;
}

export function bodySystemRows(list: LabValuesList): BodySystemRow[] {
  return list.bodySystems.map(s => ({
    ...s,
    tone: s.outsideRange > 0 ? 'attention' : s.noRange === s.tests ? 'neutral' : 'positive',
  }));
}

// ── M2Trends ─────────────────────────────────────────────────────────────────

export interface TrendPoint {
  id: string;
  collectedOn: string;
  value: number;
  unit: string;
  labName: string;
  rangeState: RangeState;
  tone: ValueTone;
}

export interface TrendView {
  /** The newest value: the badge and range bar use this row's own range. */
  latest: LabValue | null;
  /** Oldest first, numeric values in the latest row's unit only. */
  points: TrendPoint[];
  /** Every value, newest first: the table and the chart's accessible equivalent. */
  table: LabValue[];
  /** Values in the table that are not plotted (another unit, or a printed result such as "Negative"). */
  notPlotted: string[];
  /** A line only with at least the server's minimum of plottable values. */
  drawLine: boolean;
  /** The range band, only when every plotted value shares one printed range; otherwise null and the footnote explains. */
  band: { low: number | null; high: number | null } | null;
  /** True when plotted values came with different ranges (the band is then omitted). */
  mixedRanges: boolean;
}

export function trendView(newestFirst: readonly LabValue[], minPointsForLine: number): TrendView {
  const latest = newestFirst[0] ?? null;
  const plottable = latest
    ? newestFirst.filter(v => v.valueNumeric !== null && v.unit === latest.unit)
    : [];
  const points: TrendPoint[] = [...plottable].reverse().map(v => ({
    id: v.id, collectedOn: v.collectedOn, value: v.valueNumeric ?? 0, unit: v.unit, labName: v.labName,
    rangeState: v.rangeState, tone: toneOf(v.rangeState),
  }));
  const ranges = new Set(plottable.map(v => `${v.refLow ?? ''}|${v.refHigh ?? ''}`));
  const first = plottable[0];
  const shared = ranges.size === 1 && first !== undefined && (first.refLow !== null || first.refHigh !== null);
  return {
    latest,
    points,
    table: [...newestFirst],
    notPlotted: newestFirst.filter(v => !plottable.includes(v)).map(v => v.id),
    drawLine: points.length >= minPointsForLine,
    band: shared && first ? { low: first.refLow, high: first.refHigh } : null,
    mixedRanges: ranges.size > 1,
  };
}

// ── M2ReportUpload: the Check step ───────────────────────────────────────────

/** One editable line on the Check step. Typed values start unticked: only ticked rows are saved. */
export interface CheckRow {
  localId: string;
  /** The server's draft id once sent. */
  serverId: string | null;
  ticked: boolean;
  /** Changed since it was last sent (needs a PATCH before confirming). */
  dirty: boolean;
  testCode: string | null;
  testName: string;
  /** As typed: a number ("6.1") or a printed result ("Negative"). */
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  refText: string;
}

export type RowProblem = 'testName' | 'value' | 'unit' | 'range' | 'tooLarge';

export interface CheckLimits {
  valueAbsMax: number;
}

// Mirrors backend services/lab_results.UNIT_PATTERN; the server stays the authority.
const UNIT_PATTERN = /^[A-Za-z0-9µμ%/^.*×·²³⁹\-[\]() ]*$/;
const NUMBER_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)$/;
const TEST_NAME_MAX = 120;
const VALUE_TEXT_MAX = 60;
const UNIT_MAX = 40;

/** A typed number, null when blank, or NaN when it is not a number. */
export function parseNumber(typed: string): number | null {
  const s = typed.trim();
  if (s === '') return null;
  return NUMBER_PATTERN.test(s) ? Number(s) : Number.NaN;
}

export function rowProblems(row: CheckRow, limits: CheckLimits): RowProblem[] {
  const problems: RowProblem[] = [];
  const name = row.testName.trim();
  if (name === '' || name.length > TEST_NAME_MAX) problems.push('testName');
  const value = row.value.trim();
  const numeric = parseNumber(value);
  if (value === '' || value.length > VALUE_TEXT_MAX) problems.push('value');
  if (row.unit.trim().length > UNIT_MAX || !UNIT_PATTERN.test(row.unit.trim())) problems.push('unit');
  const low = parseNumber(row.refLow);
  const high = parseNumber(row.refHigh);
  const isNumber = numeric !== null && !Number.isNaN(numeric);
  if (Number.isNaN(low ?? 0) || Number.isNaN(high ?? 0)) problems.push('range');
  else if (low !== null && high !== null && low > high) problems.push('range');
  else if (!isNumber && (low !== null || high !== null)) problems.push('range');
  if ([isNumber ? numeric : null, low, high].some(n => n !== null && Math.abs(n) > limits.valueAbsMax)) {
    problems.push('tooLarge');
  }
  return [...new Set(problems)];
}

/** The body the server takes for one row. A non-numeric value is sent as the printed result. */
export function toValueInput(row: CheckRow): ValueInput {
  const numeric = parseNumber(row.value);
  const isNumber = numeric !== null && !Number.isNaN(numeric);
  return {
    testCode: row.testCode,
    testName: row.testName.trim(),
    valueNumeric: isNumber ? numeric : null,
    valueText: isNumber ? '' : row.value.trim(),
    unit: row.unit.trim(),
    refLow: parseNumber(row.refLow),
    refHigh: parseNumber(row.refHigh),
    refText: row.refText.trim(),
  };
}

export function rowFromValue(value: LabValue, localId: string): CheckRow {
  return {
    localId, serverId: value.id, ticked: false, dirty: false, testCode: value.testCode,
    testName: value.testNameAsPrinted,
    value: value.valueNumeric !== null ? String(value.valueNumeric) : value.valueText,
    unit: value.unit,
    refLow: value.refLow !== null ? String(value.refLow) : '',
    refHigh: value.refHigh !== null ? String(value.refHigh) : '',
    refText: value.refText,
  };
}
