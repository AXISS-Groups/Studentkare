import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ConsoleTableView } from '../ConsoleTableScreen';
import { ConsoleTableViewModel, unconnectedTableSource } from '../consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../consoleTable';
import { labOrdersConfig, labOrdersSample } from '../../lab-orders/ClinicianLabOrdersScreen';
import { referralsConfig, referralsSample } from '../../referrals/ClinicianReferralsScreen';
import { renewalsConfig, renewalsSample } from '../../renewals/ClinicianRenewalsScreen';
import { ayushConfig, ayushSample } from '../../ayush/ClinicianAyushScreen';
import { decisionSupportConfig, decisionSupportSample } from '../../decision-support/ClinicianDecisionSupportScreen';
import { patientsConfig, patientsSample } from '../../patients/ClinicianPatientsScreen';
import { scheduleConfig, scheduleSample } from '../../schedule/ClinicianScheduleScreen';
import { earningsConfig, earningsSample } from '../../earnings/ClinicianEarningsConsoleScreen';
import { chronicConfig, chronicSample } from '../../chronic/ClinicianChronicConsoleScreen';

async function renderWith(config: ConsoleTableConfig, source: ConsoleTableSource) {
  const vm = new ConsoleTableViewModel(source);
  const onNavigate = vi.fn();
  render(<ConsoleTableView viewModel={vm} config={config} onNavigate={onNavigate} />);
  await act(async () => { await vm.load(); });
  return { vm, onNavigate };
}

const SCREENS: [string, ConsoleTableConfig, () => ConsoleTableData][] = [
  ['lab orders', labOrdersConfig, labOrdersSample],
  ['referrals', referralsConfig, referralsSample],
  ['renewals', renewalsConfig, renewalsSample],
  ['AYUSH', ayushConfig, ayushSample],
  ['decision support', decisionSupportConfig, decisionSupportSample],
  ['my patients', patientsConfig, patientsSample],
  ['schedule', scheduleConfig, scheduleSample],
  ['earnings', earningsConfig, earningsSample],
  ['chronic', chronicConfig, chronicSample],
];

describe.each(SCREENS)('%s screen', (_name, config, sample) => {
  it('has one cell per column in every sample row', () => {
    for (const row of sample().rows) expect(row.cells).toHaveLength(config.columns.length);
  });

  it('renders the picture’s title, figures, rows and footnote', async () => {
    const data = sample();
    await renderWith(config, { load: async () => data });
    expect(screen.getByRole('heading', { level: 1, name: config.title })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: config.caption });
    expect(within(table).getAllByRole('row')).toHaveLength(data.rows.length + 1);
    const figures = screen.getAllByRole('term').map((term) => term.textContent);
    expect(figures).toEqual(data.stats.map((stat) => stat.label));
    expect(screen.getByText(config.footnote)).toBeInTheDocument();
  });

  it('shows nothing invented when not connected', async () => {
    await renderWith(config, unconnectedTableSource);
    expect(screen.getByRole('heading', { name: config.unconnected.title })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('ConsoleTableView states', () => {
  it('is empty when connected with no rows, and offers a way back', async () => {
    const { onNavigate } = await renderWith(labOrdersConfig, { load: async () => ({ stats: [], rows: [] }) });
    expect(screen.getByRole('heading', { name: labOrdersConfig.empty.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(onNavigate).toHaveBeenCalledWith('clinician');
  });

  it('shows a calm error with the screen’s reference, and retries', async () => {
    const load = vi.fn<ConsoleTableSource['load']>().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(labOrdersSample());
    await renderWith(labOrdersConfig, { load });
    expect(screen.getByRole('alert')).toHaveTextContent(labOrdersConfig.reference);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    const vm = new ConsoleTableViewModel({ load: () => new Promise(() => undefined) });
    render(<ConsoleTableView viewModel={vm} config={labOrdersConfig} onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Loading lab orders')).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the data’s subtitle over the configured one', async () => {
    await renderWith(scheduleConfig, { load: async () => scheduleSample() });
    expect(screen.getByText('Week of 29 September · VNR VJIET')).toBeInTheDocument();
  });

  it('labels each cell with its column, so the phone layout reads', async () => {
    await renderWith(patientsConfig, { load: async () => patientsSample() });
    const firstRow = screen.getAllByRole('row')[1];
    expect(within(firstRow).getByRole('rowheader')).toHaveTextContent('Krishna C.');
    expect(firstRow.querySelector('td[data-label="Consent"]')).toHaveTextContent('Share expires 04 Oct');
  });
});
