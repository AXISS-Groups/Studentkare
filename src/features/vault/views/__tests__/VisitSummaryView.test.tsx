import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { VisitSummaryViewModel } from '../../viewmodel/VisitSummaryViewModel';
import type { VisitSummary, VisitSummaryHeader } from '../../viewmodel/VisitSummaryViewModel';
import { VisitSummaryView } from '../VisitSummaryView';
import { M2Responsive, M2SosProvider } from '@/design-system/m2';

type Requester = typeof import('@/data/services/http').apiRequest;

const HEADER: VisitSummaryHeader = {
  id: 'enc_1', appointmentId: 'apt_1', appointmentStart: '2026-10-10T09:00',
  doctorName: 'Dr Rao', doctorRegistrationNumber: 'TSMC-12345', signedAt: 1760086800,
};
const SUMMARY: VisitSummary = {
  ...HEADER, subjective: 'Sore throat two days.', objective: 'Tonsils inflamed.',
  assessment: 'Pharyngitis.', plan: '', prescriptions: [{ id: 'abcdef1234', issuedAt: 1760086900, status: 'ISSUED' }],
};

function setup(handler: (path: string) => unknown) {
  const request = vi.fn(async (path: string) => handler(path)) as unknown as Requester;
  const vm = new VisitSummaryViewModel(request);
  const links = { openPrescriptions: vi.fn(), openAppointments: vi.fn() };
  render(<VisitSummaryView viewModel={vm} links={links} />);
  return { vm, links, request };
}

describe('VisitSummaryView', () => {
  it('lists signed summaries and opens one with every written part of the note', async () => {
    const { vm, links } = setup((path) => (path === '/records/visit-summaries' ? { items: [HEADER] } : SUMMARY));
    expect(screen.getByLabelText('Loading your visit summaries')).toBeInTheDocument();
    await vm.load();
    expect(await screen.findByText('Consult with Dr Rao')).toBeInTheDocument();
    // The list carries no clinical text.
    expect(screen.queryByText('Pharyngitis.')).not.toBeInTheDocument();

    // The row is named by its visible text (cardLabel, WCAG 2.5.3).
    fireEvent.click(screen.getByRole('link', { name: /Consult with Dr Rao/ }));
    expect(await screen.findByText('Pharyngitis.')).toBeInTheDocument();
    expect(screen.getByText('Sore throat two days.')).toBeInTheDocument();
    expect(screen.getByText('Tonsils inflamed.')).toBeInTheDocument();
    expect(screen.getByText(/Reg\. no\. TSMC-12345/)).toBeInTheDocument();
    // An empty part is left out, not shown as a blank heading.
    expect(screen.queryByText('Plan')).not.toBeInTheDocument();
    expect(screen.getByText('Prescription ABCDEF12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open in Prescriptions' }));
    expect(links.openPrescriptions).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'All visit summaries' }));
    expect(await screen.findByRole('link', { name: /Consult with Dr Rao/ })).toBeInTheDocument();
    expect(vm.detail).toBeNull();
  });

  it('says so when there are none, with a next step', async () => {
    const { vm, links } = setup(() => ({ items: [] }));
    await vm.load();
    expect(await screen.findByText('No visit summaries yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See your appointments' }));
    expect(links.openAppointments).toHaveBeenCalled();
  });

  it('shows a calm error with a retry when the list fails', async () => {
    let fail = true;
    const { vm } = setup(() => {
      if (fail) throw new ApiError('boom', 500);
      return { items: [HEADER] };
    });
    await vm.load();
    expect(await screen.findByText('We couldn’t load your visit summaries.')).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Consult with Dr Rao')).toBeInTheDocument();
  });

  it('treats a summary the server will not show as unavailable', async () => {
    const { vm } = setup((path) => {
      if (path === '/records/visit-summaries') return { items: [] };
      throw new ApiError('Visit summary not found.', 404);
    });
    await vm.load();
    await vm.open('enc_draft');
    expect(await screen.findByText('This visit summary isn’t available.')).toBeInTheDocument();
  });

  it('drops the note text when the screen is left', async () => {
    const { vm } = setup((path) => (path === '/records/visit-summaries' ? { items: [HEADER] } : SUMMARY));
    await vm.load();
    await vm.open('enc_1');
    expect(vm.detail?.assessment).toBe('Pharyngitis.');
    vm.dispose();
    expect(vm.detail).toBeNull();
    expect(vm.items).toEqual([]);
  });

  it('desktop (parity plan §8): the list beside the open summary, nothing opened on its own, no second SOS; phone: one SOS from the shell', async () => {
    const request = vi.fn(async (path: string) => (path === '/records/visit-summaries' ? { items: [HEADER] } : SUMMARY)) as unknown as Requester;
    const vm = new VisitSummaryViewModel(request);
    const links = { openPrescriptions: vi.fn(), openAppointments: vi.fn(), back: vi.fn() };
    const sos = vi.fn();
    const { unmount } = render(<M2SosProvider value={sos}><M2Responsive layout="phone"><VisitSummaryView viewModel={vm} links={links} /></M2Responsive></M2SosProvider>);
    await vm.load();
    expect(await screen.findByRole('link', { name: /Consult with Dr Rao/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'SOS, get help now' })).toHaveLength(1);
    unmount();
    render(<M2Responsive layout="desktop"><VisitSummaryView viewModel={vm} links={links} /></M2Responsive>);
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    // Nothing is read (and audited) until the student picks a visit.
    expect(screen.getByTestId('visit-summary-pick')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: /Consult with Dr Rao/ }));
    expect(await screen.findByText('Pharyngitis.')).toBeInTheDocument();
    // The list stays beside the open summary, marking it current.
    expect(screen.getByRole('link', { name: /Consult with Dr Rao/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('visit-summary-parts')).toHaveTextContent('Sore throat two days.');
  });
});
