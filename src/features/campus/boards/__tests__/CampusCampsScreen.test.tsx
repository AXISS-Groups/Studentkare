import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { ApiError } from '@/data/services/http';
import { CampusCampsScreen, slotTime } from '../CampusCampsScreen';
import { PartnerCampsScreen } from '@/features/partner/camps/PartnerCampsScreen';
import { campCsv, csvCell } from '@/features/camp/host/campCsv';
import type { CampsHostSource, HostCamp, HostOptions } from '@/features/camp/host/hostApi';
import { useT } from '@/i18n';

const flush = () => act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });

function camp(over: Partial<HostCamp> = {}): HostCamp {
  return {
    id: 'c1', name: 'Eye screening', date: '2099-10-21', location: 'Main auditorium', whatToBring: '', campus: 'Test University',
    services: ['EYE_CHECK'], eligibility: 'CAMPUS_VERIFIED', pricePaise: 0, hostKind: 'CAMPUS', status: 'PUBLISHED',
    slots: [
      { id: 's1', slotStart: '9:00 AM', slotEnd: '10:00 AM', capacity: 200, booked: 150, waitlisted: 3, checkedIn: 0, cancelled: 25 },
      { id: 's2', slotStart: '10:00 AM', slotEnd: '11:00 AM', capacity: 200, booked: 7, waitlisted: 0, checkedIn: 0, cancelled: 0 },
    ],
    isHost: true, canDecide: false, canCancel: true, cancelReason: null, ...over,
  };
}

const OPTIONS: HostOptions = {
  hostKind: 'CAMPUS', campuses: ['Test University'], campusFixed: true, needsApproval: false, eligibility: ['CAMPUS_VERIFIED', 'CAMPUS_ANY'],
  services: [{ code: 'GENERAL_SCREENING', held: false }, { code: 'EYE_CHECK', held: false }, { code: 'VACCINATION', held: true }],
};

