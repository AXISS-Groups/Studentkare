import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConsoleTablePage, SkButton } from '..';
import type { ConsoleTablePageProps, ConsoleTableStatus, DataTableRow } from '..';

const meta = { title: 'Design system/Console table page' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

// Story fixtures (CampusRoster-shaped): never used by a screen.
const rows: DataTableRow[] = [
  { id: 'r1', cells: [{ text: 'Aarav Sharma', sub: 'aarav.sharma@example.test', weight: 'strong' }, { text: '23B81A0501', mono: true }, { text: 'B.Tech CSE · 2' }, { pill: { label: 'Active', tone: 'positive' } }] },
  { id: 'r2', cells: [{ text: 'Rohan Varma', sub: 'rohan.varma@example.test', weight: 'strong' }, { text: '24B81A1207', mono: true }, { text: 'B.Tech IT · 1' }, { pill: { label: 'Invited', tone: 'action' } }] },
  { id: 'r3', muted: true, cells: [{ text: 'Kiran Kumar', sub: 'kiran.kumar@example.test', weight: 'strong' }, { text: '24B81A0366', mono: true }, { text: 'B.Tech EEE · 1' }, { pill: { label: 'Not invited', tone: 'neutral' } }] },
];

function base(status: ConsoleTableStatus): ConsoleTablePageProps {
  return {
    status,
    header: { title: 'Students', subtitle: 'Account and campus details only — no health information appears on this page' },
    stats: [{ label: 'Active', value: '2,540', tone: 'positive' }, { label: 'Pending verification', value: '14', tone: 'attention' }, { label: 'Not yet active', value: '622' }, { label: 'Rejected', value: '6' }],
    statLabels: ['Active', 'Pending verification', 'Not yet active', 'Rejected'],
    table: { caption: 'Students on the roster', columns: [{ label: 'Student' }, { label: 'Roll no.', width: '130px' }, { label: 'Programme · year' }, { label: 'Account', width: '120px', align: 'end' }], rows },
    empty: { title: 'No students yet. Import a CSV to invite your first batch.', body: 'Invite students or plan a camp to see activity here.', icon3d: 'chart-alt--p4', action: { label: 'Import students', onSelect: noop } },
    unconnected: { title: 'The roster isn’t connected yet.', body: 'Students appear here once the roster is connected. No sample data is shown.' },
    error: { title: 'Couldn’t load students', reference: 'Ref ERR-503 · CampusRoster', onRetry: noop, onHelp: noop },
    loadingLabel: 'Loading students',
  };
}

function Full() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const visible = rows.filter((row) => JSON.stringify(row.cells).toLowerCase().includes(query.toLowerCase()));
  return (
    <ConsoleTablePage
      {...base('ready')}
      header={{ ...base('ready').header, actions: <SkButton>Import students</SkButton> }}
      search={{ value: query, onChange: setQuery, label: 'Search by name or roll number', placeholder: 'Name or roll number' }}
      filters={{ label: 'Account status', value: filter, onChange: setFilter, options: [{ id: 'all', label: 'All', count: '3,184' }, { id: 'pending', label: 'Pending verification', count: '14' }, { id: 'rejected', label: 'Rejected', count: '6' }] }}
      bulk={{ count: selected.size, actions: <SkButton variant="secondary">Send invite</SkButton> }}
      table={{
        ...base('ready').table,
        rows: visible.map((row) => ({ ...row, actions: [{ label: 'Open', accessibleLabel: `Open ${row.id}`, onSelect: noop }] })),
        rowActions: true,
        selection: { selectedIds: selected, onChange: setSelected, selectAllLabel: 'Select all rows on this page', rowLabel: (row) => `Select ${row.id}` },
      }}
      noMatches={{ title: 'No students match', body: 'Try another name or clear the filter.' }}
      pagination={{ page: 1, pages: 319, shown: String(visible.length), total: '3,184', onPrevious: noop, onNext: noop }}
    />
  );
}

export const Data: Story = { render: () => <Full /> };
export const Loading: Story = { render: () => <ConsoleTablePage {...base('loading')} /> };
export const Empty: Story = { render: () => <ConsoleTablePage {...base('empty')} /> };
export const NotConnected: Story = { render: () => <ConsoleTablePage {...base('unconnected')} /> };
export const Error: Story = { render: () => <ConsoleTablePage {...base('error')} /> };
