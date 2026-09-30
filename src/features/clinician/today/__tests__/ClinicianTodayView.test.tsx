import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ClinicianTodayViewModel } from '../ClinicianTodayViewModel';
import { ClinicianTodayView } from '../ClinicianTodayView';
import { sampleTodaySource, unconnectedTodaySource } from '../todaySource';
import type { ClinicianTodaySource } from '../todaySource';

const NOW = new Date('2026-09-24T09:46:00');

async function renderWith(source: ClinicianTodaySource) {
  const vm = new ClinicianTodayViewModel(source, () => NOW);
  const onNavigate = vi.fn();
  render(<ClinicianTodayView viewModel={vm} clinicianName="Dr. Sameer Menon" onNavigate={onNavigate} />);
  await act(async () => { await vm.load(); });
  return { vm, onNavigate };
}

describe('ClinicianTodayView', () => {
  it('shows the day as the design lays it out', async () => {
    await renderWith(sampleTodaySource);
    expect(screen.getByRole('heading', { level: 1, name: 'Good morning, Dr. Menon' })).toBeInTheDocument();
    expect(screen.getByText('Your queue opens at 10:00. Records open only for patients who share them.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('region', { name: 'NEXT CONSULT' })).toHaveTextContent('Rohan Varma, 19');
    expect(screen.getByText('Verified at check-in · 09:58 · photo matched')).toBeInTheDocument();
    expect(screen.getByText('Penicillin allergy')).toBeInTheDocument();
  });

  it('marks the next consult as the current step', async () => {
    await renderWith(sampleTodaySource);
    const current = document.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent('Rohan Varma');
  });

  it('opens critical results from its tile, and marks unbuilt destinations unavailable', async () => {
    const { onNavigate } = await renderWith(sampleTodaySource);
    const waiting = screen.getByRole('region', { name: 'Waiting on you' });
    fireEvent.click(within(waiting).getByRole('button', { name: /Critical result/ }));
    expect(onNavigate).toHaveBeenCalledWith('clinical-review');

    const followUps = within(waiting).getByRole('button', { name: /Follow-up messages/ });
    expect(followUps).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(followUps);
    expect(onNavigate).toHaveBeenCalledTimes(1);

    fireEvent.click(within(waiting).getByRole('button', { name: /Renewals/ }));
    expect(onNavigate).toHaveBeenCalledWith('clinician/renewals');
  });

  it('toggles availability as a pressed button', async () => {
    await renderWith(sampleTodaySource);
    const toggle = screen.getByRole('button', { name: 'Taking consults' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await act(async () => { fireEvent.click(toggle); });
    expect(screen.getByRole('button', { name: 'Paused' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Paused — no new bookings');
  });

  it('shows no patient, no number and no sample when not connected', async () => {
    const { onNavigate } = await renderWith(unconnectedTodaySource);
    expect(screen.getByRole('heading', { name: 'Your day isn’t connected yet.' })).toBeInTheDocument();
    expect(screen.queryByText(/Rohan/)).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open report reviews' }));
    expect(onNavigate).toHaveBeenCalledWith('report-reviews');
  });

  it('shows a calm error with a reference and retries', async () => {
    const load = vi.fn<ClinicianTodaySource['load']>().mockRejectedValueOnce(new Error('down')).mockImplementation(() => sampleTodaySource.load());
    await renderWith({ load });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load your day');
    expect(alert).toHaveTextContent('Ref TODAY-LOAD · ClinicianToday');
    await act(async () => { fireEvent.click(within(alert).getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning');
  });

  it('shows a skeleton while loading', () => {
    const vm = new ClinicianTodayViewModel({ load: () => new Promise(() => undefined) }, () => NOW);
    render(<ClinicianTodayView viewModel={vm} clinicianName="Dr. Sameer Menon" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Loading your day')).toHaveAttribute('aria-busy', 'true');
  });
});
