import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider, translate } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { groupCode, refusalKey } from '../data/campsApi';
import type { CampBookingView, CampListing, CampSlotView, CampsApi } from '../data/campsApi';
import { campIcs } from '../data/calendar';
import { CampsBookingViewModel } from '../viewmodel/CampsBookingViewModel';
import { M2CampsView } from '../views/M2CampsView';
import type { M2CampsLinks } from '../views/M2CampsView';

const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
const flush = () => act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CAMP: CampListing = {
  id: 'c1', name: 'Eye and dental check', date: '2099-11-02', location: 'Main auditorium', whatToBring: 'Student ID', campus: 'VNR VJIET',
  services: ['EYE_CHECK', 'DENTAL_CHECK'], eligibility: 'CAMPUS_ANY', pricePaise: 0, hostKind: 'CAMPUS', status: 'PUBLISHED',
  capacity: 40, remaining: 18, slotCount: 2, ineligibleReason: null, myStatus: null,
};

const SLOTS: CampSlotView[] = [
  { id: 's1', slotStart: '9:00 AM', slotEnd: '10:00 AM', capacity: 20, booked: 20, remaining: 0, available: false, waitlisted: 2, waitlistOpen: true, started: false },
  { id: 's2', slotStart: '10:00 AM', slotEnd: '11:00 AM', capacity: 20, booked: 2, remaining: 18, available: true, waitlisted: 0, waitlistOpen: false, started: false },
];

const BOOKING: CampBookingView = {
  id: 'a1', status: 'BOOKED', bookingCode: 'BKQ7M2XA', checkedIn: false, camp: { ...CAMP, id: 'c0', name: 'General check' },
  slot: { id: 's9', slotStart: '9:00 AM', slotEnd: '9:30 AM' }, waitlistPosition: null, changeableUntil: 4_000_000_000, canChange: true,
  campCancelled: false, cancelReason: null, updatedAt: 1,
};

function fakeApi(over: Partial<CampsApi> = {}): CampsApi & Record<keyof CampsApi, ReturnType<typeof vi.fn>> {
  const confirmation = { bookingId: 'a2', bookingCode: 'ZZZZ2222', status: 'BOOKED' as const, waitlistPosition: null, camp: { id: 'c1', name: CAMP.name, date: CAMP.date, location: CAMP.location, whatToBring: '' }, slot: { id: 's2', slotStart: '10:00 AM', slotEnd: '11:00 AM' } };
  return {
    list: vi.fn(async () => [CAMP]),
    mine: vi.fn(async () => [BOOKING]),
    slots: vi.fn(async () => SLOTS),
    book: vi.fn(async () => confirmation),
    waitlist: vi.fn(async () => ({ ...confirmation, status: 'WAITLISTED' as const, waitlistPosition: 3 })),
    reschedule: vi.fn(async () => confirmation),
    cancel: vi.fn(async () => ({ ...BOOKING, status: 'CANCELLED' as const })),
    ...over,
  } as CampsApi & Record<keyof CampsApi, ReturnType<typeof vi.fn>>;
}

function links() {
  return { back: vi.fn(), campDay: vi.fn((campId: string) => campId), verifyCampus: vi.fn(), findCare: vi.fn() } satisfies M2CampsLinks;
}

describe('CampsBookingViewModel', () => {
  it('books an open slot and shows the result moment', async () => {
    const api = fakeApi();
    const vm = new CampsBookingViewModel(api);
    vm.load();
    await flush();
    vm.open('c1');
    await flush();
    vm.choose('s2');
    expect(vm.submitKind).toBe('book');
    await vm.submit();
    expect(api.book).toHaveBeenCalledWith('c1', 's2');
    expect(vm.confirmation?.bookingCode).toBe('ZZZZ2222');
    expect(vm.openCampId).toBeNull();
  });

  it('joins the waitlist for a full slot and says the server’s reason when refused', async () => {
    const api = fakeApi({ waitlist: vi.fn(async () => { throw new ApiError('full', 409, { code: 'WAITLIST_FULL', message: 'full' }); }) });
    const vm = new CampsBookingViewModel(api);
    vm.open('c1');
    await flush();
    vm.choose('s1');
    expect(vm.submitKind).toBe('waitlist');
    await vm.submit();
    expect(vm.notice).toEqual({ key: 'camps.err.WAITLIST_FULL', tone: 'error' });
    expect(api.slots).toHaveBeenCalledTimes(2);
  });

  it('changes a booking only to another slot with room', async () => {
    const api = fakeApi();
    const vm = new CampsBookingViewModel(api);
    vm.open('c1', { ...BOOKING, camp: CAMP, slot: { id: 's2', slotStart: '10:00 AM', slotEnd: '11:00 AM' } });
    await flush();
    vm.choose('s2');
    expect(vm.submitKind).toBeNull();
    vm.choose('s1');
    expect(vm.submitKind).toBeNull();
    vm.open('c1', BOOKING);
    await flush();
    vm.choose('s2');
    expect(vm.submitKind).toBe('change');
    await vm.submit();
    expect(api.reschedule).toHaveBeenCalledWith('c1', 's2');
    expect(vm.notice).toEqual({ key: 'camps.done.changed', tone: 'success' });
  });

  it('cancels after confirming', async () => {
    const api = fakeApi();
    const vm = new CampsBookingViewModel(api);
    vm.askCancel(BOOKING);
    await vm.confirmCancel();
    expect(api.cancel).toHaveBeenCalledWith('c0');
    expect(vm.cancelTarget).toBeNull();
    expect(vm.notice?.key).toBe('camps.done.cancelled');
  });

  it('maps refusals and network failures to calm copy', () => {
    expect(refusalKey(new ApiError('x', 409, { code: 'TOO_LATE', message: 'x' }))).toBe('camps.err.TOO_LATE');
    expect(refusalKey(new ApiError('x', 0))).toBe('camps.err.offline');
    expect(refusalKey(new ApiError('x', 500, { code: 'SOMETHING_NEW' }))).toBe('camps.err.generic');
    expect(groupCode('BKQ7M2XA')).toBe('BKQ7 M2XA');
  });
});

