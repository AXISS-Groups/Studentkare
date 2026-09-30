import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DoctorApplyViewModel } from '../DoctorApplyViewModel';
import { DoctorApplyView } from '../DoctorApplyView';
import { closedApplySource, sampleApplySource } from '../applySource';
import type { DoctorApplySource } from '../applySource';
import { APPLY_STEPS, checkUpload, fieldError } from '../applyModel';

function pdf(name = 'reg.pdf', size = 1000): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

function fillStepOne(vm: DoctorApplyViewModel): void {
  vm.set('name', 'Dr. Sameer Menon');
  vm.set('nmc', '71842');
  vm.set('council', 'NMC (national)');
  vm.attach('regdoc', pdf());
}

describe('application rules', () => {
  const [nmc] = APPLY_STEPS[0].fields.filter((f) => f.key === 'nmc');
  it('accepts council registration numbers and rejects anything else', () => {
    expect(fieldError(nmc, '71842')).toBeNull();
    expect(fieldError(nmc, 'TS-123456')).toBeNull();
    expect(fieldError(nmc, '12')).toBe('Numbers only, e.g. 71842');
    expect(fieldError(nmc, '')).toBe('Fill this in');
  });

  it('only keeps PDFs and photos under 10 MB', () => {
    expect(checkUpload({ name: 'a.pdf', size: 1000, type: 'application/pdf' })).toBeNull();
    expect(checkUpload({ name: 'a.docx', size: 1000, type: 'application/msword' })).toMatch(/PDF or a photo/);
    expect(checkUpload({ name: 'a.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' })).toMatch(/over 10 MB/);
  });
});

describe('DoctorApplyViewModel', () => {
  it('holds back an incomplete step and shows its errors only then', async () => {
    const vm = new DoctorApplyViewModel(sampleApplySource);
    expect(vm.errorFor('name')).toBeNull();
    const firstBad = await vm.next();
    expect(firstBad).toBe('name');
    expect(vm.stepIndex).toBe(0);
    expect(vm.errorFor('regdoc')).toBe('Add the certificate');
  });

  it('walks all four steps and submits', async () => {
    const submit = vi.fn<DoctorApplySource['submit']>().mockResolvedValue({ reference: 'CL-1' });
    const vm = new DoctorApplyViewModel({ open: true, submit });
    fillStepOne(vm);
    await vm.next();
    vm.set('degree', 'MBBS'); vm.set('speciality', 'General medicine'); vm.attach('degdoc', pdf('deg.pdf')); vm.set('years', '8');
    await vm.next();
    vm.toggle('modes', 'Video'); vm.toggle('languages', 'English'); vm.set('fee', '₹199');
    await vm.next();
    for (const key of ['a1', 'a2', 'a3', 'a4']) vm.set(key, true);
    await vm.next();
    expect(vm.phase).toBe('done');
    expect(vm.reference).toBe('CL-1');
    const [, files] = submit.mock.calls[0];
    expect(Object.keys(files).sort()).toEqual(['degdoc', 'regdoc']);
  });

  it('keeps answers and says nothing was sent when submitting fails', async () => {
    const vm = new DoctorApplyViewModel({ open: true, submit: () => Promise.reject(new Error('down')) }, [APPLY_STEPS[3]]);
    for (const key of ['a1', 'a2', 'a3', 'a4']) vm.set(key, true);
    await vm.next();
    expect(vm.phase).toBe('form');
    expect(vm.submitError).toMatch(/Nothing was sent/);
    expect(vm.values.a1).toBe(true);
  });

  it('rejects an unsupported file and does not keep it', () => {
    const vm = new DoctorApplyViewModel(sampleApplySource);
    vm.attach('regdoc', new File(['x'], 'cv.docx', { type: 'application/msword' }));
    expect(vm.values.regdoc).toBeUndefined();
    expect(vm.errorFor('regdoc')).toMatch(/PDF or a photo/);
  });

  it('toggles multi-choice options', () => {
    const vm = new DoctorApplyViewModel(sampleApplySource);
    vm.toggle('modes', 'Video'); vm.toggle('modes', 'Chat'); vm.toggle('modes', 'Video');
    expect(vm.values.modes).toEqual(['Chat']);
  });
});

describe('DoctorApplyView', () => {
  it('shows step 1 as the design does, with a real radio group and file input', () => {
    render(<DoctorApplyView viewModel={new DoctorApplyViewModel(sampleApplySource)} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'You and your registration' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    const council = screen.getByRole('group', { name: 'COUNCIL' });
    expect(within(council).getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByLabelText(/Registration certificate/)).toHaveAttribute('type', 'file');
  });

  it('moves focus to the first field that needs attention', async () => {
    render(<DoctorApplyView viewModel={new DoctorApplyViewModel(sampleApplySource)} onNavigate={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    const name = screen.getByLabelText('FULL NAME AS REGISTERED');
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Fill this in');
  });

  it('moves to step 2 and announces it', async () => {
    const vm = new DoctorApplyViewModel(sampleApplySource);
    render(<DoctorApplyView viewModel={vm} onNavigate={vi.fn()} />);
    act(() => fillStepOne(vm));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    const title = screen.getByRole('heading', { level: 1, name: 'Qualifications' });
    expect(title).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('shows the tracker after submitting', async () => {
    const vm = new DoctorApplyViewModel(sampleApplySource, [APPLY_STEPS[3]]);
    render(<DoctorApplyView viewModel={vm} onNavigate={vi.fn()} />);
    act(() => { for (const key of ['a1', 'a2', 'a3', 'a4']) vm.set(key, true); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit application' })); });
    expect(screen.getByRole('heading', { name: 'Application received' })).toBeInTheDocument();
    expect(screen.getByText('ref CL-2026-0417')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'What happens next' })).getAllByRole('listitem')).toHaveLength(5);
  });

  it('says applications are closed instead of offering a form that goes nowhere', () => {
    const onNavigate = vi.fn();
    render(<DoctorApplyView viewModel={new DoctorApplyViewModel(closedApplySource)} onNavigate={onNavigate} />);
    expect(screen.getByRole('heading', { name: 'Online applications aren’t open yet.' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Read about working with us' }));
    expect(onNavigate).toHaveBeenCalledWith('clinicians');
  });
});
