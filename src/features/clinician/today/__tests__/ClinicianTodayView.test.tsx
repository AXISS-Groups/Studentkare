import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ClinicianTodayViewModel } from '../ClinicianTodayViewModel';
import { ClinicianTodayView } from '../ClinicianTodayView';
import { bookingsTodaySource } from '../todaySource';
import type { ClinicianTodaySource } from '../todaySource';
import { REVIEW_ROUTES } from '../../shared/reviewRoutes';
import { bookingsFor } from '../../queue/__tests__/queueFixture';
import { fullDay } from './todayFixture';

const NOW = new Date(2026, 8, 24, 9, 46);

async function renderWith(source: ClinicianTodaySource) {
  const vm = new ClinicianTodayViewModel(source, () => NOW);
  const onNavigate = vi.fn();
  render(<ClinicianTodayView viewModel={vm} clinicianName="Dr. Sameer Menon" onNavigate={onNavigate} />);
  await act(async () => { await vm.load(); });
  return { vm, onNavigate };
}

const live = (critical: number | null = 1, reports: number | null = 0) => bookingsTodaySource(
  async () => bookingsFor(NOW),
  { critical: async () => critical, reports: async () => reports },
  () => NOW,
);

describe('ClinicianTodayView — the live bookings and counts', () => {
  it('lays the day out from today’s bookings, in slot order, without cancelled ones', async () => {
    await renderWith(live());
    expect(screen.getByRole('heading', { level: 1, name: 'Good morning, Dr. Menon' })).toBeInTheDocument();
    expect(screen.getByText('Your queue opens at 09:30. Records open only for patients who share them.')).toBeInTheDocument();
    const day = screen.getByRole('region', { name: /Today ·/ });
    expect(within(day).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Kavya Iyer'), expect.stringContaining('Rohan Varma'), expect.stringContaining('Arjun Nair'), expect.stringContaining('Sneha Patel'),
    ]);
    expect(within(day).getByText('4 consults')).toBeInTheDocument();
    expect(day.querySelector('[data-icon="check"]')).not.toBeNull();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Rohan Varma');
  });

  it('counts down to the next confirmed consult and claims no sharing, age or check-in', async () => {
    await renderWith(live());
    const next = screen.getByRole('region', { name: 'NEXT CONSULT' });
    expect(next).toHaveTextContent('Rohan Varma');
    expect(next).toHaveTextContent('Shared records not reported here yet');
    expect(next).not.toHaveTextContent(/allergy|check-in|, \d/);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '14 minutes until start');
    expect(next.querySelector('[data-icon="video-2"]')).not.toBeNull();
  });

  it('shows the counts the server reports and "—" for the ones it does not', async () => {
    const { onNavigate } = await renderWith(live(1, 0));
    const waiting = screen.getByRole('region', { name: 'Waiting on you' });
    expect(within(waiting).getByRole('button', { name: /^1 Critical result$/ })).toBeInTheDocument();
    expect(within(waiting).getByRole('button', { name: /^0 Reports to sign$/ })).toBeInTheDocument();
    expect(within(waiting).getAllByText('—')).toHaveLength(2);
    fireEvent.click(within(waiting).getByRole('button', { name: /Critical result/ }));
    expect(onNavigate).toHaveBeenCalledWith(REVIEW_ROUTES.criticalResults());
    fireEvent.click(within(waiting).getByRole('button', { name: /Renewals/ }));
    expect(onNavigate).toHaveBeenCalledWith('clinician/renewals');
  });

  it('keeps availability honest: not connected, so not a toggle', async () => {
    await renderWith(live());
    expect(screen.getByRole('button', { name: 'Availability not connected' })).toBeDisabled();
  });

  it('is the board’s empty state when nothing is booked and nothing waits', async () => {
    const { onNavigate } = await renderWith(bookingsTodaySource(async () => [], { critical: async () => 0, reports: async () => null }, () => NOW));
    expect(screen.getByRole('heading', { level: 1, name: 'No one on your list today.' })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="3d:stetho-alt--p4"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open your schedule' }));
    expect(onNavigate).toHaveBeenCalledWith('clinician/schedule');
  });

  it('still shows the page when nothing is booked but a critical result waits', async () => {
    await renderWith(bookingsTodaySource(async () => [], { critical: async () => 2, reports: async () => null }, () => NOW));
    expect(screen.getByText('No consults booked today.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^2 Critical results$/ })).toBeInTheDocument();
  });
});

describe('ClinicianTodayView — a fuller source', () => {
  it('shows sharing, camp duty and a working availability toggle with the done tick', async () => {
    await renderWith({ load: async () => fullDay(NOW), setAvailability: async () => undefined });
    expect(screen.getByText('3 records shared for this consult')).toBeInTheDocument();
    expect(screen.getByText('3 consults · 2 camp hours · 1 break')).toBeInTheDocument();
    const camp = screen.getByRole('region', { name: 'Camp duty' });
    expect(camp.querySelector('[data-icon="info"]')).not.toBeNull();
    const toggle = screen.getByRole('button', { name: 'Taking consults' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await act(async () => { fireEvent.click(toggle); });
    expect(screen.getByRole('button', { name: 'Paused' })).toHaveAttribute('aria-pressed', 'false');
    const toast = document.querySelector('.sk-toast');
    expect(toast).toHaveTextContent('Paused — no new bookings');
    expect(toast?.querySelector('[data-icon="check-2"]')).not.toBeNull();
  });
});

describe('ClinicianTodayView — other states', () => {
  it('shows no patient, no number and no sample when not connected', async () => {
    const { onNavigate } = await renderWith({ load: async () => null });
    expect(screen.getByText('Your day isn’t connected yet.')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    const waiting = screen.getByRole('region', { name: 'Waiting on you' });
    expect(within(waiting).getAllByText('—')).toHaveLength(4);
    fireEvent.click(within(waiting).getByRole('button', { name: /Reports to sign/ }));
    expect(onNavigate).toHaveBeenCalledWith(REVIEW_ROUTES.reportReviews());
  });

  it('shows a calm error with a reference and retries', async () => {
    const load = vi.fn<ClinicianTodaySource['load']>().mockRejectedValueOnce(new Error('down')).mockImplementation(async () => fullDay(NOW));
    await renderWith({ load });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load your day');
    expect(alert).toHaveTextContent('Ref TODAY-LOAD · ClinicianToday');
    expect(alert.querySelector('[data-icon="alert-triangle"]')).not.toBeNull();
    await act(async () => { fireEvent.click(within(alert).getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning');
  });

  it('shows a skeleton while loading', () => {
    const vm = new ClinicianTodayViewModel({ load: () => new Promise(() => undefined) }, () => NOW);
    render(<ClinicianTodayView viewModel={vm} clinicianName="Dr. Sameer Menon" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Loading your day')).toHaveAttribute('aria-busy', 'true');
  });
});
