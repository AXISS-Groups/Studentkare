import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { color } from '@/design-system/theme';
import { trendGeometry } from '@/design-system/charts';
import { axeViolations, describeViolations } from '@/test/axe';
import type { ReportReview } from '@/features/preventive/models';
import { LabResultsRepository } from '../../data/LabResultsRepository';
import type { LabValue, TestsWithValues } from '../../data/LabResultsRepository';
import { TrendsViewModel } from '../../viewmodel/LabValuesViewModels';
import { rangeBar, stepIcon, stepsForTest } from '../../viewmodel/trendScreenModels';
import { value } from '../../viewmodel/__tests__/labFixtures';
import { M2TrendsView } from '../M2TrendsView';
import type { M2TrendsLinks } from '../M2TrendsView';

type Requester = typeof import('@/data/services/http').apiRequest;

function setup(routes: Record<string, unknown>) {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const answer = routes[`${init?.method ?? 'GET'} ${path}`];
    if (answer instanceof Error) throw answer;
    if (typeof answer === 'function') return (answer as (body: unknown) => unknown)(init?.body ? JSON.parse(String(init.body)) : null);
    if (answer === undefined) throw new ApiError(`no route ${init?.method ?? 'GET'} ${path}`, 404);
    return answer;
  }) as unknown as Requester & ReturnType<typeof vi.fn>;
  return { repo: new LabResultsRepository(request), request };
}

const HBA1C = '4548-4';
const chips: TestsWithValues = {
  items: [
    { testKey: HBA1C, testCode: HBA1C, testName: 'HbA1c', bodySystem: 'BLOOD_SUGAR', count: 3, latestCollectedOn: '2026-06-20', latestRangeState: 'ABOVE', pinned: false },
    { testKey: 'name:hdl', testCode: null, testName: 'HDL cholesterol', bodySystem: null, count: 1, latestCollectedOn: '2026-06-20', latestRangeState: 'IN_RANGE', pinned: false },
  ],
  pinned: [],
  minPointsForLine: 2,
};

/** Newest first, as the server sends them. */
const threeReports: LabValue[] = [
  value({ id: 'r3', valueNumeric: 7.6, collectedOn: '2026-06-20', labName: 'City Lab', documentId: 'doc-3', rangeState: 'ABOVE' }),
  value({ id: 'r2', valueNumeric: 5.2, collectedOn: '2025-03-10', labName: 'Campus clinic', documentId: 'doc-2', rangeState: 'IN_RANGE' }),
  value({ id: 'r1', valueNumeric: 6.1, collectedOn: '2023-12-05', labName: 'City Lab', documentId: 'doc-1', rangeState: 'ABOVE' }),
];

const trend = (items: LabValue[], extra: Record<string, unknown> = {}) => ({ testKey: HBA1C, testName: 'HbA1c', items, pinned: false, minPointsForLine: 2, ...extra });

function links(): M2TrendsLinks { return { back: vi.fn(), upload: vi.fn() }; }

async function mount(routes: Record<string, unknown>, reviews: ReportReview[] | null = [], online = true) {
  const { repo, request } = setup(routes);
  const vm = new TrendsViewModel(repo);
  const l = links();
  const utils = render(<LanguageProvider><M2TrendsView vm={vm} reviews={reviews} online={online} links={l} /></LanguageProvider>);
  await act(async () => { await vm.load(); });
  return { vm, request, links: l, ...utils };
}

const base = (items: LabValue[] = threeReports, extra: Record<string, unknown> = {}) => ({
  'GET /health/lab-results/tests': chips,
  [`GET /health/lab-results/trends?test=${encodeURIComponent(HBA1C)}`]: trend(items, extra),
});

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => cleanup());

