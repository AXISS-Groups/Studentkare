import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { CampusRosterScreen } from '../CampusRosterScreen';
import { checkRoster, hasRequiredColumns, parseCsv, rosterTemplate } from '../rosterImport';

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });

afterEach(() => navigate.mockReset());

describe('rosterImport', () => {
  it('parses quoted fields, doubled quotes and CRLF', () => {
    expect(parseCsv('name,roll_no\r\n"Rao, Priya","2""1"\n\n')).toEqual([['name', 'roll_no'], ['Rao, Priya', '2"1']]);
  });

  it('maps headings to template fields and counts rows that need fixing', () => {
    const check = checkRoster([
      'Full Name,Roll Number,Email,Hostel,Notes',
      'Aarav,23B81A0501,aarav@x.in,B,',
      ',23B81A0502,diya@x.in,C,',
      'Rohan,,rohan@x.in,B,',
      'Sneha,22B81A0433,not-an-email,,',
      'Kiran,23b81a0501,kiran@x.in,B,',
    ].join('\n'));
    expect(check.mapping.map((entry) => entry.field)).toEqual(['name', 'roll_no', 'email', 'hostel', null]);
    expect(check.missingFields).toEqual(['phone', 'programme', 'year', 'room']);
    expect(check.rows).toBe(5);
    expect(check.ready).toBe(1);
    expect(check.problems).toEqual([
      { row: 3, problem: 'missingName' },
      { row: 4, problem: 'missingRoll' },
      { row: 5, problem: 'badEmail' },
      { row: 6, problem: 'duplicateRoll' },
    ]);
    expect(hasRequiredColumns(check)).toBe(true);
    expect(hasRequiredColumns(checkRoster('name,phone\nA,1'))).toBe(false);
  });

  it('writes the canvas template header', () => {
    expect(rosterTemplate()).toBe('name,roll_no,email,phone,programme,year,hostel,room\n');
  });
});

describe('CampusRosterScreen', () => {
  it('draws the designed table as not connected, with no student listed, and links the real pending count', async () => {
    const { container } = render(<CampusRosterScreen source={{ pendingCount: async () => 14 }} />);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument();
    expect(screen.getByText(/Roster shows name, roll number, programme, hostel and account status/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Students' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Student', 'Roll no.', 'Programme · year', 'Hostel · room', 'Account', 'Verification · 4 checks']);
    expect(within(table).getByText('The campus roster isn’t connected yet')).toBeInTheDocument();
    const exportButton = screen.getByRole('button', { name: /Export CSV/ });
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveTextContent('there is no roster to export');
    const pending = screen.getByRole('link', { name: /14 waiting for verification/ });
    fireEvent.click(pending);
    expect(navigate).toHaveBeenCalledWith('campus/verification');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('hides the pending link when the count cannot be read or is zero', async () => {
    render(<CampusRosterScreen source={{ pendingCount: async () => null }} />);
    await flush();
    expect(screen.queryByRole('link', { name: /waiting for verification/ })).toBeNull();
  });

  it('checks a CSV on this computer and says plainly that invites are not sent', async () => {
    render(<CampusRosterScreen source={{ pendingCount: async () => 0 }} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }));
    const drawer = screen.getByRole('dialog', { name: 'Import students' });
    expect(within(drawer).getByRole('button', { name: 'Continue' })).toBeDisabled();
    const file = new File(['name,roll_no,email\nAarav,23B81A0501,aarav@x.in\n,1,b@x.in\n'], 'first-years.csv', { type: 'text/csv' });
    fireEvent.change(within(drawer).getByLabelText(/Choose a CSV file/), { target: { files: [file] } });
    expect(await within(drawer).findByText('first-years.csv · 2 rows')).toBeInTheDocument();
    expect(within(drawer).getByRole('list', { name: 'Match columns' })).toHaveTextContent('roll_noRoll number');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Continue' }));
    expect(within(drawer).getByText('Ready to invite').parentElement).toHaveTextContent('1');
    expect(within(drawer).getByText('Need fixing').parentElement).toHaveTextContent('1');
    expect(within(drawer).getByText('No name')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Continue' }));
    expect(within(drawer).getByText('Sending invites isn’t connected yet', { selector: 'strong' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /Send invites/ })).toBeDisabled();
  });
});
