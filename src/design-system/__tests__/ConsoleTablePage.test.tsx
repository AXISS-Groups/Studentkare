import React, { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { ConsoleTablePage } from '../console/ConsoleTablePage';
import type { ConsoleTablePageProps, ConsoleTableStatus } from '../console/ConsoleTablePage';
import type { DataTableRow } from '../data/DataTable';

// Fixtures: test data only (rule 11 allows literals in fixtures).
const columns = [{ label: 'Student' }, { label: 'Roll no.' }, { label: 'Account', align: 'end' as const }];
const rows: DataTableRow[] = [
  { id: 'a', cells: [{ text: 'Aarav Sharma', weight: 'strong' }, { text: '23B81A0501', mono: true }, { pill: { label: 'Active', tone: 'positive' } }] },
  { id: 'b', cells: [{ text: 'Diya Reddy', weight: 'strong' }, { text: '23B81A0502', mono: true }, { pill: { label: 'Invited', tone: 'action' } }] },
];

function props(overrides: Partial<ConsoleTablePageProps> = {}): ConsoleTablePageProps {
  return {
    status: 'ready',
    header: { title: 'Students', subtitle: 'Account and campus details only' },
    stats: [{ label: 'Live', value: '2', tone: 'positive' }, { label: 'Pending', value: '1' }],
    statLabels: ['Live', 'Pending'],
    table: { caption: 'Students on the roster', columns, rows, footnote: 'Health data needs consent.' },
    empty: { title: 'No students yet.', body: 'Import a CSV to invite your first batch.', icon3d: 'chart-alt--p4', action: { label: 'Import students', onSelect: vi.fn() } },
    unconnected: { title: 'The roster isn’t connected yet.', body: 'Students appear once the roster is connected.' },
    error: { title: 'Couldn’t load students', reference: 'Ref ERR-503 · CampusRoster', onRetry: vi.fn(), onHelp: vi.fn() },
    loadingLabel: 'Loading students',
    ...overrides,
  };
}

const at = (status: ConsoleTableStatus, overrides: Partial<ConsoleTablePageProps> = {}) => render(<ConsoleTablePage {...props({ status, ...overrides })} />);

describe('ConsoleTablePage states', () => {
  it('ready: the board’s h1, figures, table rows and footnote', () => {
    at('ready');
    expect(screen.getByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument();
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['Live', 'Pending']);
    const table = screen.getByRole('table', { name: 'Students on the roster' });
    expect(within(table).getAllByRole('row')).toHaveLength(rows.length + 1);
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Aarav Sharma', 'Diya Reddy']);
    expect(screen.getByText('Health data needs consent.')).toBeInTheDocument();
  });

  it('loading: a labelled, busy skeleton and nothing else', () => {
    at('loading');
    expect(screen.getByLabelText('Loading students')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('empty: the board’s 3D tile, title, body and one next step', () => {
    const onSelect = vi.fn();
    const { container } = at('empty', { empty: { ...props().empty, action: { label: 'Import students', onSelect } } });
    expect(screen.getByRole('heading', { level: 1, name: 'No students yet.' })).toBeInTheDocument();
    expect(container.querySelector('[data-icon="3d:chart-alt--p4"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('ready with no rows and no filter to blame falls back to the empty state, never a blank table', () => {
    at('ready', { table: { ...props().table, rows: [] } });
    expect(screen.getByRole('heading', { name: 'No students yet.' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('not connected: the real layout with "—" figures, the designed columns and no rows', () => {
    at('unconnected', { header: { title: 'Students', badge: { label: '1 blocked', tone: 'danger' } } });
    expect(screen.getByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument();
    expect(screen.queryByText('1 blocked')).toBeNull();
    expect(screen.getAllByText('—')).toHaveLength(2);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Student', 'Roll no.', 'Account']);
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(table).toHaveTextContent('The roster isn’t connected yet.');
    expect(table.textContent).not.toMatch(/Aarav|23B81/);
  });

  it('error: an alert with the alert-triangle icon, retry, help and the reference', () => {
    const onRetry = vi.fn();
    const onHelp = vi.fn();
    const { container } = at('error', { error: { title: 'Couldn’t load students', reference: 'Ref ERR-503 · CampusRoster', detail: 'Timed out', onRetry, onHelp } });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load students');
    expect(alert).toHaveTextContent('This is on our side, not yours');
    expect(alert).toHaveTextContent('Timed out');
    expect(alert).toHaveTextContent('Ref ERR-503 · CampusRoster');
    expect(container.querySelector('[data-icon="alert-triangle"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Status & help' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onHelp).toHaveBeenCalledTimes(1);
  });
});

describe('ConsoleTablePage controls', () => {
  it('header badge and actions show with the data', () => {
    at('ready', { header: { title: 'Orders', badge: { label: '1 blocked', tone: 'danger' }, actions: <button type="button">Export CSV</button> } });
    expect(screen.getByText('1 blocked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('search and filter chips: labelled, pressed state, counts', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const { container } = at('ready', {
      search: { value: '', onChange: onSearch, label: 'Search by name or roll number', placeholder: 'Name or roll number' },
      filters: { label: 'Account status', value: 'all', onChange: onFilter, options: [{ id: 'all', label: 'All', count: '3,184' }, { id: 'pending', label: 'Pending verification', count: '14' }] },
    });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search by name or roll number' }), { target: { value: 'Diya' } });
    expect(onSearch).toHaveBeenCalledWith('Diya');
    expect(container.querySelector('[data-icon="search"]')).not.toBeNull();
    const chips = within(screen.getByRole('group', { name: 'Account status' }));
    expect(chips.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true');
    expect(chips.getByRole('button', { name: /Pending verification/ })).toHaveAttribute('aria-pressed', 'false');
    expect(chips.getByRole('button', { name: /Pending verification/ })).toHaveTextContent('14');
    fireEvent.click(chips.getByRole('button', { name: /Pending verification/ }));
    expect(onFilter).toHaveBeenCalledWith('pending');
  });

  it('a filter that matches nothing says so inside the table', () => {
    at('ready', { table: { ...props().table, rows: [] }, noMatches: { title: 'No students match', body: 'Try another name or clear the filter.' } });
    expect(screen.getByRole('table')).toHaveTextContent('No students match');
  });

  it('row actions: a trailing column named for assistive tech, one button per action', () => {
    const open = vi.fn();
    const withActions = rows.map((row) => ({ ...row, actions: [{ label: 'Open', accessibleLabel: `Open ${row.id}`, onSelect: () => open(row.id), variant: 'primary' as const }] }));
    at('ready', { table: { ...props().table, rows: withActions, rowActions: true } });
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    fireEvent.click(within(table).getByRole('button', { name: 'Open b' }));
    expect(open).toHaveBeenCalledWith('b');
  });

  it('selection: row and select-all checkboxes, and the bulk bar with the count', () => {
    function Harness() {
      const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
      return (
        <ConsoleTablePage
          {...props({
            table: { ...props().table, selection: { selectedIds: selected, onChange: setSelected, selectAllLabel: 'Select all rows on this page', rowLabel: (row) => `Select ${row.id}` } },
            bulk: { count: selected.size, actions: <button type="button">Send invite</button> },
          })}
        />
      );
    }
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Send invite' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 selected');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.getByRole('status')).toHaveTextContent('2 selected');
    expect(screen.getByRole('checkbox', { name: 'Select b' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.queryByRole('button', { name: 'Send invite' })).toBeNull();
  });

  it('pagination: summary, and previous / next disabled at the ends', () => {
    const onNext = vi.fn();
    at('ready', { pagination: { page: 1, pages: 319, shown: '10', total: '3,184', onPrevious: vi.fn(), onNext } });
    const nav = within(screen.getByRole('navigation', { name: 'Pages' }));
    expect(nav.getByText('Showing 10 of 3,184 · page 1 of 319')).toBeInTheDocument();
    expect(nav.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(nav.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('header tabs: the table area becomes their tabpanel, and an alternate replaces the table', () => {
    at('ready', { tabPanel: { id: 'panel', labelledBy: 'tab-roles' }, alternate: <p>No pending access grants</p> });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-roles');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('No pending access grants');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('plain variants: figures and table straight on the canvas', () => {
    const { container } = at('ready', { statVariant: 'plain', statsLabel: 'Accounts summary', table: { ...props().table, variant: 'plain' } });
    // The named group wraps the <dl> (axe dlitem, live-run audit #10).
    expect(screen.getByRole('group', { name: 'Accounts summary' }).querySelector('dl')).toHaveClass('sk-stats--plain');
    expect(container.querySelector('.sk-table-card--plain')).not.toBeNull();
  });

  it('draws no raw text symbols or emoji for icons', () => {
    const { container } = at('ready');
    expect(container.textContent).not.toMatch(/[✓→←✕🔒]/u);
  });
});

describe('ConsoleTablePage accessibility', () => {
  const full: Partial<ConsoleTablePageProps> = {
    search: { value: '', onChange: vi.fn(), label: 'Search by name or roll number', placeholder: 'Name or roll number' },
    filters: { label: 'Account status', value: 'all', onChange: vi.fn(), options: [{ id: 'all', label: 'All', count: '2' }] },
    pagination: { page: 1, pages: 2, shown: '2', total: '4', onPrevious: vi.fn(), onNext: vi.fn() },
    table: {
      ...props().table,
      rowActions: true,
      rows: rows.map((row) => ({ ...row, actions: [{ label: 'Open', accessibleLabel: `Open ${row.id}`, onSelect: vi.fn() }] })),
      selection: { selectedIds: new Set(['a']), onChange: vi.fn(), selectAllLabel: 'Select all rows on this page', rowLabel: (row) => `Select ${row.id}` },
    },
    bulk: { count: 1, actions: <button type="button">Send invite</button> },
  };
  it.each(['ready', 'loading', 'empty', 'unconnected', 'error'] as ConsoleTableStatus[])('%s passes axe', async (status) => {
    const { container } = render(<main><ConsoleTablePage {...props({ status, ...full })} /></main>);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('ConsoleTablePage theme', () => {
  // jsdom has no stylesheet engine: check the sources instead. Every colour is a
  // token role that the generated CSS defines for light and for dark, so the page
  // follows the theme; no hex, rgb() or hsl() literals.
  const css = ['../console/console-table-page.css', '../data/data.css'].map((file) => readFileSync(resolve(__dirname, file), 'utf8')).join('\n');
  const tokens = readFileSync(resolve(__dirname, '../../theme/tokens/generated/sk-tokens.css'), 'utf8');
  const [light, dark] = [tokens.slice(0, tokens.indexOf('prefers-color-scheme: dark')), tokens.slice(tokens.indexOf('prefers-color-scheme: dark'))];

  it('uses no colour literals', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
  });

  it('every colour role it uses exists in light and in dark', () => {
    const roles = [...new Set([...css.matchAll(/var\(--sk-color-([a-z0-9-]+)\)/g)].map((match) => match[1]))];
    expect(roles.length).toBeGreaterThan(5);
    for (const role of roles) {
      expect(light, role).toContain(`--sk-color-${role}:`);
      expect(dark, role).toContain(`--sk-color-${role}:`);
    }
  });
});