describe('M2Trends pure helpers', () => {
  it('places the latest value against its own printed range, one- or two-sided', () => {
    expect(rangeBar({ valueNumeric: 7.6, refLow: 4, refHigh: 5.6 })).toEqual({ zones: ['low', 'range', 'high'], marker: 98 });
    expect(rangeBar({ valueNumeric: 4.8, refLow: 4, refHigh: 5.6 })?.marker).toBeCloseTo(50);
    expect(rangeBar({ valueNumeric: 150, refLow: null, refHigh: 200 })?.zones).toEqual(['range', 'high']);
    expect(rangeBar({ valueNumeric: 50, refLow: 40, refHigh: null })?.zones).toEqual(['low', 'range']);
    expect(rangeBar({ valueNumeric: 5, refLow: null, refHigh: null })).toBeNull();
    expect(rangeBar({ valueNumeric: null, refLow: 4, refHigh: 5.6 })?.marker).toBeNull();
  });

  it('takes the doctor’s steps only from an approved review of a report these values come from', () => {
    const steps = [{ text: 'Walk after lunch', kind: 'ACTIVITY' as const, often: 'Daily', when: '15 min' }];
    const review = (over: Partial<ReportReview>): ReportReview => ({
      id: 'rv', documentId: 'doc-3', status: 'APPROVED', version: 1, reviewedBy: 'd1', reviewedAt: 100,
      guidance: { summary: '', questions: [], nextSteps: ['Walk after lunch'], steps, sourceRefs: [] }, ...over,
    });
    expect(stepsForTest([review({})], threeReports)?.steps).toEqual(steps);
    expect(stepsForTest([review({ documentId: 'someone-else' })], threeReports)).toBeNull();
    expect(stepsForTest([review({ status: 'ASSIGNED', guidance: null })], threeReports)).toBeNull();
    expect(stepsForTest([review({ id: 'old', reviewedAt: 50 }), review({ id: 'new', reviewedAt: 200 })], threeReports)?.reviewId).toBe('new');
    expect([stepIcon('ACTIVITY'), stepIcon('FOOD'), stepIcon('TEST'), stepIcon('OTHER')]).toEqual(['walk', 'bowl', 'flask', null]);
  });

  it('draws a line only from the minimum, and the band only where given', () => {
    const pts = [{ key: 'a', value: 1, tone: 'positive' as const, dateLabel: 'a', valueLabel: '1' }];
    const one = trendGeometry(pts, { low: 0, high: 2 }, false);
    expect(one.linePath).toBe('');
    expect(one.band).not.toBeNull();
    const two = trendGeometry([...pts, { ...pts[0], key: 'b', value: 3 }], null, true);
    expect(two.linePath).toMatch(/^M.* L/);
    expect(two.band).toBeNull();
    expect(two.lineLength).toBeGreaterThan(0);
  });
});

