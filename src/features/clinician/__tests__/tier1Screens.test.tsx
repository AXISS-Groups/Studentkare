import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { translate } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import type { CareAppointment, Request } from '../shared/clinicalData';

import { CriticalResultsViewModel } from '../critical-results/CriticalResultsViewModel';
import { CriticalResultsView } from '../critical-results/CriticalResultsScreen';
import { bySeverity, criticalApiSource, mapCritical } from '../critical-results/criticalModel';
import type { CriticalApiItem, CriticalData, CriticalResult, CriticalSource, UncollectedApiItem } from '../critical-results/criticalModel';

import { EncounterNoteView, EncounterNoteViewModel } from '../encounter-note/EncounterNoteScreen';
import { SignedElsewhere, encounterApiSource } from '../encounter-note/encounterModel';
import type { EncounterData, EncounterNoteApi, EncounterSource } from '../encounter-note/encounterModel';

import { PrescribeViewModel } from '../prescribe/PrescribeViewModel';
import { PrescribeView } from '../prescribe/PrescribeScreen';
import { prescribeApiSource } from '../prescribe/prescribeModel';
import type { DrugEntry, IssueRequest, IssueResult, PrescribeData, PrescribeSource } from '../prescribe/prescribeModel';

import { ReportReviewsView, ReportReviewsViewModel } from '../report-reviews/ReportReviewsScreen';
import { reviewBody, reviewProblems } from '../report-reviews/reviewsModel';
import type { QueueReview, ReviewDraft, ReviewsSource } from '../report-reviews/reviewsModel';

import { ConsultRoomView, ConsultRoomViewModel } from '../consult-room/ConsultRoomScreen';
import { consultApiSource, pickAppointment } from '../consult-room/consultModel';
import type { ConsultData, ConsultSource } from '../consult-room/consultModel';

/* Test fixtures only: no build serves these. */

const en = (key: MessageKey, vars?: Vars) => translate('en', key, vars);

const appt = (over: Partial<CareAppointment> = {}): CareAppointment => ({
  id: 'a1', patientId: 'p1', customer: 'Fixture Student', slotStart: '2026-10-21T10:00', status: 'CONFIRMED', ...over,
});

async function loaded<T extends { load(): Promise<void> }>(vm: T): Promise<T> {
  await vm.load();
  return vm;
}

/** A request stub that answers by path and records every call. */
function stubRequest(routes: Record<string, unknown | ((init?: RequestInit) => unknown)>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const request = (async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    const key = Object.keys(routes).find((k) => path === k || path.startsWith(`${k}?`));
    if (key === undefined) throw new Error(`unexpected ${path}`);
    const answer = routes[key];
    return typeof answer === 'function' ? (answer as (init?: RequestInit) => unknown)(init) : answer;
  }) as Request;
  return { request, calls };
}

/* ------------------------------------------------------- critical results */

const criticalItem = (over: Partial<CriticalApiItem> = {}): CriticalApiItem => ({
  id: 'k1', patientId: 'p1', testPanel: ['Renal panel'], sampleId: 'S-4410', criticalNote: 'Potassium 6.8 mmol/L (3.5–5.1)', waitingSeconds: 660, ...over,
});
const uncollectedItem: UncollectedApiItem = { id: 'u1', patientId: 'p9', testPanel: ['Iron panel'], overdueReason: 'slot_passed', waitingSeconds: 11 * 86400 };

function criticalData(): CriticalData {
  return mapCritical(
    { items: [criticalItem(), criticalItem({ id: 'k2', patientId: 'p2', criticalNote: 'Haemoglobin 7.1 g/dL', waitingSeconds: 2280 })], total: 2 },
    { items: [uncollectedItem], total: 1 },
    new Map([['p1', 'Fixture Student'], ['p2', 'Fixture Two']]),
    en,
  );
}

const criticalSource = (over: Partial<CriticalSource> = {}): CriticalSource => ({ load: async () => criticalData(), acknowledge: async () => undefined, ...over });

