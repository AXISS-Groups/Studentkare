import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Medicine information review (AdminMedicineInfo). Only the HTTP layer is mocked,
 * by "METHOD path". What these prove: a pharmacist approves exactly the value on
 * screen (its hash); a super admin never gets an Approve control but can import;
 * an unsaved edit cannot be approved; the audit history is shown.
 */
const answers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => answers[`${init?.method ?? 'GET'} ${path}`]?.(init) ?? new Promise(() => undefined));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

import { LanguageProvider } from '@/i18n';
import { axeViolations, describeViolations } from '@/test/axe';
import { MedicineInfoReviewView } from '../admin/MedicineInfoReviewView';
import { textToValue, valueToText } from '../viewmodel/MedicineInfoReviewViewModel';
import type { FieldRow, WorkDetail } from '../viewmodel/MedicineInfoReviewViewModel';

const answer = (key: string, value: unknown) => { answers[key] = () => Promise.resolve(value); };
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
const HASH = 'a'.repeat(64);

const field = (over: Partial<FieldRow>): FieldRow => ({
  field: 'uses', kind: 'monograph', value: { items: ['Fever'] }, valueHash: HASH, state: 'UNREVIEWED', shown: false, changedSinceReview: false,
  sourceTitle: 'Approved label', sourceUrl: '', reviewedOn: null, reviewedByYou: false, reviewedBy: null, updatedAt: 1, ...over,
});

const detail = (canApprove: boolean): WorkDetail => ({
  medicine: { id: 'm1', brand: 'Pyrexa 650', composition: 'Paracetamol 650 mg', form: 'TABLET', schedule: 'OTC', source: 'ADMIN', active: true, published: true, reviewedCount: 1, fieldCount: 11, changedCount: 0 },
  fields: [
    field({ field: 'brand', kind: 'identity', value: 'Pyrexa 650', state: 'REVIEWED', shown: true, reviewedOn: '2026-10-22', reviewedByYou: true }),
    field({ field: 'pack', kind: 'identity', value: 'Strip of 10', state: 'REVIEWED', shown: false, changedSinceReview: true }),
    field({}),
  ],
  history: [{ id: 'e1', field: 'brand', action: 'REVIEWED', actorRole: 'PHARMACIST', byYou: true, at: 1_760_000_000 }],
  canApprove, bands: ['ADULT', 'CHILD'], forms: ['TABLET'],
});

beforeEach(() => {
  Object.keys(answers).forEach((key) => delete answers[key]);
  apiRequest.mockClear();
  Object.assign(HTMLDialogElement.prototype, { showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); }, close(this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
afterEach(cleanup);

describe('value text', () => {
  it('reads and writes lines and BAND:FORM:strength age entries', () => {
    expect(valueToText(field({ value: { items: ['A', 'B'] } }))).toBe('A\nB');
    expect(textToValue('uses', ' A \n\nB')).toEqual({ items: ['A', 'B'] });
    expect(textToValue('age_availability', 'ADULT:TABLET:650 mg')).toEqual({ items: [{ band: 'ADULT', form: 'TABLET', strength: '650 mg' }] });
  });
});

describe('pharmacist', () => {
  beforeEach(() => {
    answer('GET /work/medicine-info?state=TO_REVIEW&query=&limit=100', { items: [detail(true).medicine], total: 1, canApprove: true, canImport: false });
    answer('GET /work/medicine-info/m1', detail(true));
  });

  it('approves exactly the value on screen, and sees the history', async () => {
    answers['POST /work/medicine-info/m1/fields/uses/review'] = () => Promise.resolve({ ...detail(true), fields: [field({ state: 'REVIEWED', shown: true, reviewedOn: '2026-10-22', reviewedByYou: true })] });
    const { container } = wrap(<MedicineInfoReviewView console="pharmacy" />);
    fireEvent.click(await screen.findByText('Open'));
    const uses = await screen.findByTestId('mia-field-uses');
    expect(screen.queryByTestId('mia-import')).toBeNull();
    expect(within(screen.getByTestId('mia-history')).getByText(/Approved Brand · you/)).toBeTruthy();
    expect(screen.getByTestId('mia-state-pack').textContent).toBe('Changed since approval');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    fireEvent.click(within(uses).getByTestId('mia-approve-uses'));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/work/medicine-info/m1/fields/uses/review', expect.objectContaining({ method: 'POST', body: JSON.stringify({ valueHash: HASH }) })));
  });

  it('cannot approve an unsaved edit', async () => {
    wrap(<MedicineInfoReviewView console="pharmacy" />);
    fireEvent.click(await screen.findByText('Open'));
    const text = await screen.findByTestId('mia-text-uses');
    fireEvent.change(text, { target: { value: 'Fever\nPain' } });
    expect((screen.getByTestId('mia-approve-uses') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('mia-save-uses') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('super admin', () => {
  beforeEach(() => {
    answer('GET /work/medicine-info?state=TO_REVIEW&query=&limit=100', { items: [detail(false).medicine], total: 1, canApprove: false, canImport: true });
    answer('GET /work/medicine-info/m1', detail(false));
  });

  it('edits and imports but never approves', async () => {
    answers['PUT /work/medicine-info/m1/fields/uses'] = () => Promise.resolve(detail(false));
    wrap(<MedicineInfoReviewView console="admin" />);
    expect(await screen.findByTestId('mia-import')).toBeTruthy();
    expect(screen.getAllByText('Only a pharmacist can approve. You can edit, import and take fields off.').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Open'));
    await screen.findByTestId('mia-field-uses');
    expect(screen.queryByTestId('mia-approve-uses')).toBeNull();
    fireEvent.change(screen.getByTestId('mia-text-uses'), { target: { value: 'Fever\nHeadache' } });
    fireEvent.click(screen.getByTestId('mia-save-uses'));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/work/medicine-info/m1/fields/uses', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ sourceTitle: 'Approved label', sourceUrl: '', value: { items: ['Fever', 'Headache'] } }),
    })));
  });

  it('the import dialog asks for the dataset and its licence', async () => {
    wrap(<MedicineInfoReviewView console="admin" />);
    fireEvent.click(await screen.findByTestId('mia-import'));
    const form = await screen.findByTestId('mia-import-form');
    expect(within(form).getByLabelText('Licence reference')).toBeTruthy();
    expect(form.textContent).toContain('Everything imported lands as not reviewed.');
  });
});
