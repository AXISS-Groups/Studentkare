import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { PrescribeViewModel } from '../PrescribeViewModel';
import type { DoctorNote, StaffAppointment } from '../PrescribeViewModel';
import { PrescribeView } from '@/screens/clinician/NMCDoctorEPrescriptionScreen';

type Requester = typeof import('@/data/services/http').apiRequest;
const appts: StaffAppointment[] = [
  { id: 'a1', patientId: 'pt_1', customer: 'Asha', slotStart: '2026-10-08T09:00', status: 'CONFIRMED' },
  { id: 'a2', patientId: 'pt_1', customer: 'Asha', slotStart: '2026-10-01T09:00', status: 'COMPLETED' },
  { id: 'a3', patientId: 'pt_2', customer: 'Ravi', slotStart: '2026-10-09T09:00', status: 'REQUESTED' },
];
const conflict409 = new ApiError('This prescription conflicts with an allergy on the patient\'s record.', 409, {
  message: 'This prescription conflicts with an allergy on the patient\'s record.',
  conflicts: [{ genericName: 'Amoxicillin', conflicts: [{ substance: 'PENICILLIN', flag: '…' }] }],
});

function backend(onPost: (body: Record<string, unknown>) => unknown) {
  const posts: Record<string, unknown>[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/work/appointments') return { items: appts };
    if (path === '/prescriptions') { const body = JSON.parse(String(init?.body)); posts.push(body); return onPost(body); }
    throw new Error(`unexpected ${path}`);
  }) as unknown as Requester;
  return { request, posts };
}

async function ready(onPost: (body: Record<string, unknown>) => unknown) {
  const api = backend(onPost);
  const vm = new PrescribeViewModel(api.request);
  await vm.loadPatients();
  vm.selectPatient('pt_1');
  vm.updateLine('line-1', 'genericName', 'Amoxicillin');
  vm.updateLine('line-1', 'quantity', 21);
  return { vm, posts: api.posts };
}

describe('PrescribeViewModel on the real POST /prescriptions contract', () => {
  it('offers only patients with a confirmed or completed appointment, once each', async () => {
    const vm = new PrescribeViewModel(backend(() => ({})).request);
    await vm.loadPatients();
    expect(vm.patients?.map((p) => p.patientId)).toEqual(['pt_1']);
  });

  it('sends exactly the fields the backend accepts — no typed registration number, no diagnosis', async () => {
    const { vm, posts } = await ready(() => ({ id: 'rx_1', validUntil: 1, prescriberRegNo: 'NMC-1', allergyCheck: {} }));
    await vm.issue();
    expect(Object.keys(posts[0]).sort()).toEqual(['acknowledgeAllergyConflict', 'advice', 'items', 'patientId', 'validDays']);
    expect(Object.keys((posts[0].items as Record<string, unknown>[])[0]).sort()).toEqual(
      ['dose', 'durationDays', 'form', 'frequency', 'genericName', 'quantity', 'scheduleClass', 'strength', 'substitutionAllowed']);
    expect(posts[0].acknowledgeAllergyConflict).toBe(false);
    expect(vm.issued?.id).toBe('rx_1');
  });

  it('cannot issue without a patient or a quantity', async () => {
    const vm = new PrescribeViewModel(backend(() => ({})).request);
    await vm.loadPatients();
    vm.updateLine('line-1', 'genericName', 'Paracetamol');
    expect(vm.canIssue).toBe(false);
    vm.selectPatient('pt_1');
    expect(vm.canIssue).toBe(false);
    vm.updateLine('line-1', 'quantity', 10);
    expect(vm.canIssue).toBe(true);
  });

  it('stops on an allergy conflict and needs an explicit acknowledgement to send it', async () => {
    const { vm, posts } = await ready((body) => {
      if (!body.acknowledgeAllergyConflict) throw conflict409;
      return { id: 'rx_2', validUntil: 1, prescriberRegNo: '', allergyCheck: { acknowledged: true } };
    });
    await vm.issue();
    expect(vm.issued).toBeNull();
    expect(vm.conflicts[0].genericName).toBe('Amoxicillin');
    expect(vm.canIssue).toBe(false);
    vm.setAcknowledgeConflicts(true);
    await vm.issue();
    expect(posts[1].acknowledgeAllergyConflict).toBe(true);
    expect(vm.issued?.allergyCheck.acknowledged).toBe(true);
  });

  it('drops an acknowledgement when the medicines change', async () => {
    const { vm } = await ready(() => { throw conflict409; });
    await vm.issue();
    vm.setAcknowledgeConflicts(true);
    vm.updateLine('line-1', 'quantity', 14);
    expect(vm.acknowledgeConflicts).toBe(false);
    expect(vm.conflicts).toEqual([]);
  });

  it('shows the server refusal when the patient is not in the doctor\'s care', async () => {
    const { vm } = await ready(() => { throw new ApiError('You can prescribe only for a patient with a confirmed or completed appointment with you.', 403); });
    await vm.issue();
    expect(vm.error).toMatch(/confirmed or completed appointment/);
    expect(vm.issued).toBeNull();
  });
});

