import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LabSampleToReportScreen } from '../LabSampleToReportScreen';
import { LabReportingScreen } from '../LabReportingScreen';
import { LabCollectionScreen } from '../LabCollectionScreen';
import { LabColdChainScreen } from '../LabColdChainScreen';
import type { LabOrder, LabQueue } from '@/features/partner/work/labWork';
import { bindCounter, recordVerified, resetCounterSession } from '@/features/partner/work/counterSession';

/** WP-15 lab boards (Tier 1, approved 2026-10-21): fixtures only, never shipped. */

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'lab-1', fullName: 'Fixture Labs', role: 'VENDOR', partnerKind: 'LAB' } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));
const advanceLabOrder = vi.fn();
const fileLabReport = vi.fn();
vi.mock('@/features/partner/work/labWork', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/partner/work/labWork')>()),
  advanceLabOrder: (...args: unknown[]) => advanceLabOrder(...args),
  fileLabReport: (...args: unknown[]) => fileLabReport(...args),
}));

const now = Date.now() / 1000;
const order = (over: Partial<LabOrder> = {}): LabOrder => ({
  id: 'ord-0001-aaaa', patientId: 'acc1', testPanel: ['CBC'], collectionMode: 'HOME', slotStart: '', fastingRequired: false,
  collectorName: '', collectorId: '', collectionAddress: null, tubeCount: 0, collectedAt: null, handedOverAt: null, sampleId: '',
  status: 'BOOKED', criticalFlag: false, criticalNote: '', criticalAcknowledgedAt: null, rejectionReason: '', hasHeldReport: false,
  reviewedAt: null, awaitingDoctorReview: false, createdAt: now - 3600, updatedAt: now - 600, nextStates: [], ...over,
});
const queue = (items: LabOrder[]): LabQueue => ({ items, total: items.length, critical: items.filter((o) => o.criticalFlag).length });
const noOverdue = async () => ({ items: [] });
const noCollectors = async () => ({ items: [] });

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

beforeEach(() => { advanceLabOrder.mockReset(); fileLabReport.mockReset(); resetCounterSession(); setOnline(true); });
afterEach(() => setOnline(true));

