import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { ApiError } from '@/data/services/http';
import { CampusCampsScreen, slotTime } from '../CampusCampsScreen';
import type { CampListing, CampsSource } from '../CampusCampsScreen';

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });

function source(camps: CampListing[] | Error, create = vi.fn(async () => undefined)): CampsSource & { load: ReturnType<typeof vi.fn>; create: typeof create } {
  return { load: vi.fn(() => (camps instanceof Error ? Promise.reject(camps) : Promise.resolve(camps))), create };
}

afterEach(() => navigate.mockReset());

describe('slotTime', () => {
  it('writes the time the way student booking reads it', () => {
    expect(slotTime('09:05')).toBe('9:05 AM');
    expect(slotTime('00:30')).toBe('12:30 AM');
    expect(slotTime('12:00')).toBe('12:00 PM');
    expect(slotTime('16:45')).toBe('4:45 PM');
    expect(slotTime('')).toBe('');
  });
});

describe('CampusCampsScreen', () => {
  it('shows a labelled skeleton while loading', () => {
    render(<CampusCampsScreen source={{ load: () => new Promise(() => undefined), create: vi.fn() }} />);
    expect(screen.getByRole('status', { name: 'Loading health camps' })).toBeInTheDocument();
  });

  it('lists the real camps with capacity and bookings, withholding small groups and unknown figures', async () => {
    const { container } = render(<CampusCampsScreen source={source([
      { id: 'c2', name: 'Eye screening', date: '2020-08-12', location: 'Main auditorium', slots: [{ capacity: 400, booked: 388 }] },
      { id: 'c1', name: 'Hepatitis B vaccination', date: '2099-10-21', location: 'Block C clinic', slots: [{ capacity: 200, booked: 7 }, { capacity: 150, booked: 2 }] },
      { id: 'c3', name: 'Dental check', date: '2099-12-01', location: '', slots: null },
    ])} />);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Health camps' })).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Health camps' })).getAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Eye screening', 'Hepatitis B vaccination', 'Dental check']);
    expect(items[0]).toHaveTextContent('Past');
    expect(items[0]).toHaveTextContent('388');
    expect(items[1]).toHaveTextContent('Scheduled');
    expect(items[1]).toHaveTextContent('350');
    expect(items[1]).toHaveTextContent('Under 20');
    expect(items[2]).toHaveTextContent('—');
    for (const label of ['Needs staffing', 'Attendance, last camp', 'Students reached']) {
      expect(screen.getByText(label).parentElement).toHaveTextContent('—');
    }
    expect(screen.getByText(/Camps aren’t tied to one campus yet/)).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('creates a camp with one bookable sitting, then reloads', async () => {
    const live = source([]);
    render(<CampusCampsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Create a camp' }));
    const drawer = screen.getByRole('dialog', { name: 'New camp' });
    const submit = within(drawer).getByRole('button', { name: 'Create camp' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(drawer).getByLabelText('Camp name'), { target: { value: 'Flu shots' } });
    fireEvent.change(within(drawer).getByLabelText('Date'), { target: { value: '2099-11-02' } });
    fireEvent.change(within(drawer).getByLabelText('Where'), { target: { value: 'Block C lobby' } });
    fireEvent.change(within(drawer).getByLabelText('Starts'), { target: { value: '08:00' } });
    fireEvent.change(within(drawer).getByLabelText('Ends'), { target: { value: '11:00' } });
    fireEvent.change(within(drawer).getByLabelText('Places'), { target: { value: '120' } });
    expect(within(drawer).getByText('Every student can see and book this camp. Inviting one group isn’t available yet.')).toBeInTheDocument();
    fireEvent.click(submit);
    await flush();
    expect(live.create).toHaveBeenCalledWith({ name: 'Flu shots', date: '2099-11-02', location: 'Block C lobby', whatToBring: '', slotStart: '8:00 AM', slotEnd: '11:00 AM', capacity: 120 });
    expect(live.load).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Camp created. Students can see it and book the sitting now.')).toBeInTheDocument();
  });

  it('keeps the drawer open and says so when creating fails', async () => {
    const live = source([], vi.fn(async () => { throw new ApiError('no', 422); }));
    render(<CampusCampsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Create a camp' }));
    const drawer = screen.getByRole('dialog', { name: 'New camp' });
    fireEvent.change(within(drawer).getByLabelText('Camp name'), { target: { value: 'Flu shots' } });
    fireEvent.change(within(drawer).getByLabelText('Date'), { target: { value: '2099-11-02' } });
    fireEvent.change(within(drawer).getByLabelText('Starts'), { target: { value: '08:00' } });
    fireEvent.change(within(drawer).getByLabelText('Ends'), { target: { value: '07:00' } });
    fireEvent.change(within(drawer).getByLabelText('Places'), { target: { value: '10' } });
    // An end before the start is not a sitting.
    expect(within(drawer).getByRole('button', { name: 'Create camp' })).toBeDisabled();
    fireEvent.change(within(drawer).getByLabelText('Ends'), { target: { value: '09:00' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Create camp' }));
    await flush();
    expect(within(drawer).getByRole('alert')).toHaveTextContent('Ref ERR-422 · CampusCamps');
  });

  it('shows the empty state and the error state from the canvas', async () => {
    const { unmount } = render(<CampusCampsScreen source={source([])} />);
    await flush();
    expect(screen.getByRole('heading', { name: 'Nothing in health camps yet.' })).toBeInTheDocument();
    unmount();
    render(<CampusCampsScreen source={source(new ApiError('down', 503))} />);
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load health camps');
    expect(screen.getByText('Ref ERR-503 · CampusCamps')).toBeInTheDocument();
  });
});
