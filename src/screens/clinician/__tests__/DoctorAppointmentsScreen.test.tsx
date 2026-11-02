import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { StaffAppointment } from '@/data/types/workflowTypes';
import type { DoctorAppointmentsRepository } from '@/features/clinician/viewmodel/DoctorAppointmentsViewModel';
import { LanguageProvider } from '@/i18n';
import type { Lang } from '@/i18n';
import { DoctorAppointmentsScreen } from '../DoctorAppointmentsScreen';

const appointment = (id: string, status: string, customer = `Student ${id}`): StaffAppointment => ({
  id, catalogItemId: 'consult', providerId: 'prov', slotStart: '2026-10-20T10:00:00', slotEnd: '2026-10-20T10:30:00',
  status, createdAt: 0, updatedAt: 0, customer, contact: `${id}@example.test`,
});

function repo(items: StaffAppointment[], overrides: Partial<DoctorAppointmentsRepository> = {}): DoctorAppointmentsRepository {
  return {
    listAppointments: vi.fn().mockResolvedValue({ items }),
    updateAppointment: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

const settle = () => act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); });

async function show(repository: DoctorAppointmentsRepository, initial: Lang = 'en') {
  render(<LanguageProvider initial={initial}><DoctorAppointmentsScreen repository={repository} /></LanguageProvider>);
  await settle();
}

const card = (name: string) => screen.getByRole('heading', { name }).closest('article') as HTMLElement;
const buttonsIn = (element: HTMLElement) => within(element).queryAllByRole('button').map(button => button.textContent);

describe('DoctorAppointmentsScreen', () => {
  it('shows a loading state, then the steps open to each appointment', async () => {
    const repository = repo([appointment('a', 'REQUESTED'), appointment('b', 'CONFIRMED'), appointment('c', 'COMPLETED')]);
    render(<DoctorAppointmentsScreen repository={repository} />);
    expect(screen.getByRole('status')).toBeTruthy();
    await settle();
    expect(buttonsIn(card('Student a'))).toEqual(['Confirm', 'Decline']);
    expect(buttonsIn(card('Student b'))).toEqual(['Mark completed', 'Mark no-show', 'Cancel appointment']);
    expect(buttonsIn(card('Student c'))).toEqual([]);
    expect(within(card('Student c')).getByText('Completed')).toBeTruthy();
  });

  it('confirms straight away and reloads the list', async () => {
    const repository = repo([appointment('a', 'REQUESTED')]);
    await show(repository);
    fireEvent.click(within(card('Student a')).getByRole('button', { name: 'Confirm: Student a' }));
    await settle();
    expect(repository.updateAppointment).toHaveBeenCalledWith('a', 'CONFIRMED');
    expect(repository.listAppointments).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks before declining, and sends nothing when the doctor keeps it', async () => {
    const repository = repo([appointment('a', 'REQUESTED')]);
    await show(repository);
    fireEvent.click(screen.getByRole('button', { name: 'Decline: Student a' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Decline this request?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep appointment' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(repository.updateAppointment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Decline: Student a' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Decline request' }));
    await settle();
    expect(repository.updateAppointment).toHaveBeenCalledWith('a', 'CANCELLED');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks before recording a no-show or cancelling a confirmed appointment', async () => {
    const repository = repo([appointment('b', 'CONFIRMED')]);
    await show(repository);
    fireEvent.click(screen.getByRole('button', { name: 'Mark no-show: Student b' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Record no-show' }));
    await settle();
    expect(repository.updateAppointment).toHaveBeenLastCalledWith('b', 'NO_SHOW');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel appointment: Student b' }));
    expect(within(screen.getByRole('alertdialog')).getByText('Cancel this confirmed appointment?')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel appointment' }));
    await settle();
    expect(repository.updateAppointment).toHaveBeenLastCalledWith('b', 'CANCELLED');
  });

  it('completes a confirmed appointment without a dialog', async () => {
    const repository = repo([appointment('b', 'CONFIRMED')]);
    await show(repository);
    fireEvent.click(screen.getByRole('button', { name: 'Mark completed: Student b' }));
    await settle();
    expect(repository.updateAppointment).toHaveBeenCalledWith('b', 'COMPLETED');
  });

  it('says so when a change is refused, and keeps the list', async () => {
    const repository = repo([appointment('a', 'REQUESTED')], { updateAppointment: vi.fn().mockRejectedValue(new Error('That status change is not allowed.')) });
    await show(repository);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: Student a' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('That change was not saved.');
    expect(card('Student a')).toBeTruthy();
    expect(repository.listAppointments).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when nothing is booked with this doctor', async () => {
    await show(repo([]));
    expect(screen.getByText('No appointments booked with you.')).toBeTruthy();
  });

  it('shows an error with a retry when the list fails to load', async () => {
    const listAppointments = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('Network down')))
      .mockResolvedValue({ items: [appointment('a', 'REQUESTED')] });
    await show(repo([], { listAppointments }));
    expect(screen.getByRole('alert').textContent).toContain('Network down');
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    await settle();
    expect(card('Student a')).toBeTruthy();
  });

  it('reads in Telugu', async () => {
    await show(repo([appointment('a', 'REQUESTED')]), 'te');
    expect(screen.getByRole('heading', { name: 'అపాయింట్‌మెంట్‌లు' })).toBeTruthy();
    expect(within(card('Student a')).getByRole('button', { name: 'నిర్ధారించండి: Student a' })).toBeTruthy();
  });

  it('reads in Hindi', async () => {
    await show(repo([appointment('a', 'REQUESTED')]), 'hi');
    expect(within(card('Student a')).getByRole('button', { name: 'अस्वीकार करें: Student a' })).toBeTruthy();
  });
});
