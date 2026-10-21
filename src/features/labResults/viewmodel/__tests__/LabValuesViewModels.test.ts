import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { LabResultsRepository } from '../../data/LabResultsRepository';
import { InsightsValuesViewModel, ReportCheckViewModel, TrendsViewModel } from '../LabValuesViewModels';
import { list, value } from './labFixtures';

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

const calls = (request: ReturnType<typeof vi.fn>, key: string) =>
  request.mock.calls.filter(([path, init]) => `${(init as RequestInit | undefined)?.method ?? 'GET'} ${path}` === key);

describe('InsightsValuesViewModel', () => {
  it('shows the latest report with the server counts and toggles the count cards', async () => {
    const { repo } = setup({ 'GET /health/lab-results': list([value(), value({ rangeState: 'IN_RANGE' })]) });
    const vm = new InsightsValuesViewModel(repo);
    await vm.load();
    expect(vm.phase).toBe('ready');
    expect([vm.needsLookCount, vm.inRangeCount]).toEqual([1, 1]);
    vm.toggleFilter('needsLook');
    expect(vm.rows).toHaveLength(1);
    vm.toggleFilter('needsLook');
    expect(vm.filter).toBe('all');
  });

  it('is empty with no stored values and an error when the call fails', async () => {
    const empty = new InsightsValuesViewModel(setup({ 'GET /health/lab-results': list([]) }).repo);
    await empty.load();
    expect(empty.phase).toBe('empty');
    const failing = new InsightsValuesViewModel(setup({ 'GET /health/lab-results': new ApiError('down', 503) }).repo);
    await failing.load();
    expect(failing.phase).toBe('error');
  });
});

describe('TrendsViewModel', () => {
  const chips = {
    items: [
      { testKey: '4548-4', testCode: '4548-4', testName: 'HbA1c', bodySystem: 'BLOOD_SUGAR', count: 2,
        latestCollectedOn: '2026-06-20', latestRangeState: 'ABOVE', pinned: true },
      { testKey: 'name:hdl', testCode: null, testName: 'HDL', bodySystem: null, count: 1,
        latestCollectedOn: '2026-06-20', latestRangeState: 'IN_RANGE', pinned: false },
    ],
    pinned: ['4548-4'],
    minPointsForLine: 2,
  };

  it('opens the bookmarked test first and builds the chart view from its rows', async () => {
    const { repo, request } = setup({
      'GET /health/lab-results/tests': chips,
      'GET /health/lab-results/trends?test=4548-4': { testKey: '4548-4', testName: 'HbA1c', pinned: true,
        minPointsForLine: 2, items: [value(), value({ collectedOn: '2025-06-20' })] },
    });
    const vm = new TrendsViewModel(repo);
    await vm.load();
    expect(vm.selectedKey).toBe('4548-4');
    expect(vm.view?.points).toHaveLength(2);
    expect(vm.view?.drawLine).toBe(true);
    expect(calls(request, 'GET /health/lab-results/trends?test=4548-4')).toHaveLength(1);
  });

  it('encodes a printed-name key and keeps bookmarks to what the server saved', async () => {
    const { repo, request } = setup({
      'GET /health/lab-results/tests': chips,
      'GET /health/lab-results/trends?test=name%3Ahdl': { testKey: 'name:hdl', testName: 'HDL', pinned: false,
        minPointsForLine: 2, items: [value({ testKey: 'name:hdl' })] },
      'PUT /health/lab-results/pinned': (body: { codes: string[] }) => ({ codes: body.codes, max: 8 }),
    });
    const vm = new TrendsViewModel(repo);
    await vm.load('name:hdl');
    expect(vm.selectedKey).toBe('name:hdl');
    await vm.togglePin();
    expect(vm.pinned).toEqual(['4548-4', 'name:hdl']);
    expect(vm.tests.every(t => t.pinned)).toBe(true);
    expect(calls(request, 'PUT /health/lab-results/pinned')).toHaveLength(1);
  });

  it('a refused bookmark leaves the list as the server had it', async () => {
    const { repo } = setup({
      'GET /health/lab-results/tests': chips,
      'GET /health/lab-results/trends?test=4548-4': { testKey: '4548-4', testName: 'HbA1c', pinned: true,
        minPointsForLine: 2, items: [value()] },
      'PUT /health/lab-results/pinned': new ApiError('You have bookmarked as many tests as you can.', 422),
    });
    const vm = new TrendsViewModel(repo);
    await vm.load();
    await vm.togglePin();
    expect(vm.pinned).toEqual(['4548-4']);
    expect(vm.pinError).toContain('bookmarked');
    expect(vm.pinSaving).toBe(false);
  });

  it('is empty when nothing is stored', async () => {
    const vm = new TrendsViewModel(setup({ 'GET /health/lab-results/tests': { items: [], pinned: [], minPointsForLine: 2 } }).repo);
    await vm.load();
    expect(vm.phase).toBe('empty');
    expect(vm.trendPhase).toBe('idle');
  });
});

