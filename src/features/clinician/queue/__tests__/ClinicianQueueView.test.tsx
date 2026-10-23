import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ClinicianQueueViewModel } from '../ClinicianQueueViewModel';
import { ClinicianQueueView } from '../ClinicianQueueView';
import { bookingsQueueSource } from '../queueSource';
import type { ClinicianQueueSource } from '../queueSource';
import { REVIEW_ROUTES } from '../../shared/reviewRoutes';
import { bookingsFor, consentQueue } from './queueFixture';

const NOW = new Date(2026, 8, 24, 10, 0);

async function renderWith(source: ClinicianQueueSource) {
  const vm = new ClinicianQueueViewModel(source, () => NOW);
  const onNavigate = vi.fn();
  const view = render(<ClinicianQueueView viewModel={vm} onNavigate={onNavigate} />);
  await act(async () => { await vm.load(); });
  return { vm, onNavigate, view };
}

const consentSource = (extra: Partial<ClinicianQueueSource> = {}): ClinicianQueueSource => ({ load: async () => consentQueue(NOW), ...extra });

describe('ClinicianQueueView — today’s bookings (the live API)', () => {
  it('lists today’s requests and confirmed consults in slot order, nothing else', async () => {
    await renderWith(bookingsQueueSource(async () => bookingsFor(NOW), () => NOW));
    expect(screen.getByRole('heading', { level: 1, name: 'Today’s queue' })).toBeInTheDocument();
    expect(screen.getByText('2 booked today · 1 confirmed')).toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: 'Students in your queue' })).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Rohan V.');
    expect(cards[0]).toHaveTextContent('10:00');
    expect(cards[1]).toHaveTextContent('Booking request');
    expect(screen.queryByText(/Kavya|Diya|Sneha|Old/)).not.toBeInTheDocument();
  });

  it('claims nothing the API does not report: sharing, availability, crisis flags', async () => {
    await renderWith(bookingsQueueSource(async () => bookingsFor(NOW), () => NOW));
    expect(screen.getAllByText('Sharing not reported')).toHaveLength(2);
    expect(screen.getByText('Availability not connected')).toBeInTheDocument();
    expect(screen.getByText('Not reported yet')).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'RECORD ACCESS — ROHAN V.' });
    expect(within(panel).getByText(/nothing is assumed open/)).toBeInTheDocument();
    expect(within(panel).queryByText('Open:', { exact: false })).not.toBeInTheDocument();
    expect(panel.querySelectorAll('[data-icon="lock-4"]')).toHaveLength(2);
  });

  it('opens a confirmed consult; a request has no action until it is confirmed', async () => {
    const { onNavigate } = await renderWith(bookingsQueueSource(async () => bookingsFor(NOW), () => NOW));
    fireEvent.click(screen.getByRole('button', { name: /^Open consult with Rohan V\./ }));
    expect(onNavigate).toHaveBeenCalledWith(REVIEW_ROUTES.consultRoom());
    expect(screen.queryByRole('button', { name: /Request access|Ask to renew/ })).not.toBeInTheDocument();
  });

  it('shows the board’s empty state with one next step when nobody is booked today', async () => {
    const { onNavigate } = await renderWith(bookingsQueueSource(async () => [], () => NOW));
    expect(screen.getByRole('heading', { level: 1, name: 'No one in your queue right now.' })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="3d:stetho-alt--p4"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open your schedule' }));
    expect(onNavigate).toHaveBeenCalledWith('clinician/schedule');
  });

  it('shows a calm error with retry and a reference', async () => {
    const load = vi.fn<ClinicianQueueSource['load']>().mockRejectedValueOnce(new Error('down')).mockResolvedValue(consentQueue(NOW));
    await renderWith({ load });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Ref QUEUE-LOAD · ClinicianConsole');
    expect(alert.querySelector('[data-icon="alert-triangle"]')).not.toBeNull();
    await act(async () => { fireEvent.click(within(alert).getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('list', { name: 'Students in your queue' })).toBeInTheDocument();
  });

  it('has a loading skeleton that names itself', () => {
    const vm = new ClinicianQueueViewModel({ load: () => new Promise(() => undefined) }, () => NOW);
    render(<ClinicianQueueView viewModel={vm} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Loading today’s queue' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('ClinicianQueueView — a source that reports consent', () => {
  it('shows each student’s consent and waiting time', async () => {
    await renderWith(consentSource());
    expect(screen.getByText('6 students with an active care relationship · 2 waiting now')).toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: 'Students in your queue' })).getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('Consent active');
    expect(cards[0]).toHaveTextContent('Waiting 4m');
    expect(cards[2]).toHaveTextContent('Awaiting consent');
    expect(cards[3]).toHaveTextContent('Consent expired');
    expect(screen.getByText('Accepting consults')).toBeInTheDocument();
    expect(screen.getByText('1 flagged in the last 24 hours')).toBeInTheDocument();
  });

  it('shows record access for the selected student, always ending with the commerce lock', async () => {
    await renderWith(consentSource());
    const panel = screen.getByRole('region', { name: 'RECORD ACCESS — PRIYA N.' });
    expect(within(panel).getByText('Vitamin D Test — 20 Sep')).toBeInTheDocument();
    expect(panel.querySelector('[data-icon="check"]')).not.toBeNull();
    const rows = within(panel).getAllByRole('listitem');
    expect(rows[rows.length - 1]).toHaveTextContent('Orders and purchases');
    fireEvent.click(screen.getByRole('button', { name: /Rahul V\..*Show record access/ }));
    expect(within(screen.getByRole('region', { name: 'RECORD ACCESS — RAHUL V.' })).getByText(/sealed until Rahul renews/)).toBeInTheDocument();
  });

  it('asks an expired student to renew, then shows it was requested', async () => {
    await renderWith(consentSource({ requestAccess: async () => undefined }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ask to renew from Rahul V.' })); });
    expect(screen.getByRole('button', { name: 'Renewal requested from Rahul V.' })).toBeDisabled();
    expect(screen.getAllByRole('status').some((node) => /Renewal request sent\./.test(node.textContent ?? ''))).toBe(true);
  });
});

describe('ClinicianQueueView — not connected', () => {
  it('shows its layout with nobody in it', async () => {
    await renderWith({ load: async () => null });
    expect(screen.getByRole('heading', { level: 1, name: 'Today’s queue' })).toBeInTheDocument();
    expect(screen.getByText('Your queue isn’t connected yet.')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText('Not reported yet')).toBeInTheDocument();
  });
});