describe('M2CampsView', () => {
  it('shows bookings with their reference, upcoming camps, and books a slot', async () => {
    const api = fakeApi();
    const vm = new CampsBookingViewModel(api);
    vm.load();
    const l = links();
    const { container } = wrap(<M2CampsView vm={vm} links={l} />);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: en('camps.title') })).toBeInTheDocument();
    const booking = screen.getByTestId('camps-booking-c0');
    expect(within(booking).getByText('BKQ7 M2XA')).toBeInTheDocument();
    expect(within(booking).getByText(en('camps.status.booked'))).toBeInTheDocument();
    const card = screen.getByTestId('camps-camp-c1');
    expect(card).toHaveTextContent(en('camps.free'));
    expect(card).toHaveTextContent(en('camps.service.EYE_CHECK'));
    expect(card).toHaveTextContent(en('camps.placesLeft', { n: 18 }));
    fireEvent.click(within(card).getByRole('button', { name: en('camps.seeSlots') }));
    await flush();
    const full = screen.getByRole('radio', { name: /9:00 AM – 10:00 AM/ });
    expect(full).toHaveAccessibleName(`9:00 AM – 10:00 AM, ${en('camps.slot.fullWait')}`);
    fireEvent.click(screen.getByRole('radio', { name: /10:00 AM – 11:00 AM/ }));
    fireEvent.click(screen.getByRole('button', { name: en('camps.book') }));
    await flush();
    expect(api.book).toHaveBeenCalledWith('c1', 's2');
    fireEvent.click(within(booking).getByRole('link', { name: en('camps.openDay') }));
    expect(l.campDay).toHaveBeenCalledWith('c0');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('confirms before cancelling, and the safe choice keeps the booking', async () => {
    const api = fakeApi();
    const vm = new CampsBookingViewModel(api);
    vm.load();
    wrap(<M2CampsView vm={vm} links={links()} />);
    await flush();
    fireEvent.click(screen.getByTestId('camps-cancel-c0'));
    expect(screen.getByRole('alertdialog', { name: en('camps.confirm.title') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('camps.confirm.keep') }));
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('explains why a camp can’t be booked, and offers campus verification', async () => {
    const api = fakeApi({ list: vi.fn(async () => [{ ...CAMP, ineligibleReason: 'NOT_VERIFIED' as const }]), mine: vi.fn(async () => []) });
    const vm = new CampsBookingViewModel(api);
    vm.load();
    const l = links();
    wrap(<M2CampsView vm={vm} links={l} />);
    await flush();
    expect(screen.getByTestId('camps-no-bookings')).toHaveTextContent(en('camps.noBookings'));
    expect(screen.queryByRole('button', { name: en('camps.seeSlots') })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: en('camps.verifyNow') }));
    expect(l.verifyCampus).toHaveBeenCalled();
  });

  it('a booking inside the cutoff can’t be changed in the app', async () => {
    const api = fakeApi({ mine: vi.fn(async () => [{ ...BOOKING, canChange: false }]) });
    const vm = new CampsBookingViewModel(api);
    vm.load();
    wrap(<M2CampsView vm={vm} links={links()} />);
    await flush();
    expect(screen.queryByTestId('camps-cancel-c0')).toBeNull();
    expect(screen.getByTestId('camps-booking-c0')).toHaveTextContent(/can’t be changed in the app/);
  });

  it('shows the empty state with one next step, and a calm error with retry', async () => {
    const empty = new CampsBookingViewModel(fakeApi({ list: vi.fn(async () => []), mine: vi.fn(async () => []) }));
    empty.load();
    const l = links();
    const { unmount } = wrap(<M2CampsView vm={empty} links={l} />);
    await flush();
    expect(screen.getByText(en('camps.emptyTitle'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('camps.findCare') }));
    expect(l.findCare).toHaveBeenCalled();
    unmount();
    const list = vi.fn(async (): Promise<CampListing[]> => { throw new ApiError('down', 503); });
    const failing = new CampsBookingViewModel(fakeApi({ list }));
    failing.load();
    wrap(<M2CampsView vm={failing} links={links()} />);
    await flush();
    expect(screen.getByText(en('camps.failed'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('common.tryAgain') }));
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('campIcs', () => {
  it('writes the booked slot as a calendar event', () => {
    const ics = campIcs({ bookingId: 'a1', camp: { name: 'Eye, camp', date: '2099-11-02', location: 'Hall', whatToBring: '' }, slot: { slotStart: '9:30 AM', slotEnd: '1:00 PM' } }, (key) => key);
    expect(ics).toContain('DTSTART:20991102T093000');
    expect(ics).toContain('DTEND:20991102T130000');
    expect(ics).toContain('SUMMARY:Eye\\, camp');
  });
});
