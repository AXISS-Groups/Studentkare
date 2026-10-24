import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));

import { M2Responsive, M2SosProvider } from '@/design-system/m2';
import type { M2Layout } from '@/design-system/m2';
import type { StudentLabTest } from '@/features/studentweb/views/t1/WebMyLabTestsView';
import { axeViolations, describeViolations } from '@/test/axe';
import { pickReport } from '../viewmodel/releasedReports';
import { ReportInsightsView } from '../views/ReportInsightsView';
import type { ReportInsightsLinks } from '../views/ReportInsightsView';

/**
 * Report insights, the detail page of My health's "Reviewed lab reports" card
 * (Tier 1 parity plan 2026-10-24 §3; boards T1ReportInsights / Desktop).
 */
afterEach(cleanup);

const lab = (id: string, status: string, extra: Partial<StudentLabTest> = {}): StudentLabTest => ({
  id, status, testPanel: ['CBC'], collectionMode: 'HOME', slotStart: null, collectedAt: null, reportDocumentId: '', reviewedAt: null, reviewNote: '', reviewedByDoctor: '', orderedByDoctor: '', createdAt: 1_760_000_000, ...extra,
});
const older = lab('l1', 'REPORT_RELEASED', { reportDocumentId: 'd1', reviewedAt: 1_760_000_100, reviewNote: 'Older note', reviewedByDoctor: 'Dr A', collectedAt: 1_759_000_000 });
const newer = lab('l2', 'REPORT_RELEASED', { reportDocumentId: 'd2', reviewedAt: 1_760_000_200, reviewNote: 'Newer note', reviewedByDoctor: 'Dr B', testPanel: ['Thyroid profile'] });
const held = lab('l3', 'REPORT_READY', { reviewNote: 'secret' });

function links(): ReportInsightsLinks {
  return { back: vi.fn(), labTests: vi.fn(), talk: vi.fn(), addOutside: vi.fn(), download: vi.fn() };
}

function mount(layout: M2Layout, props: Partial<React.ComponentProps<typeof ReportInsightsView>> = {}, sos?: () => void) {
  const to = links();
  const ui = (
    <M2Responsive layout={layout}>
      <ReportInsightsView tests={[older, newer, held]} loading={false} failed={false} online onRetry={vi.fn()} askedId={null} links={to} locale="en-IN" wide={layout !== 'phone'} {...props} />
    </M2Responsive>
  );
  return { to, ...render(sos ? <M2SosProvider value={sos}>{ui}</M2SosProvider> : ui) };
}

describe('Report insights', () => {
  it('shows the newest released note verbatim, picks the report asked for, never a held one', () => {
    expect(pickReport([older, newer, held], null)?.id).toBe('l2');
    mount('phone', { askedId: 'l1' });
    expect(screen.getByTestId('m2-ri-note')).toHaveTextContent('Older note');
    expect(screen.getByText(/^Written by Dr A · \d+ Oct 2025$/)).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.queryByText(/AI draft|percentile score|Ask Ayush about/)).toBeNull();
    expect(screen.getByText('Nothing is released to you until a doctor has reviewed it.')).toBeInTheDocument();
  });

  it('phone: one SOS from the shell; desktop: none of its own, two columns and the history as a table', async () => {
    const sos = vi.fn();
    mount('phone', {}, sos);
    expect(screen.getAllByRole('button', { name: 'SOS, get help now' })).toHaveLength(1);
    expect(screen.queryByTestId('m2-ri-history-table')).toBeNull();
    cleanup();
    const { container } = mount('desktop');
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    expect(screen.getByTestId('m2-ri-summary')).toBeInTheDocument();
    expect(screen.getByTestId('m2-ri-side')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'History · 2' }));
    const table = screen.getByRole('table', { name: 'Your released lab reports' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('history opens a report by id; Download goes by document id; the next steps link out', () => {
    const { to } = mount('desktop');
    fireEvent.click(screen.getByRole('tab', { name: 'History · 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open the summary for CBC' }));
    expect(screen.getByTestId('m2-ri-note')).toHaveTextContent('Older note');
    fireEvent.click(screen.getByTestId('m2-ri-download'));
    expect(to.download).toHaveBeenCalledWith('d1');
    fireEvent.click(screen.getByRole('link', { name: /Go over it with a clinician/ }));
    expect(to.talk).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'All my lab tests' }));
    expect(to.labTests).toHaveBeenCalled();
  });

  it('states: loading, error with retry, empty with a next step, no note, offline download', () => {
    const onRetry = vi.fn();
    mount('phone', { tests: null, loading: true });
    expect(screen.getByLabelText('Loading your report')).toBeInTheDocument();
    cleanup();
    mount('phone', { tests: null, loading: false, failed: true, onRetry });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    cleanup();
    const { to } = mount('phone', { tests: [held] });
    expect(screen.getByText('No released reports yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See my lab tests' }));
    expect(to.labTests).toHaveBeenCalled();
    cleanup();
    mount('phone', { tests: [{ ...newer, reviewNote: '' }] });
    expect(screen.getByTestId('m2-ri-no-note')).toBeInTheDocument();
    cleanup();
    mount('desktop', { online: false });
    expect(screen.queryByTestId('m2-ri-download')).toBeNull();
    expect(screen.getByTestId('m2-ri-download-offline')).toHaveTextContent('Needs a connection');
  });
});