function source(items: HostCamp[] | Error, over: Partial<CampsHostSource> = {}) {
  return {
    load: vi.fn(() => (items instanceof Error ? Promise.reject(items) : Promise.resolve({ items, hostKind: 'CAMPUS' as const }))),
    options: vi.fn(async () => OPTIONS),
    create: vi.fn(async () => ({ id: 'new', status: 'PUBLISHED' })),
    decide: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    ...over,
  };
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
    render(<CampusCampsScreen source={source([], { load: vi.fn(() => new Promise<never>(() => undefined)) })} />);
    expect(screen.getByRole('status', { name: 'Loading health camps' })).toBeInTheDocument();
  });

  it('lists camps with counts per slot, withholding small groups, and no names', async () => {
    const { container } = render(<CampusCampsScreen source={source([camp(), camp({ id: 'c2', name: 'Dental check', status: 'PENDING_APPROVAL', canDecide: true, isHost: false })])} />);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Health camps' })).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Health camps' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Scheduled');
    expect(items[0]).toHaveTextContent('157');
    expect(items[1]).toHaveTextContent('Waiting for approval');
    fireEvent.click(within(items[0]).getByRole('button', { name: 'Bookings by slot' }));
    const table = within(items[0]).getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('150');
    expect(rows[2]).toHaveTextContent('Under 20');
    expect(within(items[0]).getByText('Students’ names aren’t shown here.')).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('approves a partner camp and calls a camp off with a reason', async () => {
    const live = source([camp({ status: 'PENDING_APPROVAL', canDecide: true })]);
    render(<CampusCampsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await flush();
    expect(live.decide).toHaveBeenCalledWith('c1', 'APPROVE');
    expect(screen.getByText('Approved. Students of the campus can see it and book.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Call off camp' }));
    const drawer = screen.getByRole('dialog', { name: 'Call off Eye screening?' });
    const submit = within(drawer).getByRole('button', { name: 'Call off camp' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(drawer).getByLabelText('Why (students see this)'), { target: { value: 'Hall closed' } });
    fireEvent.click(submit);
    await flush();
    expect(live.cancel).toHaveBeenCalledWith('c1', 'Hall closed');
  });

  it('creates a camp with services and two slots, held services disabled', async () => {
    const live = source([]);
    render(<CampusCampsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getAllByRole('button', { name: 'Create a camp' })[0]);
    await flush();
    const drawer = screen.getByRole('dialog', { name: 'New camp' });
    const submit = within(drawer).getByRole('button', { name: 'Create camp' });
    expect(submit).toBeDisabled();
    expect(within(drawer).getByRole('button', { name: 'Vaccination' })).toBeDisabled();
    expect(within(drawer).getByText('Test University')).toBeInTheDocument();
    fireEvent.change(within(drawer).getByLabelText('Camp name'), { target: { value: 'Eye camp' } });
    fireEvent.change(within(drawer).getByLabelText('Date'), { target: { value: '2099-11-02' } });
    fireEvent.change(within(drawer).getByLabelText('Where'), { target: { value: 'Block C lobby' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Eye check' }));
    fireEvent.change(within(drawer).getByLabelText('Starts'), { target: { value: '08:00' } });
    fireEvent.change(within(drawer).getByLabelText('Ends'), { target: { value: '07:00' } });
    fireEvent.change(within(drawer).getByLabelText('Places'), { target: { value: '120' } });
    expect(submit).toBeDisabled();
    fireEvent.change(within(drawer).getByLabelText('Ends'), { target: { value: '09:00' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add a slot' }));
    fireEvent.change(within(drawer).getAllByLabelText('Starts')[1], { target: { value: '09:00' } });
    fireEvent.change(within(drawer).getAllByLabelText('Ends')[1], { target: { value: '10:00' } });
    fireEvent.change(within(drawer).getAllByLabelText('Places')[1], { target: { value: '60' } });
    expect(within(drawer).getByText('Paid camps aren’t available yet, so every camp is free.')).toBeInTheDocument();
    fireEvent.click(submit);
    await flush();
    expect(live.create).toHaveBeenCalledWith({
      name: 'Eye camp', date: '2099-11-02', campus: 'Test University', location: 'Block C lobby', whatToBring: '', services: ['EYE_CHECK'],
      eligibility: 'CAMPUS_VERIFIED', pricePaise: 0, slots: [{ start: '08:00', end: '09:00', capacity: 120 }, { start: '09:00', end: '10:00', capacity: 60 }],
    });
    expect(live.load).toHaveBeenCalledTimes(2);
  });

  it('says what the server refused when creating fails', async () => {
    const live = source([], { create: vi.fn(async () => { throw new ApiError('held', 422, { code: 'SERVICE_HELD', message: 'held' }); }) });
    render(<CampusCampsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getAllByRole('button', { name: 'Create a camp' })[0]);
    await flush();
    const drawer = screen.getByRole('dialog', { name: 'New camp' });
    fireEvent.change(within(drawer).getByLabelText('Camp name'), { target: { value: 'Eye camp' } });
    fireEvent.change(within(drawer).getByLabelText('Date'), { target: { value: '2099-11-02' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Eye check' }));
    fireEvent.change(within(drawer).getByLabelText('Starts'), { target: { value: '08:00' } });
    fireEvent.change(within(drawer).getByLabelText('Ends'), { target: { value: '09:00' } });
    fireEvent.change(within(drawer).getByLabelText('Places'), { target: { value: '10' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Create camp' }));
    await flush();
    expect(within(drawer).getByRole('alert')).toHaveTextContent('need a clinical review');
  });

  it('shows the empty state and the error state', async () => {
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

describe('PartnerCampsScreen', () => {
  it('shows a partner its own exact counts', async () => {
    render(<PartnerCampsScreen source={source([camp()])} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Bookings by slot' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')[2]).toHaveTextContent('7');
    expect(screen.queryByText('Under 20')).not.toBeInTheDocument();
  });
});

describe('campCsv', () => {
  it('writes counts per slot, withheld on the campus console, and defuses formulas', () => {
    let t: ReturnType<typeof useT> | null = null;
    function Grab() { t = useT(); return null; }
    render(<Grab />);
    const translate = t as unknown as ReturnType<typeof useT>;
    const campus = campCsv(camp({ name: '=Eye, camp' }), true, translate).split('\r\n');
    expect(campus[0]).toBe('Camp,Date,Slot start,Slot end,Capacity,Booked,Waitlist,Checked in,Cancelled');
    expect(campus[1]).toBe('"\'=Eye, camp",2099-10-21,9:00 AM,10:00 AM,200,150,Under 20,0,25');
    const partner = campCsv(camp(), false, translate).split('\r\n');
    expect(partner[2]).toBe('Eye screening,2099-10-21,10:00 AM,11:00 AM,200,7,0,0,0');
    expect(csvCell('plain')).toBe('plain');
  });
});
