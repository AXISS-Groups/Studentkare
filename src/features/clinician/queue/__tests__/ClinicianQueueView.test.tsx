import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ClinicianQueueViewModel } from '../ClinicianQueueViewModel';
import { ClinicianQueueView } from '../ClinicianQueueView';
import { sampleQueueSource, unconnectedQueueSource } from '../queueSource';
import type { ClinicianQueueSource } from '../queueSource';

async function renderWith(source: ClinicianQueueSource) {
  const vm = new ClinicianQueueViewModel(source);
  const onNavigate = vi.fn();
  render(<ClinicianQueueView viewModel={vm} onNavigate={onNavigate} />);
  await act(async () => { await vm.load(); });
  return { vm, onNavigate };
}

describe('ClinicianQueueView', () => {
  it('lists the queue with each student’s consent', async () => {
    await renderWith(sampleQueueSource);
    expect(screen.getByRole('heading', { level: 1, name: 'Today’s queue' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Students in your queue' });
    const cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(4);
    expect(cards[0]).toHaveTextContent('Consent active');
    expect(cards[2]).toHaveTextContent('Awaiting consent');
    expect(cards[3]).toHaveTextContent('Consent expired');
    expect(cards[0]).toHaveTextContent('Waiting 4m');
  });

  it('shows record access for the selected student, always ending with the commerce lock', async () => {
    await renderWith(sampleQueueSource);
    const panel = screen.getByRole('region', { name: 'RECORD ACCESS — PRIYA N.' });
    expect(within(panel).getByText('Vitamin D Test — 20 Sep')).toBeInTheDocument();
    const rows = within(panel).getAllByRole('listitem');
    expect(rows[rows.length - 1]).toHaveTextContent('Orders and purchases');

    fireEvent.click(screen.getByRole('button', { name: /Rahul V\..*Show record access/ }));
    const rahul = screen.getByRole('region', { name: 'RECORD ACCESS — RAHUL V.' });
    expect(within(rahul).getByText(/sealed until Rahul renews/)).toBeInTheDocument();
    expect(within(rahul).queryByText('Open:', { exact: false })).not.toBeInTheDocument();
  });

  it('asks an expired student to renew, then shows it was requested', async () => {
    await renderWith(sampleQueueSource);
    const ask = screen.getByRole('button', { name: 'Ask to renew from Rahul V.' });
    await act(async () => { fireEvent.click(ask); });
    expect(screen.getByRole('button', { name: 'Renewal requested from Rahul V.' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Renewal request sent.');
  });

  it('marks Open consult unavailable until the consult room exists', async () => {
    const { onNavigate } = await renderWith(sampleQueueSource);
    const open = screen.getByRole('button', { name: /Open consult with Priya N\..*not available yet/ });
    expect(open).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(open);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('shows nobody when not connected, and offers a way back', async () => {
    const { onNavigate } = await renderWith(unconnectedQueueSource);
    expect(screen.getByRole('heading', { name: 'Your queue isn’t connected yet.' })).toBeInTheDocument();
    expect(screen.queryByText(/Priya/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(onNavigate).toHaveBeenCalledWith('clinician');
  });

  it('shows a calm error with a reference', async () => {
    await renderWith({ load: () => Promise.reject(new Error('down')) });
    expect(screen.getByRole('alert')).toHaveTextContent('Ref QUEUE-LOAD · ClinicianConsole');
  });
});
