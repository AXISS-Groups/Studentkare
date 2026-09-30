import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { CriticalResultsViewModel } from '../critical-results/CriticalResultsViewModel';
import { CriticalResultsView } from '../critical-results/CriticalResultsScreen';
import { bySeverity, criticalSample, sampleCriticalSource } from '../critical-results/criticalModel';
import type { CriticalSource } from '../critical-results/criticalModel';

import { ReportReviewsView, ReportReviewsViewModel, sampleReviewsSource } from '../report-reviews/ReportReviewsScreen';

import { InboxView, InboxViewModel, KIND, sampleInboxSource } from '../inbox/ClinicianInboxScreen';

import { EncounterNoteView, EncounterNoteViewModel, sampleEncounterSource } from '../encounter-note/EncounterNoteScreen';

import { PrescribeViewModel } from '../prescribe/PrescribeViewModel';
import { PrescribeView } from '../prescribe/PrescribeScreen';
import { blockReason, prescribeSample, samplePrescribeSource } from '../prescribe/prescribeModel';
import type { Drug, PrescribeSource } from '../prescribe/prescribeModel';

import { ConsultRoomView, ConsultRoomViewModel, consultSample, sampleConsultSource } from '../consult-room/ConsultRoomScreen';

async function loaded<T extends { load(): Promise<void> }>(vm: T): Promise<T> {
  await vm.load();
  return vm;
}

/* ------------------------------------------------------- critical results */