describe('LabQueue (sample queue)', () => {
  it('draws the five-stage pipeline from the live queue, never a sample card', async () => {
    const items = [
      order({ id: 'a1', testPanel: ['Vitamin D'], nextStates: ['ASSIGNED', 'CANCELLED'] }),
      order({ id: 'a2', testPanel: ['Renal panel'], status: 'IN_TRANSIT', sampleId: 'SMP-1' }),
      order({ id: 'a3', testPanel: ['TSH'], status: 'REPORT_RELEASED', sampleId: 'SMP-2' }),
    ];
    render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Sample queue' })).toBeInTheDocument();
    const pipeline = screen.getByRole('list', { name: 'Where a sample goes' });
    expect(within(pipeline).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Booked', 'Collected', 'In transit', 'Analysed', 'Released']);
    expect(within(screen.getByRole('region', { name: 'Booked' })).getByText('Vitamin D')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'In transit' })).getByText('Renal panel')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Released' })).getByText('TSH')).toBeInTheDocument();
    // No source for these two: "—", never a number.
    expect(screen.getByText('Over transit window').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Redo rate, 30 days').nextElementSibling).toHaveTextContent('—');
  });

  it('a critical value the lab flagged interrupts the queue as an alert, with no lab release button', async () => {
    const items = [order({ id: 'c1', testPanel: ['Renal panel'], status: 'REPORT_READY', sampleId: 'SMP-77412', criticalFlag: true, criticalNote: 'Potassium 6.8 mmol/L' })];
    render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Critical value — interrupts the queue');
    expect(alert).toHaveTextContent('SMP-77412 · Potassium 6.8 mmol/L');
    expect(alert).toHaveTextContent(/with the reviewing doctor/);
    expect(screen.queryByRole('button', { name: /release/i })).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: 'See the critical value' }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText(/A lab never releases a result itself/)).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /release/i })).toBeNull();
  });

  it('a released critical that nobody acknowledged still interrupts; an acknowledged one does not', async () => {
    const items = [
      order({ id: 'r1', status: 'REPORT_RELEASED', sampleId: 'SMP-9', criticalFlag: true, criticalNote: 'Hb 7.1' }),
      order({ id: 'r2', status: 'REPORT_RELEASED', sampleId: 'SMP-8', criticalFlag: true, criticalNote: 'TSH 9.4', criticalAcknowledgedAt: now - 60 }),
    ];
    render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('SMP-9 · Hb 7.1');
  });

  it('marks a booking the server says was never collected; says so when that check fails', async () => {
    const items = [order({ id: 'o1', testPanel: ['Iron panel'] })];
    const { unmount } = render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={async () => ({ items: [{ id: 'o1', overdueReason: 'slot_passed', waitingSeconds: 99 }] })} collectorsSource={noCollectors} />);
    expect(await screen.findByText('Never collected')).toBeInTheDocument();
    unmount();
    render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={async () => { throw new Error('down'); }} collectorsSource={noCollectors} />);
    expect(await screen.findByText(/couldn’t check which bookings were never collected/i)).toBeInTheDocument();
  });

  it('records a sample identifier through the existing lab step', async () => {
    advanceLabOrder.mockResolvedValue({});
    const source = vi.fn(async () => queue([order({ id: 'as1', status: 'ASSIGNED', nextStates: ['SAMPLE_COLLECTED', 'CANCELLED'] })]));
    render(<LabSampleToReportScreen source={source} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    fireEvent.click(await screen.findByRole('button', { name: /Open CBC/ }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Record the sample' }));
    fireEvent.change(within(drawer).getByLabelText(/^Sample identifier/), { target: { value: 'SMP-1' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(advanceLabOrder).toHaveBeenCalledWith('as1', 'SAMPLE_COLLECTED', { sampleId: 'SMP-1' }));
    await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  });

  it('a critical flag on filing needs the lab’s note on which value', async () => {
    const items = [order({ id: 'f1', status: 'IN_ANALYSIS', sampleId: 'SMP-3', nextStates: ['REPORT_READY', 'SAMPLE_REJECTED'] })];
    render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    fireEvent.click(await screen.findByRole('button', { name: /Open CBC/ }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.click(within(drawer).getByRole('button', { name: 'File the report' }));
    fireEvent.change(within(drawer).getByLabelText('Report file'), { target: { files: [new File(['%PDF'], 'r.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(within(drawer).getByRole('checkbox'));
    expect(within(drawer).getByRole('button', { name: 'Send to a doctor for review' })).toBeDisabled();
    fireEvent.change(within(drawer).getByLabelText(/which value is critical/i), { target: { value: 'K 6.8' } });
    expect(within(drawer).getByRole('button', { name: 'Send to a doctor for review' })).toBeEnabled();
  });

  it('offline: the queue stays readable and every lab step is disabled (fail closed)', async () => {
    setOnline(false);
    const items = [order({ id: 'off1', status: 'ASSIGNED', nextStates: ['SAMPLE_COLLECTED', 'CANCELLED'] })];
    render(<LabSampleToReportScreen source={async () => queue(items)} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    expect(await screen.findAllByText(/You’re offline/)).not.toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Open CBC/ }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('button', { name: 'Record the sample' })).toBeDisabled();
  });

  it('error state carries the board reference; empty state the next step', async () => {
    const { unmount } = render(<LabSampleToReportScreen source={async () => { throw new Error('nope'); }} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    expect(await screen.findByText('Ref LAB-QUEUE · LabQueue')).toBeInTheDocument();
    unmount();
    render(<LabSampleToReportScreen source={async () => queue([])} overdueSource={noOverdue} collectorsSource={noCollectors} />);
    expect(await screen.findByRole('button', { name: 'Check your catalogue' })).toBeInTheDocument();
  });
});

describe('LabReporting (Lab reports, the board’s Release results)', () => {
  it('lists filed reports critical first, says the doctor releases, and has no batch release', async () => {
    const items = [
      order({ id: 'n1', testPanel: ['CBC'], status: 'REPORT_RELEASED', sampleId: 'S1', updatedAt: now - 60 }),
      order({ id: 'c1', testPanel: ['Renal panel'], status: 'REPORT_READY', sampleId: 'S2', criticalFlag: true, criticalNote: 'Potassium 6.8' }),
      order({ id: 'c2', testPanel: ['Haemoglobin'], status: 'REPORT_RELEASED', sampleId: 'S3', criticalFlag: true, criticalNote: 'Hb 7.1' }),
      order({ id: 'b1', testPanel: ['Lipid'], status: 'BOOKED' }),
    ];
    render(<LabReportingScreen source={async () => queue(items)} />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Renal panel');
    expect(rows[0]).toHaveTextContent('Filed · with the doctor');
    expect(rows[1]).toHaveTextContent(/not acknowledged/);
    expect(within(table).queryByText('Lipid')).toBeNull();
    expect(screen.getByText(/the reviewing doctor signs and releases it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release batch/i })).toBeNull();
    expect(screen.getByText('Median to clinician').nextElementSibling).toHaveTextContent('—');
    // No result value, reference range or name is invented.
    expect(within(table).getAllByText('In the filed report')).toHaveLength(3);
  });
});

describe('LabCollection (run sheet)', () => {
  it('lists the stops still to collect in slot order, and the next stop’s steps', async () => {
    const day = new Date();
    const at = (h: number) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`;
    const items = [
      order({ id: 'late', testPanel: ['Iron panel'], status: 'ASSIGNED', slotStart: at(9), fastingRequired: true }),
      order({ id: 'early', patientId: 'acc7', testPanel: ['Thyroid profile'], status: 'ASSIGNED', slotStart: at(8), collectionAddress: 'Block C · 108' }),
      order({ id: 'done', testPanel: ['CBC'], status: 'SAMPLE_COLLECTED', slotStart: at(7) }),
      order({ id: 'gone', testPanel: ['TSH'], status: 'REPORT_RELEASED' }),
    ];
    render(<LabCollectionScreen source={async () => queue(items)} />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([expect.stringContaining('CBC'), expect.stringContaining('Thyroid profile'), expect.stringContaining('Iron panel')]);
    expect(rows[1]).toHaveTextContent('Next');
    expect(rows[2]).toHaveTextContent('Fasting required');
    const next = screen.getByRole('region', { name: /Thyroid profile/ });
    expect(within(next).getByRole('list', { name: 'Steps at this stop' })).toHaveTextContent('Verify student');
    expect(within(next).queryByText(', done')).toBeNull();
    expect(screen.getByText('Median per stop').nextElementSibling).toHaveTextContent('—');
  });

  it('ticks "Verify student" only for the student verified at this counter', async () => {
    bindCounter('lab-1');
    recordVerified({ memberId: 'SK-ACC7', fullName: 'Fixture', university: '', rollNumber: '', campusStatus: 'VERIFIED', context: 'lab', verifiedAt: Date.now() });
    render(<LabCollectionScreen source={async () => queue([order({ id: 'early', patientId: 'acc7', testPanel: ['Thyroid profile'], status: 'ASSIGNED' })])} />);
    const steps = await screen.findByRole('list', { name: 'Steps at this stop' });
    expect(within(steps).getByText(', done')).toBeInTheDocument();
  });
});

describe('LabColdChain', () => {
  it('is not connected: "—" figures, the designed columns, no sample box and no invented range', () => {
    render(<LabColdChainScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Cold chain' })).toBeInTheDocument();
    expect(screen.getByText('Cold-chain logging isn’t connected yet.')).toBeInTheDocument();
    for (const label of ['Boxes in transit today', 'Breached', 'Samples held, not run', 'Logged end to end']) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent('—');
    }
    expect(screen.queryByText(/BX-\d+/)).toBeNull();
    expect(screen.queryByText(/°C/)).toBeNull();
  });
});