describe('PrescribeView', () => {
  it('names the conflicting drug and allergy, and gates issuing on the acknowledgement box', async () => {
    const { vm } = await ready(() => { throw conflict409; });
    await vm.issue();
    render(<PrescribeView vm={vm} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Amoxicillin: the record lists a PENICILLIN allergy.');
    const issue = screen.getByRole('button', { name: 'Issue prescription' });
    expect(issue).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /reviewed this conflict/ }));
    expect(issue).not.toBeDisabled();
  });

  it('says plainly when there is no one to prescribe for', async () => {
    const vm = new PrescribeViewModel((async () => ({ items: [] })) as unknown as Requester);
    await vm.loadPatients();
    render(<PrescribeView vm={vm} />);
    expect(screen.getByText('No patients in your care yet.')).toBeInTheDocument();
  });
});

describe('Link to visit note', () => {
  const notes: DoctorNote[] = [
    { id: 'enc_old', appointmentId: 'a2', patientId: 'pt_1', status: 'FINAL', createdAt: 1759300000, signedAt: 1759300100 },
    { id: 'enc_latest', appointmentId: 'a1', patientId: 'pt_1', status: 'DRAFT', createdAt: 1759900000, signedAt: null },
    { id: 'enc_other', appointmentId: 'a3', patientId: 'pt_2', status: 'FINAL', createdAt: 1759950000, signedAt: 1759950100 },
  ];

  function withNotes(items: DoctorNote[] | 'fail') {
    const posts: Record<string, unknown>[] = [];
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/work/appointments') return { items: appts };
      if (path === '/encounters') { if (items === 'fail') throw new ApiError('down', 500); return { items }; }
      if (path === '/prescriptions') { posts.push(JSON.parse(String(init?.body))); return { id: 'rx_1', validUntil: 1, prescriberRegNo: '', allergyCheck: {} }; }
      throw new Error(`unexpected ${path}`);
    }) as unknown as Requester;
    return { vm: new PrescribeViewModel(request), posts };
  }

  it('defaults to the newest note for the latest appointment, offers only this patient\'s notes, and sends it', async () => {
    const { vm, posts } = withNotes(notes);
    await vm.loadPatients();
    render(<PrescribeView vm={vm} />);
    fireEvent.change(screen.getByLabelText('Patient (from your confirmed appointments)'), { target: { value: 'pt_1' } });
    const picker = await screen.findByLabelText('Link to visit note') as HTMLSelectElement;
    expect(picker.value).toBe('enc_latest');
    expect([...picker.options].map((o) => o.value)).toEqual(['', 'enc_latest', 'enc_old']);
    expect(screen.getByRole('option', { name: 'No note' })).toBeInTheDocument();

    vm.updateLine('line-1', 'genericName', 'Paracetamol');
    vm.updateLine('line-1', 'quantity', 9);
    await vm.issue();
    expect(posts[0].encounterId).toBe('enc_latest');
  });

  it('sends no encounterId for "No note", and ignores a note that is not this patient\'s', async () => {
    const { vm, posts } = withNotes(notes);
    await vm.loadPatients();
    vm.selectPatient('pt_1');
    vm.selectNote('enc_other');
    expect(vm.encounterId).toBe('');
    vm.selectNote('enc_old');
    expect(vm.encounterId).toBe('enc_old');
    vm.selectNote('');
    vm.updateLine('line-1', 'genericName', 'Paracetamol');
    vm.updateLine('line-1', 'quantity', 9);
    await vm.issue();
    expect('encounterId' in posts[0]).toBe(false);
  });

  it('still lets the doctor prescribe, unlinked, when notes fail to load', async () => {
    const { vm } = withNotes('fail');
    await vm.loadPatients();
    vm.selectPatient('pt_1');
    render(<PrescribeView vm={vm} />);
    expect(vm.patientsFailed).toBe(false);
    expect(screen.getByText(/won’t be linked to one/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Link to visit note')).not.toBeInTheDocument();
  });
});