describe('M2Trends', () => {
  it('draws the chips, the latest value with its badge, the range bar and the chart with a matching text alternative', async () => {
    await mount(base());
    expect(screen.getByRole('heading', { name: 'Trends' })).toBeInTheDocument();
    expect(screen.getByTestId('m2-trends-span')).toHaveTextContent('3 reports · 2023 to 2026');
    const chip = screen.getByRole('button', { name: 'HbA1c, latest value Above range' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'HDL cholesterol, latest value In range' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('m2-trends-latest')).toHaveTextContent('7.6');
    expect(screen.getByTestId('m2-trends-badge')).toHaveTextContent('Above range');
    expect(screen.getByTestId('m2-trends-marker')).toBeInTheDocument();
    const chart = screen.getByRole('img', { name: /^HbA1c over time:/ });
    const name = chart.getAttribute('aria-label') ?? '';
    // Oldest first, every plotted value, with its unit.
    expect(name.indexOf('6.1 %')).toBeLessThan(name.indexOf('5.2 %'));
    expect(name.indexOf('5.2 %')).toBeLessThan(name.indexOf('7.6 %'));
    const points = chart.querySelectorAll('[data-part="point"]');
    expect([...points].map((p) => p.getAttribute('data-tone'))).toEqual(['attention', 'positive', 'attention']);
    expect(chart.querySelector('[data-part="line"]')).not.toBeNull();
    expect(chart.querySelector('[data-part="band"]')).not.toBeNull();
    expect(chart.querySelector('[data-part="area"]')).toBeNull();
    expect(screen.getByText(/^Values you confirmed from your reports/)).toBeInTheDocument();
  });

  it('never draws red: out of range is amber, in range green', async () => {
    await mount(base());
    const badge = screen.getByTestId('m2-trends-badge');
    expect(badge.getAttribute('style') ?? '').toContain(color.attentionBg);
    expect(document.body.innerHTML).not.toContain('--sk-color-danger');
  });

  it('colours each point by its own row and drops the band when two labs printed different ranges', async () => {
    const items = [
      value({ id: 'a', valueNumeric: 5.9, collectedOn: '2026-06-20', refLow: 4, refHigh: 6, refText: '4 - 6', rangeState: 'IN_RANGE', documentId: 'd2' }),
      value({ id: 'b', valueNumeric: 5.9, collectedOn: '2025-01-10', refLow: 4, refHigh: 5.6, refText: '4.0 - 5.6', rangeState: 'ABOVE', documentId: 'd1' }),
    ];
    await mount(base(items));
    const chart = screen.getByRole('img', { name: /over time/ });
    expect([...chart.querySelectorAll('[data-part="point"]')].map((p) => p.getAttribute('data-tone'))).toEqual(['attention', 'positive']);
    expect(chart.querySelector('[data-part="band"]')).toBeNull();
    expect(screen.getByTestId('m2-trends-mixed')).toBeInTheDocument();
  });

  it('does not plot a value in another unit or a written result, and keeps it in the table', async () => {
    const items = [
      value({ id: 'n', valueNumeric: 7.6, collectedOn: '2026-06-20', unit: '%' }),
      value({ id: 'm', valueNumeric: 60, collectedOn: '2025-06-20', unit: 'mmol/mol', refLow: null, refHigh: null, refText: '', rangeState: 'NO_RANGE' }),
      value({ id: 't', valueNumeric: null, valueText: 'Pending', collectedOn: '2024-06-20', refLow: null, refHigh: null, refText: '', rangeState: 'NO_RANGE' }),
    ];
    await mount(base(items));
    expect(screen.getByRole('img', { name: /over time/ }).querySelectorAll('[data-part="point"]')).toHaveLength(1);
    expect(screen.getByTestId('m2-trends-not-plotted')).toHaveTextContent('2 values are in the table only');
    expect(screen.getByTestId('m2-trends-few')).toHaveTextContent('Too few reports for a trend');
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
    const table = screen.getByTestId('m2-trends-table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('60 mmol/mol')).toBeInTheDocument();
    expect(within(table).getByText('Pending %')).toBeInTheDocument();
  });

  it('shows one report as a single value with no line', async () => {
    await mount(base([threeReports[0] as LabValue]));
    const chart = screen.getByRole('img', { name: /over time/ });
    expect(chart.querySelector('[data-part="line"]')).toBeNull();
    expect(screen.getByTestId('m2-trends-few')).toBeInTheDocument();
    expect(screen.getByTestId('m2-trends-span')).toHaveTextContent('1 report · 2026');
  });

  it('never shows a draft value, even if a response carried one', async () => {
    await mount(base([...threeReports, value({ id: 'draft', valueNumeric: 9.9, status: 'DRAFT', collectedOn: '2026-07-01' })]));
    expect(screen.getByTestId('m2-trends-latest')).toHaveTextContent('7.6');
    expect(screen.queryByText(/9\.9/)).toBeNull();
  });

  it('switches test and redraws from that test’s own trend', async () => {
    const { request } = await mount({
      ...base(),
      'GET /health/lab-results/trends?test=name%3Ahdl': { testKey: 'name:hdl', testName: 'HDL cholesterol', pinned: false, minPointsForLine: 2,
        items: [value({ id: 'h1', testKey: 'name:hdl', testName: 'HDL cholesterol', valueNumeric: 52, unit: 'mg/dL', refLow: 40, refHigh: 60, refText: '40 - 60', rangeState: 'IN_RANGE' })] },
    });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^HDL cholesterol/ })); });
    await waitFor(() => expect(screen.getByTestId('m2-trends-latest')).toHaveTextContent('52'));
    expect(screen.getByTestId('m2-trends-badge')).toHaveTextContent('In range');
    expect(request.mock.calls.some(([p]) => String(p).includes('name%3Ahdl'))).toBe(true);
  });

  it('bookmarks on the server and shows only what the server saved', async () => {
    const { request } = await mount({ ...base(), 'PUT /health/lab-results/pinned': (body: { codes: string[] }) => ({ codes: body.codes, max: 8 }) });
    const bookmark = screen.getByRole('button', { name: 'Bookmark HbA1c' });
    expect(bookmark).toHaveAttribute('aria-pressed', 'false');
    await act(async () => { fireEvent.click(bookmark); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bookmark HbA1c' })).toHaveAttribute('aria-pressed', 'true'));
    const put = request.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
    expect(JSON.parse(String((put?.[1] as RequestInit).body))).toEqual({ codes: [HBA1C] });
  });

  it('keeps the bookmark off and says so when the server refuses', async () => {
    await mount({ ...base(), 'PUT /health/lab-results/pinned': new ApiError('You can bookmark up to 8 tests.', 422) });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Bookmark HbA1c' })); });
    await waitFor(() => expect(screen.getByTestId('m2-trends-pin-error')).toHaveTextContent('You can bookmark up to 8 tests.'));
    expect(screen.getByRole('button', { name: 'Bookmark HbA1c' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the doctor’s steps verbatim with their icons, and hides the section without them', async () => {
    const review: ReportReview = {
      id: 'rv1', documentId: 'doc-3', status: 'APPROVED', version: 1, reviewedBy: 'd1', reviewedAt: 1750000000,
      guidance: { summary: 'x', questions: [], nextSteps: [], sourceRefs: [], steps: [
        { text: 'Walk after lunch and dinner', kind: 'ACTIVITY', often: 'Daily', when: '15 min' },
        { text: 'Fewer fried foods', kind: 'FOOD', often: 'Most days', when: null },
        { text: 'Talk to me at your next visit', kind: 'OTHER', often: null, when: null },
      ] },
    };
    await mount(base(), [review]);
    const steps = screen.getByTestId('m2-trends-steps');
    expect(within(steps).getByRole('heading', { name: 'Your doctor’s 3 steps' })).toBeInTheDocument();
    expect(within(steps).getByText('Walk after lunch and dinner')).toBeInTheDocument();
    expect(within(steps).getByText('Daily')).toBeInTheDocument();
    expect(within(steps).getByText('15 min')).toBeInTheDocument();
    expect(steps.querySelector('[data-icon="walk"]')).not.toBeNull();
    expect(steps.querySelector('[data-icon="bowl"]')).not.toBeNull();
    expect(within(steps).getByText(/^reviewed /)).toBeInTheDocument();
    cleanup();
    await mount(base(), []);
    expect(screen.queryByTestId('m2-trends-steps')).toBeNull();
  });

  it('first time: no stored values leads to Add a lab report', async () => {
    const { links: l } = await mount({ 'GET /health/lab-results/tests': { items: [], pinned: [], minPointsForLine: 2 } });
    expect(screen.getByRole('heading', { name: 'No values from your reports yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Add a lab report' }));
    expect(l.upload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /^Bookmark/ })).toBeNull();
  });

  it('error with retry; offline banner', async () => {
    const { vm } = await mount({ 'GET /health/lab-results/tests': new ApiError('down', 503) }, [], false);
    expect(vm.phase).toBe('error');
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load your trends');
    expect(screen.getByRole('status')).toHaveTextContent('You’re offline');
  });

  it('draws the line in only when motion is allowed', async () => {
    motionFlag.reduced = false;
    await mount(base());
    const line = screen.getByRole('img', { name: /over time/ }).querySelector('[data-part="line"]');
    expect(line?.getAttribute('style') ?? '').toContain('stroke-dashoffset');
    cleanup();
    motionFlag.reduced = true;
    await mount(base());
    const still = screen.getByRole('img', { name: /over time/ });
    expect(still.querySelector('svg')?.getAttribute('data-reduced')).toBe('true');
    expect(still.querySelector('[data-part="line"]')?.getAttribute('stroke-dashoffset')).toBe('0');
    expect(still.querySelector('[data-part="line"]')?.getAttribute('style') ?? '').not.toContain('transition');
  });

  it('back goes to My health, and the screen passes axe', async () => {
    const { links: l, container } = await mount(base());
    fireEvent.click(screen.getByRole('button', { name: 'Back to My health' }));
    expect(l.back).toHaveBeenCalledTimes(1);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
