import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { LabResultsRepository } from '../../data/LabResultsRepository';
import type { ConfirmResult, LabValue } from '../../data/LabResultsRepository';
import { ReportUploadViewModel } from '../../viewmodel/ReportUploadViewModel';
import type { PickedReport } from '../../viewmodel/ReportUploadViewModel';
import { value } from '../../viewmodel/__tests__/labFixtures';
import { M2ReportUploadView } from '../M2ReportUploadView';
import type { ReportSources } from '../M2ReportUploadView';

type Requester = typeof import('@/data/services/http').apiRequest;

function setup(routes: Record<string, unknown>) {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    const answer = routes[`${init?.method ?? 'GET'} ${path}`];
    if (answer instanceof Error) throw answer;
    if (typeof answer === 'function') {
      const body = init?.body instanceof FormData ? init.body : init?.body ? JSON.parse(String(init.body)) : null;
      return (answer as (b: unknown) => unknown)(body);
    }
    if (answer === undefined) throw new ApiError(`no route ${init?.method ?? 'GET'} ${path}`, 404);
    return answer;
  }) as unknown as Requester & ReturnType<typeof vi.fn>;
  return { request, repo: new LabResultsRepository(request) };
}

const calls = (request: ReturnType<typeof vi.fn>, key: string) =>
  request.mock.calls.filter(([path, init]) => `${(init as RequestInit | undefined)?.method ?? 'GET'} ${path}` === key);

const DOC = 'doc-9';
const picked: PickedReport = { name: 'report.jpg', append: (form) => form.append('file', new Blob(['x'], { type: 'image/jpeg' }), 'report.jpg') };

function checkRoutes(extra: Record<string, unknown> = {}) {
  return {
    'POST /health/documents': { id: DOC, intakeId: 'int_1' },
    [`GET /health/documents/${DOC}/lab-results`]: { documentId: DOC, items: [], maxRows: 60 },
    'GET /lab-tests/reference': { items: [{ code: '4548-4', displayName: 'HbA1c', bodySystem: 'BLOOD_SUGAR', defaultUnit: '%' }] },
    ...extra,
  };
}

async function mount(routes: Record<string, unknown>, opts: { sources?: Partial<ReportSources>; online?: boolean } = {}) {
  const { request, repo } = setup(routes);
  const vm = new ReportUploadViewModel('Lab report', request, repo);
  const links = { back: vi.fn(), trends: vi.fn() };
  const sources: ReportSources = { photo: vi.fn(), pdf: vi.fn(), ...opts.sources };
  const utils = render(<LanguageProvider><M2ReportUploadView vm={vm} sources={sources} online={opts.online ?? true} links={links} /></LanguageProvider>);
  return { vm, request, links, sources, ...utils };
}

function type(testID: string, text: string) {
  fireEvent.change(screen.getByTestId(testID), { target: { value: text } });
}

afterEach(() => cleanup());