describe('ReportCheckViewModel', () => {
  const LIMITS = { valueAbsMax: 1e7 };
  const base = {
    'GET /health/documents/doc-1/lab-results': { documentId: 'doc-1', items: [], maxRows: 3 },
    'GET /lab-tests/reference': { items: [{ code: '4548-4', displayName: 'HbA1c', bodySystem: 'BLOOD_SUGAR', defaultUnit: '%' }] },
  };

  async function ready(routes: Record<string, unknown>) {
    const { repo, request } = setup({ ...base, ...routes });
    const vm = new ReportCheckViewModel('doc-1', LIMITS, repo);
    await vm.load();
    vm.setReport({ collectedOn: '2026-06-20', labName: 'City Lab' });
    vm.addRow();
    const id = vm.rows[0]?.localId ?? '';
    vm.chooseTest(id, '4548-4');
    vm.updateRow(id, { value: '6.1', refLow: '4.0', refHigh: '5.6' });
    return { vm, request, id };
  }

  it('starts every typed row unticked and saves nothing until a row is ticked', async () => {
    const { vm, id } = await ready({});
    expect(vm.rows[0]).toMatchObject({ ticked: false, testCode: '4548-4', unit: '%' });
    expect(vm.canSave).toBe(false);
    vm.setTicked(id, true);
    expect(vm.canSave).toBe(true);
  });

  it('drafts only the ticked rows, then confirms exactly those ids', async () => {
    const confirmed = { documentId: 'doc-1', confirmed: 1, discarded: 0, outsideRange: 1,
      rangeCounts: { IN_RANGE: 0, ABOVE: 1, BELOW: 0, NO_RANGE: 0 }, items: [value({ id: 'srv-1' })] };
    const { vm, request, id } = await ready({
      'POST /health/documents/doc-1/lab-results': (body: { rows: unknown[] }) => ({
        documentId: 'doc-1', items: body.rows.map((_, i) => value({ id: `srv-${i + 1}`, status: 'DRAFT' })) }),
      'POST /health/documents/doc-1/lab-results/confirm': confirmed,
    });
    vm.addRow();   // a second row, left unticked and incomplete: never sent
    vm.setTicked(id, true);
    await vm.save();
    expect(vm.step).toBe('saved');
    expect(vm.result?.outsideRange).toBe(1);
    const [, draftInit] = calls(request, 'POST /health/documents/doc-1/lab-results')[0] ?? [];
    expect(JSON.parse(String((draftInit as RequestInit).body)).rows).toHaveLength(1);
    const [, confirmInit] = calls(request, 'POST /health/documents/doc-1/lab-results/confirm')[0] ?? [];
    expect(JSON.parse(String((confirmInit as RequestInit).body))).toEqual({ ids: ['srv-1'] });
  });

  it('a refused confirm (409) is shown with the server message and nothing is marked saved', async () => {
    const { vm, request, id } = await ready({
      'POST /health/documents/doc-1/lab-results': { documentId: 'doc-1', items: [value({ id: 'srv-1', status: 'DRAFT' })] },
      'POST /health/documents/doc-1/lab-results/confirm': new ApiError('Nothing was saved; check them again.', 409),
    });
    vm.setTicked(id, true);
    await vm.save();
    expect(vm.step).toBe('check');
    expect(vm.error).toBe('conflict');
    expect(vm.errorText).toContain('Nothing was saved');
    expect(vm.result).toBeNull();
    // Retrying does not draft the same row twice: it already has its server id.
    await vm.save();
    expect(calls(request, 'POST /health/documents/doc-1/lab-results')).toHaveLength(1);
  });

  it('maps a server validation refusal (422)', async () => {
    const { vm, id } = await ready({
      'POST /health/documents/doc-1/lab-results': new ApiError('Row 1: the report date is in the future.', 422),
    });
    vm.setTicked(id, true);
    await vm.save();
    expect(vm.error).toBe('validation');
    expect(vm.errorText).toContain('future');
  });

  it('resumes drafts already on the server, unticked, and corrects an edited one before confirming', async () => {
    const draft = value({ id: 'srv-9', status: 'DRAFT', valueNumeric: 6.1 });
    const { repo, request } = setup({
      ...base,
      'GET /health/documents/doc-1/lab-results': { documentId: 'doc-1', items: [draft], maxRows: 3 },
      'PATCH /health/lab-results/srv-9': value({ id: 'srv-9', status: 'DRAFT', valueNumeric: 5.2 }),
      'POST /health/documents/doc-1/lab-results/confirm': { documentId: 'doc-1', confirmed: 1, discarded: 0,
        outsideRange: 0, rangeCounts: { IN_RANGE: 1, ABOVE: 0, BELOW: 0, NO_RANGE: 0 }, items: [] },
    });
    const vm = new ReportCheckViewModel('doc-1', LIMITS, repo);
    await vm.load();
    const row = vm.rows[0];
    expect(row).toMatchObject({ serverId: 'srv-9', ticked: false, value: '6.1' });
    vm.updateRow(row?.localId ?? '', { value: '5.2' });
    vm.setTicked(row?.localId ?? '', true);
    await vm.save();
    expect(vm.step).toBe('saved');
    expect(calls(request, 'PATCH /health/lab-results/srv-9')).toHaveLength(1);
    expect(calls(request, 'POST /health/documents/doc-1/lab-results')).toHaveLength(0);
  });

  it('caps rows at the server maximum', async () => {
    const { vm } = await ready({});
    vm.addRow();
    vm.addRow();
    vm.addRow();
    expect(vm.rows).toHaveLength(3);
    expect(vm.canAddRow).toBe(false);
  });
});
