import React from 'react';
import { Linking } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { fakeRequest, listing } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { PUBLIC_NAV, FOOTER_COLUMNS } from '@/design-system/public-site/publicSiteNav';
import { directionsUrl, distanceKm, distanceParts, mapUrl, telUrl } from '../model/geo';
import type { Locate } from '../model/location';
import type { Facility } from '../model/types';
import { CareDirectoryViewModel, departmentName } from '../viewmodel/CareDirectoryViewModel';
import { FindCare } from '../views/CareDirectoryView';
import { checkedDate } from '../views/careDirectoryParts';
import type { FindCareLinks } from '../views/CareDirectoryView';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

let openURL: ReturnType<typeof vi.spyOn>;
beforeEach(() => { motionFlag.reduced = true; openURL = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined); });
afterEach(() => { cleanup(); openURL.mockRestore(); });

const HERE = { latitude: 17.385, longitude: 78.4867 };      // the student, in memory only
const NEAR = { latitude: 17.39, longitude: 78.49 };          // under 1 km away
const FAR = { latitude: 17.45, longitude: 78.38 };           // about 13 km away

const place = (over: Partial<Facility>): Facility => ({
  id: 'cf_city', source: 'CURATED', kind: 'HOSPITAL', name: 'City Hospital', departments: ['Emergency', 'Orthopaedics'], address: 'Road 1, Banjara Hills',
  area: 'Banjara Hills', pincode: '500034', coordinates: FAR, phone: '+91 40 2301 6000', emergency24x7: true, hoursText: null,
  verifiedOn: '2026-10-12', sourceNote: 'Called the front desk', sourceUrl: null, campus: null, ...over,
});

const page = (items: Facility[]) => ({ items, total: items.length, rankedBy: 'your campus first', registry: { provider: 'abdm_hfr', configured: false, state: 'NOT_CONFIGURED', message: '' } });

const granted: Locate = () => Promise.resolve({ status: 'granted', coordinates: HERE });
const denied: Locate = () => Promise.resolve({ status: 'denied' });

function links() {
  const l = { back: vi.fn<() => void>(), sos: vi.fn<() => void>(), book: vi.fn<FindCareLinks['book']>() };
  return l satisfies FindCareLinks;
}

function setup(routes: Record<string, unknown>, opts: { locate?: Locate; signedIn?: boolean } = {}) {
  const fake = fakeRequest(routes);
  const vm = new CareDirectoryViewModel({ locate: opts.locate ?? granted, signedIn: opts.signedIn ?? true, request: fake.request });
  return { vm, calls: fake.calls };
}

describe('geo: computed on the device', () => {
  it('measures great-circle distance and reads it in metres or kilometres', () => {
    expect(distanceKm(HERE, HERE)).toBe(0);
    expect(distanceKm(HERE, NEAR)).toBeGreaterThan(0.5);
    expect(distanceKm(HERE, NEAR)).toBeLessThan(1);
    expect(distanceKm(HERE, FAR)).toBeGreaterThan(12);
    expect(distanceParts(0.42)).toEqual({ unit: 'm', value: 400 });
    expect(distanceParts(0.01)).toEqual({ unit: 'm', value: 50 });
    expect(distanceParts(4.24)).toEqual({ unit: 'km', value: '4.2' });
    expect(distanceParts(12.6)).toEqual({ unit: 'km', value: '13' });
  });

  it('hands off with the destination only: no key, and never the student\'s position', () => {
    expect(directionsUrl(NEAR)).toBe('https://www.google.com/maps/dir/?api=1&destination=17.39,78.49');
    expect(mapUrl(NEAR)).toBe('https://www.google.com/maps/search/?api=1&query=17.39,78.49');
    expect(directionsUrl(NEAR)).not.toMatch(/origin|key=/);
    expect(telUrl('+91 40 2301-6000')).toBe('tel:+914023016000');
  });

  it('reads a verified-on date as a calendar day', () => {
    expect(checkedDate('2026-10-12')).toMatch(/12/);
    expect(checkedDate('2026-10-12')).toMatch(/2026/);
    expect(checkedDate(null)).toBe('');
    expect(checkedDate('nonsense')).toBe('');
  });

  it('names departments from catalogue categories', () => {
    expect(departmentName('general-medicine')).toBe('General medicine');
    expect(departmentName('dermatology')).toBe('Dermatology');
  });
});

