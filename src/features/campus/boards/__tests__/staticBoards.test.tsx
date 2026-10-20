import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Priya Rao', role: 'CAMPUS_ADMIN', university: 'VNR VJIET' } }) }));

import { CampusSettingsScreen } from '../CampusSettingsScreen';
import { CampusAnnouncementsScreen } from '../CampusAnnouncementsScreen';
import { CampusReportsScreen } from '../CampusReportsScreen';
import { CampusAggregateScreen } from '../CampusAggregateScreen';
import { CampusCertificatesScreen } from '../CampusCertificatesScreen';
import type { CampusCertificate, CertificatesSource } from '../CampusCertificatesScreen';

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });

describe('CampusSettingsScreen', () => {
  it('shows the real campus name and marks every unsourced part not connected, with no switch positions', async () => {
    const { container } = render(<CampusSettingsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings & requirements' })).toBeInTheDocument();
    expect(screen.getByText('VNR VJIET')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByText('Campus requirements aren’t connected yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add requirement/ })).toBeDisabled();
    expect(screen.getByText('Crisis support and the emergency card are always on and cannot be switched off.')).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('CampusAnnouncementsScreen', () => {
  it('drafts and previews on screen only; Send and Schedule are disabled with the reason', async () => {
    const { container } = render(<CampusAnnouncementsScreen />);
    expect(screen.getByText('Pick a template or type a message to preview it.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dengue alert' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Dengue season: cover up after 5 pm');
    const preview = screen.getByRole('region', { name: 'WhatsApp preview' });
    expect(preview).toHaveTextContent('Dengue season: cover up after 5 pm');
    expect(preview).toHaveTextContent('VNR VJIET health desk · reply STOP to opt out');
    expect(preview).not.toHaveTextContent('Verified business');
    expect(screen.getByRole('button', { name: /Send to students/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Schedule/ })).toBeDisabled();
    const whatsapp = screen.getByRole('button', { name: 'WhatsApp' });
    expect(whatsapp).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(whatsapp);
    expect(whatsapp).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('No announcements have been sent')).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('flags a message over the limit', () => {
    render(<CampusAnnouncementsScreen />);
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x'.repeat(321) } });
    expect(screen.getByLabelText('Message')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('321 / 320')).toBeInTheDocument();
  });
});

describe('CampusReportsScreen', () => {
  it('keeps the builder choices and the rules visible, with generating not connected', async () => {
    const { container } = render(<CampusReportsScreen />);
    expect(screen.getByText('Aggregates only · cohorts under 20 withheld · no mental or sexual health')).toBeInTheDocument();
    const types = screen.getByRole('radiogroup', { name: 'Report' });
    expect(within(types).getByRole('radio', { name: /Camp coverage/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(types).getByRole('radio', { name: /Service use/ }));
    expect(within(types).getByRole('radio', { name: /Service use/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Generate report/ })).toBeDisabled();
    expect(screen.getByText('No reports yet')).toBeInTheDocument();
    expect(screen.queryByText(/Download$/)).toBeNull();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('CampusAggregateScreen', () => {
  it('shows the floor from the guard, no individual records, and no invented figures', async () => {
    const { container } = render(<CampusAggregateScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Campus health, in aggregate' })).toBeInTheDocument();
    expect(screen.getByText(/VNR VJIET · .* · k-anonymity floor: n ≥ 20/)).toBeInTheDocument();
    expect(screen.getByText('No individual records available')).toBeInTheDocument();
    for (const label of ['Activated seats', 'Consults this month', 'Lab tests booked', 'Crisis line volume']) {
      expect(screen.getByText(label).parentElement).toHaveTextContent('—');
    }
    expect(screen.getByText('Care categories aren’t counted per campus yet')).toBeInTheDocument();
    expect(screen.queryByText(/WHAT YOU CAN ACT ON/i)).toBeNull();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

const CERT: CampusCertificate = {
  id: 'c1', studentName: 'Rohan Varma', rollNumber: '24B81A1207', purpose: 'Mid-term exam absence', issuedBy: 'Dr. S. Menon', dates: '24–26 Sep', status: 'TO_CHECK',
  checks: [{ label: 'Doctor registration found', passed: true }, { label: 'QR signature matches', passed: false }],
};

describe('CampusCertificatesScreen', () => {
  it('is not connected live: the designed columns and no certificate', async () => {
    const { container } = render(<CampusCertificatesScreen />);
    await flush();
    const table = screen.getByRole('table', { name: 'Certificates' });
    expect(within(table).getByText('Certificates aren’t connected yet')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('with a source: tabs filter, and the drawer shows validity checks and never a reason', async () => {
    const decide = vi.fn(async () => undefined);
    const source: CertificatesSource = { load: async () => [CERT, { ...CERT, id: 'c2', studentName: 'Diya Reddy', status: 'ACCEPTED' }], decide };
    render(<CampusCertificatesScreen source={source} />);
    await flush();
    const tabs = screen.getByRole('group', { name: 'Certificate status' });
    expect(within(tabs).getByRole('button', { name: /To check/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Diya Reddy')).toBeNull();
    fireEvent.click(within(tabs).getByRole('button', { name: /All/ }));
    expect(screen.getByText('Diya Reddy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open the certificate from Rohan Varma' }));
    const drawer = screen.getByRole('dialog', { name: 'Certificate · Rohan Varma' });
    expect(within(drawer).getByText('Reason: withheld — the student’s choice')).toBeInTheDocument();
    expect(within(drawer).getByText('QR signature matches').parentElement).toHaveTextContent('Did not pass');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Accept · notify department' }));
    await flush();
    expect(decide).toHaveBeenCalledWith('c1', 'ACCEPT');
  });
});