describe('M2ReportUpload · Add', () => {
  it('shows Add · Check · Saved with no Read step, the three sources and the vault promise', async () => {
    const { sources } = await mount(checkRoutes());
    const stepper = screen.getByTestId('m2-upload-stepper');
    expect(stepper).toHaveAttribute('aria-label', 'Step 1 of 3: Add');
    expect(within(stepper).queryByText('Read')).toBeNull();
    expect(screen.queryByText(/Reading your report/)).toBeNull();
    expect(screen.getByText('Your report stays in your vault. It is never used to sell you anything.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Take a photo/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Upload a PDF/ }));
    expect(sources.photo).toHaveBeenCalledTimes(1);
    expect(sources.pdf).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('m2-upload-photo').querySelector('[data-icon="camera-2"]')).not.toBeNull();
    expect(screen.getByTestId('m2-upload-pdf').querySelector('[data-icon="doc-upload"]')).not.toBeNull();
  });

  it('shows a source this device cannot use as not available, not as a button', async () => {
    await mount(checkRoutes(), { sources: { pdf: null } });
    expect(screen.queryByRole('button', { name: /^Upload a PDF/ })).toBeNull();
    expect(screen.getByTestId('m2-upload-pdf')).toHaveAttribute('aria-label', 'Upload a PDF. Not available in the app yet. Use the website.');
  });

  it('offline: nothing can be sent, with a banner', async () => {
    await mount(checkRoutes(), { online: false });
    expect(screen.getByRole('status')).toHaveTextContent('You’re offline');
    expect(screen.queryByRole('button', { name: /^Take a photo|^Upload a PDF|^From a StudentKare lab/ })).toBeNull();
  });

  it('uploads the file as a LAB record and opens Check; a refused upload shows the server’s message', async () => {
    const ok = await mount(checkRoutes());
    await act(async () => { await ok.vm.upload(picked); });
    const [post] = calls(ok.request, 'POST /health/documents');
    const form = (post?.[1] as RequestInit).body as FormData;
    expect(form.get('category')).toBe('LAB');
    expect(form.get('title')).toBe('Lab report');
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(screen.getByTestId('m2-upload-stepper')).toHaveAttribute('aria-label', 'Step 2 of 3: Check');
    cleanup();
    const bad = await mount(checkRoutes({ 'POST /health/documents': new ApiError('Upload a valid PDF, PNG, or JPEG file.', 422) }));
    await act(async () => { await bad.vm.upload(picked); });
    expect(screen.getByTestId('m2-upload-failed')).toHaveTextContent('Upload a valid PDF, PNG, or JPEG file.');
    expect(bad.vm.step).toBe('add');
  });

  it('still works after a StrictMode unmount and remount disposed it once', async () => {
    const { vm } = await mount(checkRoutes({ 'GET /lab-orders?limit=50': { items: [] } }));
    vm.dispose();
    await act(async () => { await vm.showLabs(); });
    expect(vm.labsPhase).toBe('ready');
    expect(screen.getByTestId('m2-upload-labs-empty')).toBeInTheDocument();
  });

  it('From a StudentKare lab lists only released reports and opens Check on that report', async () => {
    const { vm, request } = await mount(checkRoutes({
      'GET /lab-orders?limit=50': { items: [
        { id: 'o1', testPanel: ['HbA1c', 'Lipid profile'], status: 'REPORT_RELEASED', reportDocumentId: DOC, reviewedAt: 1750000000, updatedAt: 1750000000 },
        { id: 'o2', testPanel: ['CBC'], status: 'REPORT_READY', reportDocumentId: '', reviewedAt: null, updatedAt: 1750000000 },
      ] },
    }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^From a StudentKare lab/ })); });
    await waitFor(() => expect(screen.getByTestId('m2-upload-lab-o1')).toBeInTheDocument());
    expect(screen.queryByTestId('m2-upload-lab-o2')).toBeNull();
    await act(async () => { fireEvent.click(screen.getByTestId('m2-upload-lab-o1')); });
    await waitFor(() => expect(vm.check?.step).toBe('check'));
    expect(calls(request, 'POST /health/documents')).toHaveLength(0);
  });
});

