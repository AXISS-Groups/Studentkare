import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { CampusBlocksScreen, CampusMessScreen, CampusOutbreakScreen, CampusSanitaryScreen, CampusWaterScreen, RADAR_BOARDS } from '../radarBoards';
import { CAMPUS_MIN_GROUP, groupFigure } from '../boardKit';

afterEach(() => navigate.mockReset());

const BOARDS = [
  ['Water radar', CampusWaterScreen, ['Out of limit', 'Sensor offline', 'Supply cut', 'Last lab test'], 'Water readings aren’t connected yet'],
  ['Sanitary audit', CampusSanitaryScreen, ['Closed pending action', 'Re-inspection due', 'Overdue inspection', 'Mean score'], 'Inspections aren’t connected yet'],
  ['Mess & diet', CampusMessScreen, ['Active requirements', 'Anaphylaxis risk', 'Clinician-confirmed', 'Diagnoses shared'], 'Diet requirements aren’t connected yet'],
  ['Hostel blocks', CampusBlocksScreen, ['Blocks', 'Rooms', 'Below minimum cover', 'No named warden'], 'Hostel blocks aren’t set up yet'],
  ['Outbreak radar', CampusOutbreakScreen, ['Blocks over threshold', 'Watching', 'Suppression floor', 'Names visible'], 'Symptom reports aren’t connected yet'],
] as const;

describe('public-health and block boards (no data source)', () => {
  it.each(BOARDS)('%s draws the canvas layout with every figure "—" and no rows', async (title, Screen, stats, unconnected) => {
    const { container } = render(<Screen />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    for (const label of stats) {
      const term = screen.getByText(label, { selector: 'dt' });
      expect(term.parentElement).toHaveTextContent('—');
    }
    const table = screen.getByRole('table', { name: title });
    // One full-width "not connected" row; no sample data.
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText(unconnected)).toBeInTheDocument();
    // No status badge claims anything without data.
    expect(container.querySelector('.sk-ctp-badge')).toBeNull();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('draws the outbreak board picture from src/assets, decoratively', () => {
    const { container } = render(<CampusOutbreakScreen />);
    const art = container.querySelector('img[data-art="image-b2694b.png"]');
    expect(art).not.toBeNull();
    expect(art).toHaveAttribute('aria-hidden', 'true');
    expect(RADAR_BOARDS.outbreak.art).toBe('image-b2694b.png');
  });

  it('never states a suppression floor or "0 names" it cannot source', () => {
    render(<CampusOutbreakScreen />);
    expect(screen.queryByText(/k ≥/)).toBeNull();
    expect(screen.queryByText(/^0$/)).toBeNull();
  });

  it('leaves out closing sentences that describe behaviour the app does not have', () => {
    render(<CampusWaterScreen />);
    expect(screen.queryByText(/lab result cuts a supply/)).toBeNull();
    render(<CampusOutbreakScreen />);
    expect(screen.queryByText(/opens an incident/)).toBeNull();
  });
});

describe('minimum group size', () => {
  it('reads the console query guard floor and withholds smaller non-zero groups', () => {
    expect(CAMPUS_MIN_GROUP).toBe(20);
    expect(groupFigure(0)).toEqual({ shown: true, value: 0 });
    expect(groupFigure(CAMPUS_MIN_GROUP - 1)).toEqual({ shown: false });
    expect(groupFigure(CAMPUS_MIN_GROUP)).toEqual({ shown: true, value: CAMPUS_MIN_GROUP });
  });
});

