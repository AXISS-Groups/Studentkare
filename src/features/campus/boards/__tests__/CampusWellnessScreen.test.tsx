import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { ApiError } from '@/data/services/http';
import { CampusWellnessScreen } from '../CampusWellnessScreen';
import type { WellnessSession, WellnessSource } from '../CampusWellnessScreen';

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });
const source = (result: WellnessSession[] | Error): WellnessSource => ({
  load: vi.fn(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result))),
});

const session = (id: string, sittings: WellnessSession['sittings']): WellnessSession => ({
  id, name: `Session ${id}`, category: 'Yoga', description: '', pack: 'Seminar hall B', pricePaise: 0, providerName: 'Campus wellness', sittings,
});

afterEach(() => navigate.mockReset());

describe('CampusWellnessScreen', () => {
  it('shows a labelled skeleton while loading', () => {
    render(<CampusWellnessScreen source={{ load: () => new Promise(() => undefined) }} />);
    expect(screen.getByRole('status', { name: 'Loading wellness workshops' })).toHaveAttribute('aria-busy', 'true');
  });

  it('lists every upcoming sitting with real take-up, and withholds groups under the floor', async () => {
    const { container } = render(<CampusWellnessScreen source={source([
      session('a', [{ slotId: 's1', slotStart: '2026-11-01T17:00:00', slotEnd: '2026-11-01T18:00:00', capacity: 80, spotsLeft: 16 }]),
      session('b', [
        { slotId: 's2', slotStart: '2026-11-04T16:00:00', slotEnd: '2026-11-04T17:00:00', capacity: 30, spotsLeft: 0 },
        { slotId: 's3', slotStart: '2026-11-09T17:30:00', slotEnd: '2026-11-09T18:30:00', capacity: 60, spotsLeft: 55 },
      ]),
    ])} />);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Wellness workshops' })).toBeInTheDocument();
    expect(screen.getByText('1 session full')).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'Wellness workshops' })).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Session a · Campus wellness');
    expect(rows[0]).toHaveTextContent('64 of 80');
    expect(rows[0]).toHaveTextContent('Open');
    expect(rows[1]).toHaveTextContent('30 of 30');
    expect(rows[1]).toHaveTextContent('Full');
    // 5 bookings: under the minimum group size, so never the number.
    expect(rows[2]).toHaveTextContent('Under 20 of 60');
    expect(rows[2]).not.toHaveTextContent(/\b5 of 60/);
    // The withheld sitting is left out of the total, so it cannot be recovered by subtraction.
    expect(screen.getByText('Places taken').parentElement).toHaveTextContent('94+');
    expect(screen.getByText('Upcoming').parentElement).toHaveTextContent('3');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('withholds the total too when it is under the floor', async () => {
    render(<CampusWellnessScreen source={source([session('a', [{ slotId: 's1', slotStart: '2026-11-01T17:00:00', slotEnd: '', capacity: 40, spotsLeft: 37 }])])} />);
    await flush();
    expect(screen.getByText('Places taken').parentElement).toHaveTextContent('Under 20');
  });

  it('shows the empty state with the canvas next step when nothing is listed', async () => {
    render(<CampusWellnessScreen source={source([session('a', [])])} />);
    await flush();
    expect(screen.getByRole('heading', { name: 'Nothing in wellness workshops yet.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }));
    expect(navigate).toHaveBeenCalledWith('campus/students');
  });

  it('fails calmly with a reference and a retry that loads again', async () => {
    const live = source(new ApiError('down', 503));
    render(<CampusWellnessScreen source={live} />);
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load wellness workshops');
    expect(screen.getByText('Ref ERR-503 · CampusWellness')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await flush();
    expect(live.load).toHaveBeenCalledTimes(2);
  });
});