describe('CareDirectoryViewModel', () => {
  it('loads a tab once, sorts by distance only after the student shares their location, and never sends it', async () => {
    const far = place({ id: 'cf_far', name: 'Apollo', coordinates: FAR });
    const near = place({ id: 'cf_near', name: 'Zen Clinic', kind: 'CLINIC', coordinates: NEAR });
    const pinless = place({ id: 'cf_nopin', name: 'Banjara Clinic', kind: 'CLINIC', coordinates: null });
    const { vm, calls } = setup({ '/care-directory?segment=hospitals': page([far, pinless, near]) });
    vm.start();
    await waitFor(() => expect(vm.placePhase).toBe('ready'));
    expect(vm.listed.map((p) => p.facility.name)).toEqual(['Apollo', 'Banjara Clinic', 'Zen Clinic']);
    expect(vm.listed.every((p) => p.distanceKm === null)).toBe(true);

    await vm.useLocation();
    expect(vm.location).toBe('on');
    expect(vm.listed.map((p) => p.facility.name)).toEqual(['Zen Clinic', 'Apollo', 'Banjara Clinic']);
    expect(vm.listed[2]?.distanceKm).toBeNull();

    vm.select('pharmacies');
    vm.select('hospitals');
    expect(calls.filter((c) => c.path === '/care-directory?segment=hospitals')).toHaveLength(1);
    const sent = JSON.stringify(calls);
    expect(sent).not.toContain(String(HERE.latitude));
    expect(sent).not.toContain(String(HERE.longitude));

    vm.stopLocation();
    expect(vm.listed[0]?.facility.name).toBe('Apollo');
  });

  it.each(['denied', 'unavailable', 'timeout', 'unsupported'] as const)('location %s keeps name order and says so', async (status) => {
    const { vm } = setup({ '/care-directory?segment=hospitals': page([place({})]) }, { locate: () => Promise.resolve({ status }) });
    vm.start();
    await vm.useLocation();
    expect(vm.location).toBe(status);
    expect(vm.listed[0]?.distanceKm).toBeNull();
  });

  it('groups doctors by department; slots only for a signed-in student', async () => {
    const consults = { items: [
      listing({ id: 'c1', kind: 'consultation', name: 'General consultation', brand: 'Dr. Meera Rao', category: 'general-medicine', pricePaise: 29900 }),
      listing({ id: 'c2', kind: 'consultation', name: 'Skin consultation', brand: 'Dr. Arjun Das', category: 'dermatology', pricePaise: 39900 }),
      listing({ id: 'c3', kind: 'consultation', name: 'Fever clinic', brand: 'Dr. Asha K', category: 'general-medicine', pricePaise: 19900 }),
    ] };
    const signedOut = setup({ '/catalog?kind=consultation': consults }, { signedIn: false });
    signedOut.vm.start('doctors');
    await waitFor(() => expect(signedOut.vm.doctorsPhase).toBe('ready'));
    expect(signedOut.vm.departments.map((d) => [d.name, d.options.map((o) => o.service.brand)])).toEqual([
      ['Dermatology', ['Dr. Arjun Das']], ['General medicine', ['Dr. Asha K', 'Dr. Meera Rao']],
    ]);
    expect(signedOut.calls.some((c) => c.path.startsWith('/appointments/availability'))).toBe(false);

    const later = new Date(Date.now() + 3 * 3_600_000).toISOString();
    const signedIn = setup({ '/catalog?kind=consultation': consults, '/appointments/availability': { slots: [{ id: 's', slotStart: later, slotEnd: later, capacity: 1, booked: 0, available: 1 }] } });
    signedIn.vm.start('doctors');
    await waitFor(() => expect(signedIn.vm.doctors.every((o) => o.next)).toBe(true));
  });

  it('opens a place from the list at once, and by id with the server\'s answer', async () => {
    const city = place({});
    const { vm, calls } = setup({
      '/care-directory?segment=hospitals': page([city]),
      '/care-directory/cf_gone': () => { throw new ApiError('This place is not in the directory.', 404); },
      '/care-directory/cf_other': place({ id: 'cf_other', name: 'Other' }),
    });
    vm.start();
    await waitFor(() => expect(vm.placePhase).toBe('ready'));
    await vm.openById('cf_city');
    expect(vm.detail?.name).toBe('City Hospital');
    expect(calls.filter((c) => c.path.startsWith('/care-directory/'))).toHaveLength(0);
    await vm.openById('cf_gone');
    expect(vm.detailPhase).toBe('missing');
    await vm.openById('cf_other');
    expect(vm.detail?.name).toBe('Other');
    vm.closeDetail();
    expect(vm.detailPhase).toBe('idle');
  });
});

