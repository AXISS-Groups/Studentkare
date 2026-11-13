import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StaffAppointment } from '@/data/types/workflowTypes';
import type { DoctorAppointmentsRepository } from '../../viewmodel/DoctorAppointmentsViewModel';
import { BookingRequestsPanel } from '../BookingRequestsPanel';

const appt = (id: string, status: string, customer: string): StaffAppointment => ({
  id, catalogItemId: 'consult', providerId: 'doc', slotStart: '2099-01-05T10:00:00+05:30', slotEnd: '2099-01-05T10:30:00+05:30',
  status, createdAt: 1, updatedAt: 1, customer, contact: '',
});

function repo(items: StaffAppointment[]) {
  const list = vi.fn(async () => ({ items }));
  const update = vi.fn(async () => ({}));
  return { repository: { listAppointments: list, updateAppointment: update } as unknown as DoctorAppointmentsRepository, list, update };
}

describe('BookingRequestsPanel — confirm or decline a booking in the console (live-run audit #3)', () => {
  it('lists only requests, and Confirm sends CONFIRMED and tells the page to reload', async () => {
    const { repository, update } = repo([appt('a1', 'REQUESTED', 'Priya S.'), appt('a2', 'CONFIRMED', 'Rohan V.')]);
    const onChanged = vi.fn();
    render(<BookingRequestsPanel repository={repository} onChanged={onChanged} />);
    const region = await screen.findByRole('region', { name: 'Booking requests' });
    expect(within(region).getByText('Priya S.')).toBeInTheDocument();
    expect(within(region).queryByText('Rohan V.')).toBeNull();
    fireEvent.click(within(region).getByRole('button', { name: 'Confirm: Priya S.' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('a1', 'CONFIRMED'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('asks before declining, then sends CANCELLED', async () => {
    const { repository, update } = repo([appt('a1', 'REQUESTED', 'Priya S.')]);
    render(<BookingRequestsPanel repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline: Priya S.' }));
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Decline request' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('a1', 'CANCELLED'));
  });

  it('draws nothing when there are no requests', async () => {
    const { repository, list } = repo([appt('a2', 'CONFIRMED', 'Rohan V.')]);
    const { container } = render(<BookingRequestsPanel repository={repository} />);
    await waitFor(() => expect(list).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
