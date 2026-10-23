import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));
const apiRequest = vi.fn();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (...args: unknown[]) => apiRequest(...args) }));

import { CampusAmbulanceScreen, CampusDischargeScreen, CampusIsolationScreen, CampusSlaScreen } from '../safetyBoards';
import { EmergencyLines } from '../safetyKit';

afterEach(() => { navigate.mockReset(); apiRequest.mockReset(); });

const BOARDS = [
  ['Isolation', CampusIsolationScreen, ['Bays occupied', 'Check overdue', 'Extended stay', 'Median stay'], 'Isolation bays aren’t connected yet', /Q-0\d|Influenza|afebrile|B-214|KC\b/],
  ['Ambulance dispatch', CampusAmbulanceScreen, ['Live now', 'Median time to scene', 'Off-campus transfer', 'Campus vehicle'], 'Ambulance dispatch isn’t connected yet', /#A-22|SK-01|Apollo|KIMS|ETA 9/],
  ['SLA escalation', CampusSlaScreen, ['Breached', 'Within target', 'Worst breach', 'Auto-closed'], 'Escalation timers aren’t connected yet', /#R-88|38 min|Escalated to/],
  ['Discharge certificates', CampusDischargeScreen, ['Issued this week', 'Stay extended', 'Early release refused', 'Issued without sign-off'], 'Discharge certificates aren’t connected yet', /NMC-TS|Dr\. A\. Reddy|Certificate issued/],
] as const;

describe('Tier 1 table boards with no data source', () => {
  it.each(BOARDS)('%s draws the canvas layout, every figure "—", no rows and no sample data', async (title, Screen, stats, unconnected, sample) => {
    const { container } = render(<Screen />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    for (const label of stats) expect(screen.getByText(label, { selector: 'dt' }).parentElement).toHaveTextContent('—');
    const table = screen.getByRole('table', { name: title });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText(unconnected)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(sample);
    // Nothing is fetched: there is no source to ask.
    expect(apiRequest).not.toHaveBeenCalled();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('keeps the privacy rule on isolation and the clinician-only rule on discharge', () => {
    render(<CampusIsolationScreen />);
    expect(document.body.textContent).toMatch(/visible to the health officer only/);
    expect(document.body.textContent).toMatch(/does not mean no student is in isolation/);
    render(<CampusDischargeScreen />);
    expect(document.body.textContent).toMatch(/only a clinician can certify/);
    expect(screen.queryByRole('button', { name: /issue|certify/i })).toBeNull();
  });

  it('never claims SLA behaviour the app does not have', () => {
    render(<CampusSlaScreen />);
    expect(document.body.textContent).not.toMatch(/escalates to a named person|Nothing on this board closes itself/);
    expect(screen.getByText('Auto-closed', { selector: 'dt' }).parentElement).toHaveTextContent('—');
  });

  it('puts the 108 call first on the ambulance board, as a keyboard-reachable link', () => {
    render(<CampusAmbulanceScreen />);
    const call = screen.getByRole('link', { name: 'Call 108 ambulance', description: 'Call 108, the ambulance service' });
    expect(call).toHaveAttribute('href', 'tel:108');
    expect(call.tabIndex).toBe(0);
  });
});

describe('EmergencyLines', () => {
  it('renders each number as a tel: link with a spoken label, the first drawn as the one to call first', () => {
    render(<EmergencyLines numbers={['108', '112', '14416']} lead="campusSafety.lines.lead" />);
    const group = screen.getByRole('group', { name: 'Emergency numbers' });
    const links = within(group).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['tel:108', 'tel:112', 'tel:14416']);
    expect(links[0]).toHaveAccessibleDescription('Call 108, the ambulance service');
    expect(links[2]).toHaveAccessibleDescription('Call Tele-MANAS, the mental-health helpline, on 14416');
    expect(links[0]).toHaveClass('cs-line--first');
    expect(group).toHaveTextContent('Life-threatening? Call 108 first.');
  });
});