describe('critical results (ClinicalReview)', () => {
  it('ranks critical before out-of-range before never-collected, whatever the arrival order', () => {
    const base = criticalData().results[0];
    const mk = (id: string, flag: CriticalResult['flag']): CriticalResult => ({ ...base, id, flag });
    expect(bySeverity([mk('n', 'none'), mk('h', 'H'), mk('c', 'CRIT'), mk('l', 'L'), mk('hh', 'HH')]).map((r) => r.id)).toEqual(['c', 'hh', 'h', 'l', 'n']);
  });

  it('maps the API without inventing values: the lab’s own wording, no turnaround figure, unknown names said as such', () => {
    const data = mapCritical({ items: [criticalItem({ patientId: 'nobody' })], total: 1 }, { items: [], total: 0 }, new Map(), en);
    expect(data.results[0]).toMatchObject({ value: 'Potassium 6.8 mmol/L (3.5–5.1)', flag: 'CRIT', patientName: '', meta: 'Sample S-4410', ack: 'unacknowledged' });
    expect(data.stats.map((s) => s.value)).toEqual(['1', null, '0', null]);
  });

  it('will not acknowledge until an escalation is chosen, and the row changes only after the server accepts', async () => {
    let finish: () => void = () => undefined;
    const acknowledge = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const vm = await loaded(new CriticalResultsViewModel(criticalSource({ acknowledge }), en));
    vm.openResult('k1');
    expect(vm.escalation).toBeNull();
    expect(vm.canAcknowledge).toBe(false);
    await vm.acknowledge();
    expect(acknowledge).not.toHaveBeenCalled();
    vm.choose('call');
    const pending = vm.acknowledge();
    expect(vm.data?.results.find((r) => r.id === 'k1')?.ack).toBe('unacknowledged');
    finish();
    await pending;
    expect(acknowledge).toHaveBeenCalledWith('k1', 'call');
    expect(vm.data?.results.find((r) => r.id === 'k1')?.ack).toBe('acknowledged');
    expect(vm.visible.map((r) => r.id)).toEqual(['k2']);
  });

  it('keeps a result unacknowledged when recording fails', async () => {
    const vm = await loaded(new CriticalResultsViewModel(criticalSource({ acknowledge: () => Promise.reject(new Error('down')) }), en));
    vm.openResult('k1');
    vm.choose('clinic');
    await vm.acknowledge();
    expect(vm.data?.results.find((r) => r.id === 'k1')?.ack).toBe('unacknowledged');
    expect(vm.toast).toMatch(/still unacknowledged/);
  });

  it('fails closed offline and when the source cannot record it', async () => {
    const vm = await loaded(new CriticalResultsViewModel(criticalSource(), en));
    vm.openResult('k1');
    vm.choose('call');
    expect(vm.canAcknowledge).toBe(true);
    vm.setOnline(false);
    expect(vm.canAcknowledge).toBe(false);
    const readOnly = await loaded(new CriticalResultsViewModel({ load: async () => criticalData() }, en));
    readOnly.openResult('k1');
    readOnly.choose('call');
    expect(readOnly.canAcknowledge).toBe(false);
  });

  it('posts the chosen escalation in English to the acknowledgement endpoint, and loads without names if appointments fail', async () => {
    const { request, calls } = stubRequest({
      '/work/appointments': () => { throw new Error('down'); },
      '/work/critical-results': { items: [criticalItem()], total: 1 },
      '/work/lab-orders/awaiting-collection': { items: [], total: 0 },
      '/lab-orders/k1/acknowledge-critical': {},
    });
    const source = criticalApiSource(en, request);
    const data = await source.load();
    expect(data?.results[0].patientName).toBe('');
    await source.acknowledge?.('k1', 'follow-up');
    const post = calls.find((c) => c.path === '/lab-orders/k1/acknowledge-critical');
    expect(post?.init?.method).toBe('POST');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ note: 'Escalation chosen: follow-up task.' });
    expect(source.chase).toBeUndefined();
  });

  it('opens an accessible drawer with the escalation choices, none pre-selected, and says CRIT in words', async () => {
    const vm = new CriticalResultsViewModel(criticalSource(), en);
    render(<CriticalResultsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getAllByLabelText('Flag CRIT')).toHaveLength(2);
    expect(screen.getByText('Potassium 6.8 mmol/L (3.5–5.1)')).toHaveClass('sk-table__text--danger');
    fireEvent.click(screen.getByRole('button', { name: /Acknowledge Renal panel for Fixture Student/ }));
    const dialog = screen.getByRole('dialog', { name: 'Fixture Student' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const radios = within(dialog).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
    expect(within(dialog).getByRole('button', { name: 'Acknowledge & escalate' })).toBeDisabled();
    fireEvent.click(radios[0]);
    expect(within(dialog).getByRole('button', { name: 'Acknowledge & escalate' })).toBeEnabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Closing the drawer never hides the result.
    expect(screen.getByRole('button', { name: /Acknowledge Renal panel for Fixture Student/ })).toBeInTheDocument();
  });

  it('shows "Chase" disabled with the reason, because no reminder service exists', async () => {
    const vm = new CriticalResultsViewModel(criticalSource(), en);
    render(<CriticalResultsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    act(() => vm.setTab('never-collected'));
    const chase = screen.getByRole('button', { name: /Chase Iron panel/ });
    expect(chase).toBeDisabled();
    expect(chase).toHaveAccessibleDescription(/No reminder service is connected yet/);
  });

  it('offline: shows the read-only note and keeps acknowledging off', async () => {
    const vm = new CriticalResultsViewModel(criticalSource(), en);
    render(<CriticalResultsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    act(() => vm.setOnline(false));
    expect(screen.getByText(/You’re offline. Showing what was loaded at/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Acknowledge Renal panel for Fixture Student/ }));
    expect(screen.getByRole('button', { name: 'Acknowledge & escalate' })).toBeDisabled();
  });
});

/* --------------------------------------------------------- encounter note */

const note = (over: Partial<EncounterNoteApi> = {}): EncounterNoteApi => ({
  id: 'n1', appointmentId: 'a1', patientId: 'p1', status: 'DRAFT', createdAt: 1790000000, signedAt: null,
  subjective: 'Sore throat since last night.', objective: 'Temp 38.4.', assessment: 'Likely viral.', plan: '', ...over,
});
const encounterData = (notes: EncounterNoteApi[] = [note()]): EncounterData => ({ notes, appointments: [appt()] });

function encounterSource(over: Partial<EncounterSource> = {}): EncounterSource {
  return { load: async () => encounterData(), create: async () => 'n2', save: async () => undefined, sign: async () => 'signed', ...over };
}

describe('encounter note', () => {
  it('signs only when all four sections are written, saves first, then locks', async () => {
    const order: string[] = [];
    const vm = await loaded(new EncounterNoteViewModel(encounterSource({
      save: async () => { order.push('save'); },
      sign: async () => { order.push('sign'); return 'signed'; },
    }), en));
    expect(vm.missing).toEqual(['plan']);
    expect(vm.canSign).toBe(false);
    vm.edit('plan', 'Fluids and rest. Review in 3 days.');
    expect(vm.canSign).toBe(true);
    expect(await vm.sign()).toBe(true);
    expect(order).toEqual(['save', 'sign']);
    vm.edit('plan', 'changed after signing');
    expect(vm.soap.plan).toBe('Fluids and rest. Review in 3 days.');
  });

  it('never signs when the save fails, and stays a draft when signing fails', async () => {
    const sign = vi.fn(async () => 'signed' as const);
    const vm = await loaded(new EncounterNoteViewModel(encounterSource({ save: () => Promise.reject(new Error('down')), sign }), en));
    vm.edit('plan', 'Plan written.');
    expect(await vm.sign()).toBe(false);
    expect(sign).not.toHaveBeenCalled();
    expect(vm.signed).toBe(false);
    const failing = await loaded(new EncounterNoteViewModel(encounterSource({ sign: () => Promise.reject(new Error('down')) }), en));
    failing.edit('plan', 'Plan written.');
    expect(await failing.sign()).toBe(false);
    expect(failing.toast).toMatch(/still a draft/);
  });

  it('a note signed elsewhere is reloaded, not claimed as signed here', async () => {
    let finalNote = false;
    const vm = await loaded(new EncounterNoteViewModel(encounterSource({
      load: async () => encounterData([note(finalNote ? { status: 'FINAL', plan: 'Server plan' } : { plan: 'x' })]),
      sign: async () => { finalNote = true; return 'already-signed'; },
    }), en));
    expect(await vm.sign()).toBe(false);
    expect(vm.toast).toMatch(/already signed/);
    expect(vm.signed).toBe(true);
    expect(vm.soap.plan).toBe('Server plan');
  });

  it('fails closed offline', async () => {
    const vm = await loaded(new EncounterNoteViewModel(encounterSource({ load: async () => encounterData([note({ plan: 'p' })]) }), en));
    expect(vm.canSign).toBe(true);
    vm.setOnline(false);
    expect(vm.canSign).toBe(false);
    expect(vm.canSave).toBe(false);
  });

  it('opens the note for the consult room’s appointment, or offers to start one', async () => {
    const vm = await loaded(new EncounterNoteViewModel(encounterSource({ load: async () => encounterData([note({ id: 'n9', appointmentId: 'other' }), note()]) }), en, { appointmentId: 'a1' }));
    expect(vm.note?.id).toBe('n1');
    const fresh = await loaded(new EncounterNoteViewModel(encounterSource({ load: async () => encounterData([note({ appointmentId: 'other' })]) }), en, { appointmentId: 'a1' }));
    expect(fresh.newOpen).toBe(true);
    expect(fresh.newAppointmentId).toBe('a1');
  });

  it('labels each section, says what is missing, asks before signing, and shows the timeline as not connected', async () => {
    const vm = new EncounterNoteViewModel(encounterSource(), en);
    render(<EncounterNoteView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByRole('heading', { level: 1, name: 'Fixture Student' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign & prescribe' })).toBeDisabled();
    expect(screen.getByText('Fill in plan to sign.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PLAN'), { target: { value: 'Rest.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign & prescribe' }));
    expect(screen.getByRole('alertdialog', { name: 'Sign this note?' })).toBeInTheDocument();
    expect(screen.getByText(/timeline isn’t connected yet/)).toBeInTheDocument();
  });

  it('maps the server’s 409s: an edit on a signed note, and a second sign', async () => {
    const { request } = stubRequest({
      '/encounters/n1': () => { throw new ApiError('signed', 409); },
      '/encounters/n1/finalize': () => { throw new ApiError('signed', 409); },
    });
    const source = encounterApiSource(request);
    await expect(source.save?.('n1', { subjective: 'a', objective: 'b', assessment: 'c', plan: 'd' })).rejects.toBeInstanceOf(SignedElsewhere);
    await expect(source.sign?.('n1')).resolves.toBe('already-signed');
  });
});

/* -------------------------------------------------------------- prescribe */

const entry = (over: Partial<DrugEntry> = {}): DrugEntry => ({
  genericName: 'Paracetamol', brandName: '', strength: '650 mg', form: 'tablet', dose: '1 tablet', frequency: 'Every 6 hours as needed',
  durationDays: 3, quantity: 10, scheduleClass: 'OTC', substitutionAllowed: true, ...over,
});
const prescribeData = (): PrescribeData => ({ appointments: [appt()], notes: [{ id: 'n1', appointmentId: 'a1', patientId: 'p1', status: 'FINAL', createdAt: 1790000000 }] });

function addDrug(vm: PrescribeViewModel, drug: DrugEntry): void {
  vm.openDrawer();
  (Object.keys(drug) as (keyof DrugEntry)[]).forEach((key) => vm.setEntry(key, drug[key]));
  vm.add();
}

describe('prescribe', () => {
  it('fails closed: no student, an incomplete line, or offline means nothing can be signed', async () => {
    const vm = await loaded(new PrescribeViewModel({ load: async () => prescribeData(), issue: async () => ({ kind: 'issued', id: 'rx1' }) }, en));
    addDrug(vm, entry());
    expect(vm.canSign).toBe(false);
    vm.selectPatient('p1');
    expect(vm.encounterId).toBe('n1');
    expect(vm.canSign).toBe(true);
    vm.edit(vm.lines[0].id, 'dose', '');
    expect(vm.canSign).toBe(false);
    vm.edit(vm.lines[0].id, 'dose', '1 tablet');
    vm.setOnline(false);
    expect(vm.canSign).toBe(false);
  });

  it('blocks a drug the allergy check refuses, sends nothing, and never sends it again', async () => {
    const sent: IssueRequest[] = [];
    const issue = vi.fn(async (req: IssueRequest): Promise<IssueResult> => {
      sent.push(req);
      return sent.length === 1
        ? { kind: 'conflict', conflicts: [{ genericName: 'Amoxicillin', conflicts: [{ substance: 'Penicillin', flag: 'x' }] }] }
        : { kind: 'issued', id: 'rx1' };
    });
    const vm = await loaded(new PrescribeViewModel({ load: async () => prescribeData(), issue }, en, { patientId: 'p1' }));
    addDrug(vm, entry());
    addDrug(vm, entry({ genericName: 'Amoxicillin', scheduleClass: 'H' }));
    await vm.sign();
    expect(vm.signed).toBe(false);
    expect(vm.allergyBlock).toEqual({ generic: 'Amoxicillin', substances: ['Penicillin'] });
    expect(vm.lines.find((l) => l.genericName === 'Amoxicillin')?.blocked).toEqual({ kind: 'allergy', substances: ['Penicillin'] });
    await vm.sign();
    expect(sent[1].lines.map((l) => l.genericName)).toEqual(['Paracetamol']);
    expect(vm.signed).toBe(true);
  });

  it('records a Schedule X drug as blocked: the consult is not reported as in person', async () => {
    const vm = await loaded(new PrescribeViewModel({ load: async () => prescribeData(), issue: async () => ({ kind: 'issued', id: 'rx1' }) }, en, { patientId: 'p1' }));
    addDrug(vm, entry({ genericName: 'Controlled', scheduleClass: 'X' }));
    expect(vm.lines[0].blocked).toEqual({ kind: 'schedule-x' });
    expect(vm.canSign).toBe(false);
  });

  it('never asks the server to override an allergy conflict, and reads its 409 as a block', async () => {
    const { request, calls } = stubRequest({
      '/prescriptions': () => { throw new ApiError('conflict', 409, { message: 'x', conflicts: [{ genericName: 'Amoxicillin', conflicts: [{ substance: 'Penicillin', flag: 'f' }] }] }); },
    });
    const result = await prescribeApiSource(request).issue?.({ patientId: 'p1', encounterId: '', lines: [entry({ genericName: 'Amoxicillin' })] });
    expect(result).toEqual({ kind: 'conflict', conflicts: [{ genericName: 'Amoxicillin', conflicts: [{ substance: 'Penicillin', flag: 'f' }] }] });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.acknowledgeAllergyConflict).toBe(false);
    expect(body).not.toHaveProperty('encounterId');
  });

  it('shows the block with the mandatory "name match only" disclosure, as an alert', async () => {
    const source: PrescribeSource = { load: async () => prescribeData(), issue: async () => ({ kind: 'conflict', conflicts: [{ genericName: 'Amoxicillin', conflicts: [{ substance: 'Penicillin', flag: 'x' }] }] }) };
    const vm = new PrescribeViewModel(source, en, { patientId: 'p1' });
    render(<PrescribeView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    act(() => addDrug(vm, entry({ genericName: 'Amoxicillin' })));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sign & send' })); });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Amoxicillin blocked — penicillin allergy on file');
    expect(alert).toHaveTextContent('name match only');
    expect(alert).toHaveTextContent('NAME MATCH ONLY');
    expect(screen.getByRole('rowheader', { name: /Blocked: Amoxicillin/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign & send' })).toBeDisabled();
  });

  it('the add-a-drug drawer says search is not connected and adds only a complete drug', async () => {
    const vm = new PrescribeViewModel({ load: async () => prescribeData(), issue: async () => ({ kind: 'issued', id: 'rx1' }) }, en, { patientId: 'p1' });
    render(<PrescribeView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    fireEvent.click(screen.getByRole('button', { name: 'Add a drug' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a drug' });
    expect(within(dialog).getByText(/Drug search isn’t connected yet/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add to prescription' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Generic name'), { target: { value: 'Cetirizine' } });
    fireEvent.change(within(dialog).getByLabelText('Dose'), { target: { value: '10 mg' } });
    fireEvent.change(within(dialog).getByLabelText('Frequency'), { target: { value: 'Once at night' } });
    fireEvent.change(within(dialog).getByLabelText('Duration (days)'), { target: { value: '5' } });
    fireEvent.change(within(dialog).getByLabelText('Quantity'), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to prescription' }));
    expect(screen.getByRole('rowheader', { name: /Cetirizine/ })).toBeInTheDocument();
  });

  it('empty when there is nobody in the doctor’s care', async () => {
    const vm = new PrescribeViewModel({ load: async () => ({ appointments: [], notes: [] }) }, en);
    render(<PrescribeView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByRole('heading', { name: 'No one to prescribe for yet.' })).toBeInTheDocument();
  });
});

/* --------------------------------------------------------- report reviews */

const review = (over: Partial<QueueReview> = {}): QueueReview => ({ id: 'r1', documentId: 'doc-3f2a9c1b-0000', shareId: 's1', version: 2, createdAt: 1790000000, ...over });
const goodDraft = (): ReviewDraft => ({ decision: 'APPROVED', summary: 'Vitamin D is low.', questions: '', nextSteps: 'Repeat the test in 8 weeks', sources: [{ title: 'ICMR guidance', url: 'https://example.org/vit-d' }] });

describe('report reviews', () => {
  it('approval needs your own summary, a next step and an HTTPS source; a decline sends nothing else', () => {
    expect(reviewProblems(goodDraft())).toEqual([]);
    expect(reviewProblems({ ...goodDraft(), summary: ' ' })).toEqual(['summary']);
    expect(reviewProblems({ ...goodDraft(), nextSteps: '' })).toEqual(['nextSteps']);
    expect(reviewProblems({ ...goodDraft(), sources: [{ title: 'x', url: 'http://example.org' }] })).toEqual(['sources']);
    expect(reviewBody(review(), { ...goodDraft(), decision: 'REJECTED' })).toEqual({ expectedVersion: 2, decision: 'REJECTED' });
  });

  it('removes a sent review, reloads a stale one, and keeps your words when sending fails', async () => {
    const reviews = [review(), review({ id: 'r2' })];
    let outcome: 'saved' | 'stale' | 'fail' = 'saved';
    const load = vi.fn(async () => ({ reviews: [...reviews], total: reviews.length }));
    const source: ReviewsSource = { load, submit: async () => { if (outcome === 'fail') throw new Error('down'); return outcome; } };
    const vm = await loaded(new ReportReviewsViewModel(source, en));
    vm.openReview('r1');
    vm.setField('summary', 'Vitamin D is low.');
    vm.setField('nextSteps', 'Repeat in 8 weeks');
    vm.setSource(0, 'title', 'ICMR guidance');
    vm.setSource(0, 'url', 'https://example.org/vit-d');
    expect(vm.canSubmit).toBe(true);
    outcome = 'fail';
    await vm.submit();
    expect(vm.draft.summary).toBe('Vitamin D is low.');
    expect(vm.data?.reviews).toHaveLength(2);
    outcome = 'saved';
    await vm.submit();
    expect(vm.data?.reviews.map((r) => r.id)).toEqual(['r2']);
    vm.openReview('r2');
    vm.setDecision('REJECTED');
    outcome = 'stale';
    await vm.submit();
    expect(load).toHaveBeenCalledTimes(2);
    expect(vm.toast).toMatch(/nothing was recorded/);
  });

  it('fails closed offline', async () => {
    const vm = await loaded(new ReportReviewsViewModel({ load: async () => ({ reviews: [review()], total: 1 }), submit: async () => 'saved' }, en));
    vm.openReview('r1');
    vm.setDecision('REJECTED');
    expect(vm.canSubmit).toBe(true);
    vm.setOnline(false);
    expect(vm.canSubmit).toBe(false);
  });

  it('describes each row’s progress for screen readers and never shows "unread" without a receipt', async () => {
    const vm = new ReportReviewsViewModel({ load: async () => ({ reviews: [review(), review({ id: 'r2' })], total: 2 }) }, en);
    render(<ReportReviewsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getAllByRole('img', { name: 'Step 2 of 4: Assigned' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: 'Unread by student' }));
    expect(screen.getByText(/never shown as “unread”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Awaiting me' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Review report/ })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Review this report' });
    expect(within(dialog).getByRole('link', { name: 'Open shared report' })).toHaveAttribute('href', expect.stringContaining('/records/shares/s1/document'));
    expect(within(dialog).getByRole('button', { name: 'Send review' })).toBeDisabled();
  });
});

/* ------------------------------------------------------------ consult room */

function consultData(over: Partial<ConsultData> = {}): ConsultData {
  return {
    appointments: [appt()], current: appt(),
    state: { status: 'WAITING', studentJoined: true, providerJoined: false, liveMedia: false },
    note: note({ status: 'FINAL', plan: 'Rest' }), prescriptions: [], ...over,
  };
}
const consultSource = (data: ConsultData = consultData(), over: Partial<ConsultSource> = {}): ConsultSource => ({ load: async () => data, joinAsProvider: async () => undefined, ...over });

describe('consult room', () => {
  it('opens the asked-for appointment, else the one nearest to now', () => {
    const list = [appt({ id: 'early', slotStart: '2026-10-21T08:00' }), appt({ id: 'near', slotStart: '2026-10-21T10:30' }), appt({ id: 'late', slotStart: '2026-10-21T18:00' })];
    const now = new Date('2026-10-21T10:20').getTime();
    expect(pickAppointment(list, 'late', now)?.id).toBe('late');
    expect(pickAppointment(list, 'missing', now)?.id).toBe('near');
    expect(pickAppointment([], null, now)).toBeNull();
  });

  it('computes the end-of-call checks from the records, never assumes them', async () => {
    const vm = await loaded(new ConsultRoomViewModel(consultSource(consultData({ note: note() })), en));
    expect(vm.checks).toEqual([{ id: 'note', done: false }, { id: 'rx', done: false }]);
    const withRx = await loaded(new ConsultRoomViewModel(consultSource(consultData({ prescriptions: [{ id: 'rx1', encounterId: 'n1', patientId: 'p1', status: 'ISSUED', issuedAt: 1, allergyCheck: {}, items: [] }] })), en));
    expect(withRx.checks).toEqual([{ id: 'note', done: true }, { id: 'rx', done: true }, { id: 'allergy', done: false }]);
  });

  it('only shows prescriptions linked to this consult’s note', async () => {
    const { request } = stubRequest({
      '/work/appointments': { items: [appt()] },
      '/consultation/a1/state': { status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: false },
      '/encounters': { items: [note()] },
      '/work/prescriptions': { items: [
        { id: 'mine', encounterId: 'n1', patientId: 'p1', status: 'ISSUED', issuedAt: 1, allergyCheck: { checkedAt: 1 }, items: [] },
        { id: 'other-visit', encounterId: 'n0', patientId: 'p1', status: 'ISSUED', issuedAt: 1, allergyCheck: {}, items: [] },
      ] },
    });
    const data = await consultApiSource(request).load(null);
    expect(data?.prescriptions.map((p) => p.id)).toEqual(['mine']);
  });

  it('will not join offline or without an appointment', async () => {
    const vm = await loaded(new ConsultRoomViewModel(consultSource(), en));
    vm.setOnline(false);
    await expect(vm.joinAsProvider()).rejects.toThrow(/offline/);
  });

  it('shows no shared records, the certificate as unavailable, and asks before ending', async () => {
    const vm = new ConsultRoomViewModel(consultSource(), en);
    render(<ConsultRoomView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByRole('heading', { level: 1, name: 'Consult · Fixture Student' })).toBeInTheDocument();
    expect(screen.getByText(/aren’t connected to the consult room yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Verified at check-in/)).not.toBeInTheDocument();
    expect(screen.getByText('Video consults aren’t connected yet.')).toBeInTheDocument();
    const certificate = screen.getByRole('button', { name: 'Certificate' });
    expect(certificate).toBeDisabled();
    expect(certificate).toHaveAccessibleDescription(/need legal sign-off/);
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('list', { name: 'Before you end' })).toHaveTextContent('Note signed');
    fireEvent.click(within(dialog).getByRole('button', { name: 'End and leave the call' }));
    expect(screen.getByRole('heading', { name: 'You left the consult.' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('says so when there is no confirmed consult', async () => {
    const vm = new ConsultRoomViewModel(consultSource(consultData({ appointments: [], current: null, state: null, note: null })), en);
    render(<ConsultRoomView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByRole('heading', { name: 'No confirmed consult to open.' })).toBeInTheDocument();
  });
});
