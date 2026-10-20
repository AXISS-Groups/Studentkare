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
import { patientsConfig as patientsConfigFor, patientsSample } from '../../patients/ClinicianPatientsScreen';
import { translate } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { scheduleConfig, scheduleSample } from '../../schedule/ClinicianScheduleScreen';
import { earningsConfig, earningsSample } from '../../earnings/ClinicianEarningsConsoleScreen';
import { chronicConfig, chronicSample } from '../../chronic/ClinicianChronicConsoleScreen';

const patientsConfig = patientsConfigFor((key: MessageKey, vars?: Vars) => translate('en', key, vars));

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

  it('shows its layout blank when not connected — columns and figures, nothing invented', async () => {
    await renderWith(config, unconnectedTableSource);
    expect(screen.getByRole('heading', { level: 1, name: config.title })).toBeInTheDocument();
    expect(screen.getByText(config.unconnected.title)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: config.caption });
    for (const column of config.columns) expect(within(table).getByRole('columnheader', { name: column.label })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    for (const label of config.statLabels) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(config.statLabels.length);
  });
});

describe('ConsoleTableView states', () => {
  it('shows the board’s empty state when connected with no rows (canvas: 3D tile, title, body)', async () => {
    const { onNavigate } = await renderWith(patientsConfig, { load: async () => ({ stats: [], rows: [] }) });
    expect(screen.getByRole('heading', { level: 1, name: patientsConfig.empty.title })).toBeInTheDocument();
    expect(screen.getByText(patientsConfig.empty.body)).toBeInTheDocument();
    expect(document.querySelector('[data-icon="3d:stetho-alt--p4"]')).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open your schedule' }));
    expect(onNavigate).toHaveBeenCalledWith('clinician/schedule');
  });

  it('matches the canvas copy for My patients', () => {
    expect(patientsConfig.title).toBe('My patients');
    expect(patientsConfig.errorTitle).toBe('Couldn’t load my patients');
    expect(patientsConfig.empty.title).toBe('No patients yet. They appear after a first consult.');
    expect(patientsConfig.columns.map((column) => column.label)).toEqual(['Student', 'Block', 'Why you have access', 'Consent', 'Left']);
  });

  it('error state draws the alert-triangle icon and sends help to support', async () => {
    const { onNavigate } = await renderWith(patientsConfig, { load: async () => { throw new Error('down'); } });
    expect(screen.getByRole('alert').querySelector('[data-icon="alert-triangle"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Status & help' }));
    expect(onNavigate).toHaveBeenCalledWith('support');
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