describe('M2ReportUpload · Check and Saved', () => {
  async function toCheck(extra: Record<string, unknown> = {}) {
    const mounted = await mount(checkRoutes(extra));
    await act(async () => { await mounted.vm.upload(picked); });
    return mounted;
  }

  it('starts with no rows, and a typed row starts unticked; nothing saves until a row is ticked', async () => {
    const { request } = await toCheck();
    expect(screen.getByTestId('m2-upload-no-rows')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add the first value' }));
    const tick = screen.getByRole('checkbox', { name: 'Save Value 1' });
    expect(tick).toHaveAttribute('aria-checked', 'false');
    type('m2-upload-date', '2026-06-20');
    type('m2-upload-lab-name', 'City Lab');
    type('m2-upload-test-0', 'HbA1c');
    type('m2-upload-value-0', '7.6');
    type('m2-upload-unit-0', '%');
    const save = screen.getByTestId('m2-upload-save');
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('m2-upload-ticked')).toHaveTextContent('Tick at least one value to save it.');
    fireEvent.click(save);
    expect(calls(request, `POST /health/documents/${DOC}/lab-results`)).toHaveLength(0);
  });

  it('saves only ticked rows, then shows the server’s counts with a plain tick', async () => {
    const saved: LabValue[] = [value({ id: 's1', documentId: DOC, rangeState: 'ABOVE' })];
    const result: ConfirmResult = { documentId: DOC, confirmed: 1, discarded: 1, rangeCounts: { IN_RANGE: 0, ABOVE: 1, BELOW: 0, NO_RANGE: 0 }, outsideRange: 1, items: saved };
    const { request, links: l } = await toCheck({
      [`POST /health/documents/${DOC}/lab-results`]: (body: { rows: unknown[] }) => ({ documentId: DOC, items: body.rows.map((_, i) => value({ id: `d${i}`, status: 'DRAFT' })) }),
      [`POST /health/documents/${DOC}/lab-results/confirm`]: result,
      'POST /preventive/report-reviews': { id: 'rv', documentId: DOC, status: 'REQUESTED', version: 1, reviewedBy: null, reviewedAt: null, guidance: null },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add the first value' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another value' }));
    type('m2-upload-date', '2026-06-20');
    type('m2-upload-lab-name', 'City Lab');
    type('m2-upload-test-0', 'HbA1c');
    type('m2-upload-value-0', '7.6');
    type('m2-upload-low-0', '4');
    type('m2-upload-high-0', '5.6');
    type('m2-upload-test-1', 'TSH');
    type('m2-upload-value-1', '2.1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save HbA1c' }));
    expect(screen.getByRole('checkbox', { name: 'Save HbA1c' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Save 1 value to my record' })).not.toHaveAttribute('aria-disabled', 'true');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save 1 value to my record' })); });
    await waitFor(() => expect(screen.getByTestId('m2-upload-saved')).toBeInTheDocument());
    const [drafts] = calls(request, `POST /health/documents/${DOC}/lab-results`);
    const sent = JSON.parse(String((drafts?.[1] as RequestInit).body));
    expect(sent.rows).toHaveLength(1);
    expect(sent.rows[0]).toMatchObject({ testName: 'HbA1c', valueNumeric: 7.6, refLow: 4, refHigh: 5.6 });
    const [confirm] = calls(request, `POST /health/documents/${DOC}/lab-results/confirm`);
    expect(JSON.parse(String((confirm?.[1] as RequestInit).body))).toEqual({ ids: ['d0'] });
    expect(screen.getByTestId('m2-upload-saved-summary')).toHaveTextContent('1 value from City Lab, 20 Jun 2026. 1 is outside the lab’s range.');
    expect(screen.getByText('1 unticked value was not saved.')).toBeInTheDocument();
    expect(screen.getByTestId('m2-upload-stepper')).toHaveAttribute('aria-label', 'Step 3 of 3: Saved');
    expect(screen.getByTestId('m2-upload-saved').querySelector('[data-icon="check"]')).not.toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ask a doctor to explain it' })); });
    const [review] = calls(request, 'POST /preventive/report-reviews');
    expect(JSON.parse(String((review?.[1] as RequestInit).body))).toEqual({ documentId: DOC });
    await waitFor(() => expect(screen.getByTestId('m2-upload-review-asked')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'See my trends' }));
    expect(l.trends).toHaveBeenCalledTimes(1);
  });

  it('shows row problems and a refused save (all or nothing) with the server’s message', async () => {
    await toCheck({
      [`POST /health/documents/${DOC}/lab-results`]: (body: { rows: unknown[] }) => ({ documentId: DOC, items: body.rows.map((_, i) => value({ id: `d${i}`, status: 'DRAFT' })) }),
      [`POST /health/documents/${DOC}/lab-results/confirm`]: new ApiError('These values changed while you were saving. Nothing was saved.', 409),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add the first value' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save Value 1' }));
    expect(screen.getByTestId('m2-upload-problems-0')).toHaveTextContent('Type the test’s name.');
    type('m2-upload-date', '2026-06-20');
    type('m2-upload-test-0', 'HbA1c');
    type('m2-upload-value-0', '7.6');
    type('m2-upload-low-0', '6');
    type('m2-upload-high-0', '4');
    expect(screen.getByTestId('m2-upload-problems-0')).toHaveTextContent('Check the range');
    type('m2-upload-low-0', '4');
    type('m2-upload-high-0', '6');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save 1 value to my record' })); });
    await waitFor(() => expect(screen.getByTestId('m2-upload-save-error')).toHaveTextContent('These values changed while you were saving. Nothing was saved.'));
    expect(screen.queryByTestId('m2-upload-saved')).toBeNull();
  });

  it('offers the reference list as suggestions and fills the usual unit', async () => {
    const { vm } = await toCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Add the first value' }));
    type('m2-upload-test-0', 'hba');
    fireEvent.click(screen.getByRole('button', { name: 'Use HbA1c from the list' }));
    expect(vm.check?.rows[0]).toMatchObject({ testCode: '4548-4', unit: '%' });
  });

  it('passes axe on Add and on Check', async () => {
    const { vm, container } = await mount(checkRoutes());
    let violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    await act(async () => { await vm.upload(picked); });
    fireEvent.click(screen.getByRole('button', { name: 'Add the first value' }));
    violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

// ── Wide (Tier 1 parity plan 2026-10-24 §1, §5) ────────────────────────────────

describe('M2ReportUpload wide (desktop web shell)', () => {
  function view(vm: ReportUploadViewModel, wide: boolean, online = true) {
    return <LanguageProvider><M2ReportUploadView vm={vm} sources={{ photo: vi.fn(), pdf: vi.fn() }} online={online} links={{ back: vi.fn(), trends: vi.fn() }} wide={wide} /></LanguageProvider>;
  }

  it('puts the stepper and the sources on the left and the step’s card on the right, with no SOS of its own', async () => {
    const { request, repo } = setup(checkRoutes());
    const { container } = render(view(new ReportUploadViewModel('Lab report', request, repo), true));
    const split = screen.getByTestId('m2-upload-split');
    expect(split).toContainElement(screen.getByTestId('m2-upload-stepper'));
    expect(split).toContainElement(screen.getByTestId('m2-upload-photo'));
    expect(split).toContainElement(screen.getByTestId('m2-upload-hero'));
    expect(screen.queryByRole('button', { name: /SOS/i })).toBeNull();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('offline disables all three sources at the desktop layout', () => {
    const { request, repo } = setup(checkRoutes());
    render(view(new ReportUploadViewModel('Lab report', request, repo), true, false));
    expect(screen.queryByRole('button', { name: /^Take a photo|^Upload a PDF|^From a StudentKare lab/ })).toBeNull();
    expect(screen.getByTestId('m2-upload-lab')).toHaveAttribute('aria-label', expect.stringContaining('Needs a connection'));
  });

  it('keeps a half-filled Check form when the layout changes, and Save stays off until a row is valid at both layouts', async () => {
    const { request, repo } = setup(checkRoutes());
    const vm = new ReportUploadViewModel('Lab report', request, repo);
    const { rerender } = render(view(vm, false));
    await act(async () => { await vm.upload(picked); });
    fireEvent.click(screen.getByRole('button', { name: 'Add the first value' }));
    type('m2-upload-date', '2026-06-20');
    type('m2-upload-test-0', 'HbA1c');
    type('m2-upload-value-0', '7.6');
    expect(screen.getByTestId('m2-upload-save')).toHaveAttribute('aria-disabled', 'true');
    rerender(view(vm, true));
    expect(screen.getByTestId('m2-upload-split')).toContainElement(screen.getByTestId('m2-upload-row-0'));
    expect(screen.getByTestId('m2-upload-test-0')).toHaveValue('HbA1c');
    expect(screen.getByTestId('m2-upload-value-0')).toHaveValue('7.6');
    expect(screen.getByTestId('m2-upload-date')).toHaveValue('2026-06-20');
    expect(screen.getByTestId('m2-upload-save')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save HbA1c' }));
    type('m2-upload-unit-0', '%');
    await waitFor(() => expect(screen.getByTestId('m2-upload-save')).not.toHaveAttribute('aria-disabled', 'true'));
    rerender(view(vm, false));
    expect(screen.queryByTestId('m2-upload-split')).toBeNull();
    expect(screen.getByTestId('m2-upload-value-0')).toHaveValue('7.6');
    expect(screen.getByTestId('m2-upload-save')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('an invalid report date is called out at the desktop layout', async () => {
    const { request, repo } = setup(checkRoutes());
    const vm = new ReportUploadViewModel('Lab report', request, repo);
    render(view(vm, true));
    await act(async () => { await vm.upload(picked); });
    type('m2-upload-date', '2026-13-40');
    expect(screen.getByText('Enter the date as year-month-day, for example 2026-06-20.')).toBeInTheDocument();
  });
});
