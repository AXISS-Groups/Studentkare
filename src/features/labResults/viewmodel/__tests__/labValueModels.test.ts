import { describe, expect, it } from 'vitest';
import {
  bodySystemRows,
  filterValues,
  parseNumber,
  rowProblems,
  toValueInput,
  toneOf,
  trendView,
  type CheckRow,
} from '../labValueModels';
import { list, value } from './labFixtures';

const LIMITS = { valueAbsMax: 1e7 };

function row(over: Partial<CheckRow> = {}): CheckRow {
  return { localId: 'r', serverId: null, ticked: true, dirty: true, testCode: null, testName: 'HbA1c', value: '6.1',
    unit: '%', refLow: '4.0', refHigh: '5.6', refText: '4.0 - 5.6', ...over };
}

describe('tones come only from the server range state', () => {
  it('outside is amber, inside green, no range neutral; never red', () => {
    expect(toneOf('ABOVE')).toBe('attention');
    expect(toneOf('BELOW')).toBe('attention');
    expect(toneOf('IN_RANGE')).toBe('positive');
    expect(toneOf('NO_RANGE')).toBe('neutral');
  });
});

describe('Insights', () => {
  const items = [value({ rangeState: 'ABOVE' }), value({ rangeState: 'IN_RANGE' }), value({ rangeState: 'NO_RANGE' })];

  it('filters by the pressed count card', () => {
    expect(filterValues(items, 'needsLook')).toHaveLength(1);
    expect(filterValues(items, 'inRange')).toHaveLength(1);
    expect(filterValues(items, 'all')).toHaveLength(3);
  });

  it('body systems are amber when any test is outside, neutral when none has a range', () => {
    const l = { ...list(items), bodySystems: [
      { bodySystem: 'BLOOD_SUGAR' as const, tests: 2, outsideRange: 1, noRange: 0 },
      { bodySystem: 'THYROID' as const, tests: 1, outsideRange: 0, noRange: 1 },
      { bodySystem: 'VITAMINS' as const, tests: 1, outsideRange: 0, noRange: 0 },
    ] };
    expect(bodySystemRows(l).map(r => r.tone)).toEqual(['attention', 'neutral', 'positive']);
  });
});

describe('Trends', () => {
  it('plots oldest first, colours each point by its own range, and shares a band only when ranges match', () => {
    const newestFirst = [
      value({ collectedOn: '2026-06-20', valueNumeric: 5.9, refHigh: 5.6, rangeState: 'ABOVE', labName: 'B' }),
      value({ collectedOn: '2025-06-20', valueNumeric: 5.9, refHigh: 6.0, rangeState: 'IN_RANGE', labName: 'A' }),
    ];
    const view = trendView(newestFirst, 2);
    expect(view.latest?.labName).toBe('B');
    expect(view.points.map(p => [p.collectedOn, p.tone])).toEqual([['2025-06-20', 'positive'], ['2026-06-20', 'attention']]);
    expect(view.drawLine).toBe(true);
    expect(view.band).toBeNull();
    expect(view.mixedRanges).toBe(true);
  });

  it('draws the band when every plotted value shares one printed range', () => {
    const view = trendView([value(), value({ collectedOn: '2025-01-01' })], 2);
    expect(view.band).toEqual({ low: 4, high: 5.6 });
    expect(view.mixedRanges).toBe(false);
  });

  it('never plots another unit or a printed result on the same axis; they stay in the table', () => {
    const other = value({ unit: 'mmol/mol', valueNumeric: 43 });
    const text = value({ valueNumeric: null, valueText: 'Negative', rangeState: 'NO_RANGE' });
    const view = trendView([value(), other, text], 2);
    expect(view.points).toHaveLength(1);
    expect(view.notPlotted).toEqual([other.id, text.id]);
    expect(view.table).toHaveLength(3);
    expect(view.drawLine).toBe(false);   // below the server's minimum
  });

  it('is empty without values', () => {
    expect(trendView([], 2)).toMatchObject({ latest: null, points: [], drawLine: false, band: null });
  });
});

describe('Check step rows', () => {
  it('accepts a complete numeric row and a printed result', () => {
    expect(rowProblems(row(), LIMITS)).toEqual([]);
    expect(rowProblems(row({ value: 'Negative', refLow: '', refHigh: '' }), LIMITS)).toEqual([]);
  });

  it.each([
    [{ testName: '  ' }, 'testName'],
    [{ value: '' }, 'value'],
    [{ unit: 'mg/dL; DROP' }, 'unit'],
    [{ refLow: '9', refHigh: '1' }, 'range'],
    [{ refLow: 'four' }, 'range'],
    [{ value: 'Trace' }, 'range'],          // a printed result cannot have numeric limits
    [{ value: '1e12' }, 'range'],           // not a plain number, so a text value with limits
    [{ value: '20000000' }, 'tooLarge'],
  ] as const)('flags %o as %s', (over, problem) => {
    expect(rowProblems(row(over), LIMITS)).toContain(problem);
  });

  it('parses only plain decimal numbers', () => {
    expect(parseNumber('6.1')).toBe(6.1);
    expect(parseNumber(' -0.5 ')).toBe(-0.5);
    expect(parseNumber('')).toBeNull();
    expect(Number.isNaN(parseNumber('6,1') ?? 0)).toBe(true);
  });

  it('sends a number as valueNumeric and anything else as the printed text', () => {
    expect(toValueInput(row())).toMatchObject({ valueNumeric: 6.1, valueText: '', refLow: 4, refHigh: 5.6 });
    expect(toValueInput(row({ value: 'Negative', refLow: '', refHigh: '' })))
      .toMatchObject({ valueNumeric: null, valueText: 'Negative', refLow: null, refHigh: null });
  });
});