describe('FindCare view', () => {
  it('pins 112 and 108 before anything loads, and keeps them on an error', async () => {
    const { vm } = setup({ '/care-directory?segment=hospitals': () => new Promise(() => undefined) });
    vm.start();
    wrap(<FindCare vm={vm} links={links()} />);
    fireEvent.click(screen.getByTestId('fc-emergency-112'));
    expect(openURL).toHaveBeenCalledWith('tel:112');
    fireEvent.click(screen.getByTestId('fc-emergency-108'));
    expect(openURL).toHaveBeenCalledWith('tel:108');
    cleanup();

    const failing = setup({ '/care-directory?segment=hospitals': new Error('down') });
    failing.vm.start();
    wrap(<FindCare vm={failing.vm} links={links()} />);
    await screen.findByText('This list didn’t load');
    expect(screen.getByTestId('fc-emergency-112')).toBeTruthy();
    expect(screen.getByText('FC-LIST')).toBeTruthy();
  });

  it.each([
    ['hospitals', '/care-directory?segment=hospitals', page([]), 'No checked hospitals here yet'],
    ['pharmacies', '/care-directory?segment=pharmacies', page([]), 'No checked pharmacies here yet'],
    ['ambulance', '/care-directory?segment=ambulance', page([]), 'No ambulance services listed yet'],
    ['doctors', '/catalog?kind=consultation', { items: [] }, 'No doctors to book yet'],
  ] as const)('%s: an honest empty state, no sample rows', async (segment, path, body, title) => {
    const { vm } = setup({ [path]: body });
    vm.start(segment);
    wrap(<FindCare vm={vm} links={links()} />);
    expect(await screen.findByTestId(`fc-empty-${segment}`)).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
  });

  it('draws a card from real fields only: call and directions only when the listing has them', async () => {
    const withAll = place({});
    const noPhoneNoPin = place({ id: 'cf_bare', name: 'Bare Clinic', kind: 'CLINIC', phone: null, coordinates: null, emergency24x7: false, hoursText: 'Mon–Sat 9 am – 5 pm' });
    const { vm } = setup({ '/care-directory?segment=hospitals': page([withAll, noPhoneNoPin]) });
    vm.start();
    const { container } = wrap(<FindCare vm={vm} links={links()} />);
    await screen.findByTestId('fc-place-cf_city');
    const card = within(screen.getByTestId('fc-place-cf_city'));
    expect(card.getByText('Open 24×7')).toBeTruthy();
    expect(card.getByText(`Checked ${checkedDate('2026-10-12')}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId('fc-cf_city-call'));
    expect(openURL).toHaveBeenCalledWith('tel:+914023016000');
    fireEvent.click(screen.getByTestId('fc-cf_city-directions'));
    expect(openURL).toHaveBeenCalledWith(directionsUrl(FAR));
    expect(screen.queryByTestId('fc-cf_bare-call')).toBeNull();
    expect(screen.queryByTestId('fc-cf_bare-directions')).toBeNull();
    expect(within(screen.getByTestId('fc-place-cf_bare')).getByText('Mon–Sat 9 am – 5 pm')).toBeTruthy();
    expect(screen.getByTestId('fc-list-hospitals').textContent).not.toMatch(/bed|rating|review|★|away|open now/i);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('asks for location only on a tap, explains it first, and shows distance once granted', async () => {
    const locate = vi.fn(granted);
    const { vm } = setup({ '/care-directory?segment=hospitals': page([place({ coordinates: NEAR })]) }, { locate });
    vm.start();
    wrap(<FindCare vm={vm} links={links()} />);
    await screen.findByTestId('fc-place-cf_city');
    expect(locate).not.toHaveBeenCalled();
    expect(screen.getByText('Your location stays on this device. We don’t send it to StudentKare or store it.')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByTestId('fc-location-action')); });
    expect(locate).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('fc-distance-cf_city')).toBeTruthy();
    expect(screen.getByText('Nearest first')).toBeTruthy();
  });

  it('location denied: the list stays, sorted by name, and says why', async () => {
    const { vm } = setup({ '/care-directory?segment=hospitals': page([place({})]) }, { locate: denied });
    vm.start();
    wrap(<FindCare vm={vm} links={links()} />);
    await screen.findByTestId('fc-place-cf_city');
    await act(async () => { fireEvent.click(screen.getByTestId('fc-location-action')); });
    expect(screen.getByTestId('fc-location-denied')).toBeTruthy();
    expect(screen.queryByTestId('fc-distance-cf_city')).toBeNull();
    expect(screen.getByTestId('fc-cf_city-directions')).toBeTruthy();
  });

  it('opens a place\'s page with how and when it was checked, and back to the list', async () => {
    const { vm } = setup({ '/care-directory?segment=hospitals': page([place({ sourceUrl: 'https://example.test/city' })]) });
    vm.start();
    const { container } = wrap(<FindCare vm={vm} links={links()} />);
    fireEvent.click(await screen.findByTestId('fc-open-cf_city'));
    expect(await screen.findByTestId('fc-detail')).toBeTruthy();
    expect(screen.getByText(`Checked on ${checkedDate('2026-10-12')} · Called the front desk`)).toBeTruthy();
    expect(screen.getByText('Orthopaedics')).toBeTruthy();
    expect(screen.getByTestId('fc-detail-emergency-112')).toBeTruthy();
    fireEvent.click(screen.getByTestId('fc-detail-map'));
    expect(openURL).toHaveBeenCalledWith(mapUrl(FAR));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    fireEvent.click(screen.getByTestId('fc-detail-back'));
    expect(await screen.findByTestId('fc-directory')).toBeTruthy();
  });

  it('a partner listing says it is a partner, with no phone to call', async () => {
    const partner = place({ id: 'sp_1', source: 'PARTNER', kind: 'PHARMACY', name: 'MedPlus Kandi', phone: null, emergency24x7: false, hoursText: '8 am – 10 pm', sourceNote: '' });
    const { vm } = setup({ '/care-directory?segment=pharmacies': page([partner]) });
    vm.start('pharmacies');
    wrap(<FindCare vm={vm} links={links()} />);
    expect(within(await screen.findByTestId('fc-place-sp_1')).getByText('StudentKare partner')).toBeTruthy();
    expect(screen.queryByTestId('fc-sp_1-call')).toBeNull();
    fireEvent.click(screen.getByTestId('fc-open-sp_1'));
    expect(await screen.findByText(`StudentKare partner, verified on ${checkedDate('2026-10-12')}`)).toBeTruthy();
  });

  it('the Ambulance tab keeps the campus SOS one tap away for a student', async () => {
    const l = links();
    const { vm } = setup({ '/care-directory?segment=ambulance': page([]) });
    vm.start('ambulance');
    wrap(<FindCare vm={vm} links={l} />);
    fireEvent.click(await screen.findByTestId('fc-sos-card'));
    expect(l.sos).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('fc-sos'));
    expect(l.sos).toHaveBeenCalledTimes(2);
  });

  it('signed out: no SOS card, doctors without slots, and booking asks to sign in', async () => {
    const book = vi.fn();
    const { vm, calls } = setup({ '/catalog?kind=consultation': { items: [listing({ id: 'c1', kind: 'consultation', name: 'General consultation', brand: 'Dr. Meera Rao', category: 'general', pricePaise: 29900 })] } }, { signedIn: false });
    vm.start('doctors');
    wrap(<FindCare vm={vm} links={{ book }} />);
    fireEvent.click(await screen.findByTestId('fc-doc-c1'));
    expect(book).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    expect(screen.getByText('Sign in to book')).toBeTruthy();
    expect(screen.queryByTestId('fc-sos')).toBeNull();
    expect(calls.some((c) => c.path.startsWith('/appointments'))).toBe(false);
  });

  it('switches tabs with real tab semantics', async () => {
    const { vm } = setup({ '/care-directory?segment=hospitals': page([]), '/care-directory?segment=pharmacies': page([]) });
    vm.start();
    wrap(<FindCare vm={vm} links={links()} />);
    const tab = screen.getByTestId('fc-tab-pharmacies');
    expect(tab.getAttribute('role')).toBe('tab');
    expect(tab.getAttribute('aria-selected')).toBe('false');
    fireEvent.click(tab);
    expect(await screen.findByTestId('fc-empty-pharmacies')).toBeTruthy();
    expect(screen.getByTestId('fc-tab-pharmacies').getAttribute('aria-selected')).toBe('true');
  });
});

describe('public site', () => {
  it('links Find care from the header and the footer', () => {
    expect(PUBLIC_NAV.find((link) => link.id === 'findCare')?.href).toBe('/find-care');
    expect(FOOTER_COLUMNS.flatMap((c) => c.links).some((link) => link.href === '/find-care')).toBe(true);
  });
});