describe('critical results', () => {
  it('ranks critical before out-of-range before the rest', () => {
    const shuffled = [...criticalSample().results].reverse();
    const ranks = bySeverity(shuffled).map((r) => (['HH', 'LL'].includes(r.flag) ? 0 : ['H', 'L'].includes(r.flag) ? 1 : 2));
    expect(ranks).toEqual([...ranks].sort());
  });

  it('will not acknowledge until an escalation is chosen (fails closed)', async () => {
    const acknowledge = vi.fn(() => Promise.resolve());
    const vm = await loaded(new CriticalResultsViewModel({ ...sampleCriticalSource, acknowledge }));
    vm.openResult('k1');
    expect(vm.escalation).toBeNull();
    expect(vm.canAcknowledge).toBe(false);
    await vm.acknowledge();
    expect(acknowledge).not.toHaveBeenCalled();
    vm.choose('call');
    await vm.acknowledge();
    expect(acknowledge).toHaveBeenCalledWith('k1', 'call');
    expect(vm.data?.results.find((r) => r.id === 'k1')?.ack).toBe('acknowledged');
    expect(vm.visible.map((r) => r.id)).toEqual(['k2']);
  });

  it('keeps a result unacknowledged when recording fails', async () => {
    const vm = await loaded(new CriticalResultsViewModel({ ...sampleCriticalSource, acknowledge: () => Promise.reject(new Error('down')) }));
    vm.openResult('k1');
    vm.choose('clinic');
    await vm.acknowledge();
    expect(vm.data?.results.find((r) => r.id === 'k1')?.ack).toBe('unacknowledged');
    expect(vm.toast).toMatch(/still unacknowledged/);
  });

  it('cannot acknowledge at all when the source cannot record it', async () => {
    const source: CriticalSource = { load: sampleCriticalSource.load };
    const vm = await loaded(new CriticalResultsViewModel(source));
    vm.openResult('k1');
    vm.choose('call');
    expect(vm.canAcknowledge).toBe(false);
  });

  it('opens an accessible drawer with the escalation choices, none pre-selected', async () => {
    const vm = new CriticalResultsViewModel(sampleCriticalSource);
    render(<CriticalResultsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    fireEvent.click(screen.getByRole('button', { name: /Acknowledge Potassium for Aarav Sharma/ }));
    const dialog = screen.getByRole('dialog', { name: 'Aarav Sharma' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const radios = within(dialog).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
    expect(within(dialog).getByRole('button', { name: 'Acknowledge & escalate' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows out-of-range values in amber and critical values in red', async () => {
    const vm = new CriticalResultsViewModel(sampleCriticalSource);
    render(<CriticalResultsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    act(() => vm.setTab('all'));
    expect(screen.getByText('6.8 mmol/L')).toHaveClass('sk-table__text--danger');
    expect(screen.getByText('9.4 mIU/L')).toHaveClass('sk-table__text--attention');
  });
});

/* --------------------------------------------------------- report reviews */

describe('report reviews', () => {
  it('lists urgent first and will not send an empty review', async () => {
    const vm = await loaded(new ReportReviewsViewModel(sampleReviewsSource));
    expect(vm.visible[0].urgency).toBe('urgent');
    vm.openReview('v1');
    vm.setDraft('ok');
    expect(vm.canSubmit).toBe(false);
    vm.setDraft('Vitamin D is low; start D3 60K weekly for 8 weeks and repeat the test then.');
    expect(vm.canSubmit).toBe(true);
    await vm.submit();
    const sent = vm.data?.reviews.find((r) => r.id === 'v1');
    expect(sent?.stage).toBe(3);
    expect(sent?.reply).toMatch(/^Vitamin D is low/);
    vm.setTab('unread');
    expect(vm.visible.map((r) => r.id)).toContain('v1');
  });

  it('keeps the words when sending fails', async () => {
    const vm = await loaded(new ReportReviewsViewModel({ ...sampleReviewsSource, submit: () => Promise.reject(new Error('down')) }));
    vm.openReview('v2');
    vm.setDraft('This needs a call today — please pick up when we ring.');
    await vm.submit();
    expect(vm.draft).toMatch(/^This needs a call/);
    expect(vm.data?.reviews.find((r) => r.id === 'v2')?.stage).toBe(2);
  });

  it('describes each row’s progress for screen readers', async () => {
    const vm = new ReportReviewsViewModel(sampleReviewsSource);
    render(<ReportReviewsView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getAllByRole('img', { name: 'Step 2 of 4: Assigned' })).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ inbox */

describe('inbox', () => {
  it('keeps critical results on top whatever their age', async () => {
    const vm = await loaded(new InboxViewModel(sampleInboxSource));
    expect(vm.shown[0].kind).toBe('critical');
    vm.setFilter('message');
    expect(vm.shown.every((i) => i.kind === 'message')).toBe(true);
  });

  it('will not send a reply or release a result without words', async () => {
    const act_ = vi.fn(() => Promise.resolve());
    const vm = await loaded(new InboxViewModel({ ...sampleInboxSource, act: act_ }));
    vm.select('i2');
    const send = KIND.message.actions[0];
    expect(vm.canDo(send)).toBe(false);
    vm.setText('Stop for two days and use a plain moisturiser; message me if it keeps peeling.');
    await vm.act(send);
    expect(act_).toHaveBeenCalledWith('i2', 'Send reply', expect.stringMatching(/^Stop for two days/));
    expect(vm.data?.some((i) => i.id === 'i2')).toBe(false);
  });

  it('reads out which values are critical and which are outside the range', async () => {
    const vm = new InboxViewModel(sampleInboxSource);
    render(<InboxView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByText('6.8').closest('dd')).toHaveTextContent('6.8 (critical)');
    act(() => vm.select('i3'));
    expect(screen.getByText('36').closest('dd')).toHaveTextContent('36 (outside the lab’s range)');
    expect(screen.getByText('36').closest('dd')).toHaveClass('ib-value__v--out-of-range');
  });
});

/* --------------------------------------------------------- encounter note */

describe('encounter note', () => {
  it('signs only when all four sections are written, then locks', async () => {
    const vm = await loaded(new EncounterNoteViewModel(sampleEncounterSource));
    vm.edit('plan', '   ');
    expect(vm.missing).toEqual(['plan']);
    expect(vm.canSign).toBe(false);
    vm.edit('plan', 'Fluids and rest. Review in 3 days.');
    expect(await vm.sign()).toBe(true);
    vm.edit('plan', 'changed after signing');
    expect(vm.soap.plan).toBe('Fluids and rest. Review in 3 days.');
  });

  it('stays a draft when signing fails', async () => {
    const vm = await loaded(new EncounterNoteViewModel({ ...sampleEncounterSource, sign: () => Promise.reject(new Error('down')) }));
    expect(await vm.sign()).toBe(false);
    expect(vm.signed).toBe(false);
    expect(vm.toast).toMatch(/still a draft/);
  });

  it('labels each section and says what is missing before signing', async () => {
    const vm = new EncounterNoteViewModel(sampleEncounterSource);
    render(<EncounterNoteView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    fireEvent.change(screen.getByLabelText('ASSESSMENT'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Sign & prescribe' })).toBeDisabled();
    expect(screen.getByText('Fill in assessment to sign.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /timeline within the consent window/ })).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------- prescribe */

describe('prescribe', () => {
  const data = prescribeSample();
  const drug = (id: string): Drug => {
    const found = data.catalogue.find((d) => d.id === id);
    if (!found) throw new Error(id);
    return found;
  };

  it('blocks a drug in an allergy class, and says it is a class match only', () => {
    expect(blockReason(drug('d-amox'), data)).toBe('Penicillin class — allergy recorded 14 Jul 2026');
    expect(blockReason(drug('d-amoxclav'), data)).toMatch(/Penicillin class/);
    expect(blockReason(drug('d-azi'), data)).toBeNull();
  });

  it('fails closed when the allergy record cannot be read', () => {
    expect(blockReason(drug('d-para'), { ...data, allergies: null })).toMatch(/couldn’t be checked/);
  });

  it('never prescribes Schedule X by video', () => {
    const x: Drug = { ...drug('d-para'), id: 'x', schedule: 'X', drugClass: 'Controlled', generic: 'Controlled' };
    expect(blockReason(x, data)).toMatch(/never prescribed by video/);
    expect(blockReason(x, { ...data, mode: 'in-person' })).toBeNull();
  });

  it('records a refused drug as a struck-through line and never signs it', async () => {
    const sign = vi.fn<NonNullable<PrescribeSource['sign']>>(() => Promise.resolve());
    const vm = await loaded(new PrescribeViewModel({ ...samplePrescribeSource, sign }));
    vm.add(drug('d-amoxclav'));
    expect(vm.lines.find((l) => l.drugId === 'd-amoxclav')?.blockedReason).toMatch(/Penicillin/);
    await vm.sign();
    const signed = sign.mock.calls[0][0];
    expect(signed.map((l) => l.drugId)).toEqual(['d-para', 'd-azi']);
  });

  it('cannot sign when allergies are unknown', async () => {
    const vm = await loaded(new PrescribeViewModel({ ...samplePrescribeSource, load: async () => ({ ...prescribeSample(), allergies: null }) }));
    expect(vm.allergyUnknown).toBe(true);
    expect(vm.canSign).toBe(false);
  });

  it('keeps blocked drugs visible in search with the reason', async () => {
    const vm = new PrescribeViewModel(samplePrescribeSource);
    render(<PrescribeView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.getByRole('alert')).toHaveTextContent('Amoxicillin blocked — penicillin allergy on file');
    expect(screen.getByRole('alert')).toHaveTextContent('name match only');
    fireEvent.click(screen.getByRole('button', { name: /Add a drug/ }));
    const dialog = screen.getByRole('dialog', { name: 'Add a drug' });
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'amox' } });
    const results = within(dialog).getAllByRole('button', { name: /Amoxicillin/ });
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r).toHaveTextContent(/Blocked/));
  });
});

/* ------------------------------------------------------------ consult room */

describe('consult room', () => {
  it('computes the end-of-call checks from the consult, never assumes them', async () => {
    const vm = await loaded(new ConsultRoomViewModel({ ...sampleConsultSource, load: async () => ({ ...consultSample(), soap: { ...consultSample().soap, plan: '' }, followUpHours: null }) }));
    expect(vm.checks).toEqual([
      { label: 'Notes complete', done: false },
      { label: 'Prescription signed', done: true },
      { label: 'Allergy checked against medicines', done: true },
      { label: 'Follow-up window set', done: false },
    ]);
  });

  it('asks before ending, then closes access', async () => {
    const vm = new ConsultRoomViewModel(sampleConsultSource);
    render(<ConsultRoomView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    const mute = screen.getByRole('button', { name: 'Mute microphone' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(screen.getByRole('button', { name: 'Unmute microphone' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('list', { name: 'Before you end' })).toHaveTextContent('Notes complete');
    await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'End consult' })); });
    expect(screen.getByRole('heading', { name: 'Consult ended.' })).toBeInTheDocument();
  });

  it('shows transport facts only when the call service reports them', async () => {
    const vm = new ConsultRoomViewModel({ ...sampleConsultSource, load: async () => ({ ...consultSample(), transport: undefined }) });
    render(<ConsultRoomView viewModel={vm} onNavigate={vi.fn()} />);
    await act(async () => { await vm.load(); });
    expect(screen.queryByText(/Encrypted/)).not.toBeInTheDocument();
  });
});
