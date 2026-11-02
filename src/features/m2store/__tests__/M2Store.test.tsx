import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider } from '@/i18n';
import { motion } from '@/design-system/theme';
import { HeroCarousel, PillNav, NAVY_STOPS } from '@/design-system/m2';
import type { HeroSlide } from '@/design-system/m2';
import { fakeRequest, listing, pkg } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { M2HomeView } from '../views/M2HomeView';
import type { M2HomeLinks } from '../views/M2HomeView';
import { M2MedicinesView } from '../views/M2MedicinesView';
import type { M2MedicinesLinks } from '../views/M2MedicinesView';
import { M2LabsView } from '../views/M2LabsView';
import { M2ConsultsView } from '../views/M2ConsultsView';
import { ConsultsViewModel, soonestOpen } from '../viewmodel/ConsultsViewModel';
import { medsSummary, nextAppointment, nextCamp } from '../data/useM2Home';
import type { M2HomeData } from '../data/useM2Home';
import { biggestPackage, matchPackages } from '../data/useLabPackages';
import { labArt, productArt } from '../data/storeArt';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const HOUR = 3_600_000;
const later = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

function homeLinks(): M2HomeLinks {
  return {
    sos: vi.fn(), menu: vi.fn(), notifications: vi.fn(), cart: vi.fn(), search: vi.fn(), uploadRx: vi.fn(), place: vi.fn(),
    services: { medicines: vi.fn(), labs: vi.fn(), consults: vi.fn(), nearMe: vi.fn(), vaccines: vi.fn(), insurance: vi.fn(), campus: vi.fn() },
    labs: vi.fn(), generics: vi.fn(), uploadReport: vi.fn(), meds: vi.fn(), buyAgain: vi.fn(), consult: vi.fn(), bookConsult: vi.fn(),
    concern: vi.fn(), product: vi.fn(), emergencyCard: vi.fn(), pass: vi.fn(), hostelVisit: vi.fn(), camp: vi.fn(),
  };
}

const DATA: M2HomeData = {
  meds: { loading: false, failed: false, summary: { taken: 2, planned: 3, skipped: 0 } },
  consult: { loading: false, next: { id: 'a1', slotStart: later(30), status: 'CONFIRMED' } },
  buyAgainCount: 3,
  camp: null,
};

describe('Mobile 2.0 Home data (pure)', () => {
  it('counts only structured doses, never more taken than planned', () => {
    expect(medsSummary({ plans: [{ planId: 'a', dosesPlanned: 2, dosesTaken: 3 }, { planId: 'b', dosesPlanned: null, dosesTaken: 1 }, { planId: 'c', dosesPlanned: 1, dosesTaken: 0 }] }))
      .toEqual({ taken: 2, planned: 3, skipped: 0 });
    expect(medsSummary({ plans: [{ planId: 'b', dosesPlanned: null, dosesTaken: 1 }] })).toBeNull();
    expect(medsSummary(null)).toBeNull();
  });

  it('picks the soonest open appointment and the next camp', () => {
    const items = [
      { id: 'past', slotStart: later(-2), status: 'CONFIRMED' },
      { id: 'cancelled', slotStart: later(1), status: 'CANCELLED' },
      { id: 'late', slotStart: later(48), status: 'REQUESTED' },
      { id: 'soon', slotStart: later(3), status: 'CONFIRMED' },
    ];
    expect(nextAppointment(items)?.id).toBe('soon');
    expect(nextAppointment([])).toBeNull();
    const now = new Date(2026, 9, 21);
    expect(nextCamp([{ id: 'old', name: 'x', date: '2026-10-01' }, { id: 'next', name: 'y', date: '2026-10-25' }, { id: 'far', name: 'z', date: '2026-12-01' }], now)?.id).toBe('next');
  });
});

describe('M2Home', () => {
  it('draws the board from the data: SOS, the rail, today’s medicines count and the next consult', () => {
    const links = homeLinks();
    wrap(<M2HomeView name="Asha Rao" campus="VNR VJIET" verified data={DATA} links={links} recent={[]} cart={{ count: 2, add: vi.fn(), canAdd: () => true }} />);
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('AR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cart, 2 items' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SOS, get help now' }));
    expect(links.sos).toHaveBeenCalled();
    expect(screen.getByText('Campus verified')).toBeInTheDocument();
    // The service rail: For You is current; each other tile opens its service.
    const rail = screen.getByRole('navigation', { name: 'Services' });
    expect(within(rail).getByRole('link', { name: 'For You' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(rail).getByRole('link', { name: 'Lab tests' }));
    expect(links.services.labs).toHaveBeenCalled();
    // Find care near you, from the rail.
    fireEvent.click(within(rail).getByRole('link', { name: 'Near me' }));
    expect(links.services.nearMe).toHaveBeenCalled();
    // Medicines today: counts in words, no medicine named.
    const meds = screen.getByTestId('m2-home-meds');
    // Named by its own text on the web (label in name); the hidden ring's count is said in words.
    expect(meds).not.toHaveAttribute('aria-label');
    expect(meds).toHaveTextContent('Medicines today');
    expect(meds).toHaveTextContent('2 of 3 doses taken today');
    expect(meds).toHaveTextContent('1 dose left today');
    expect(screen.getByRole('link', { name: 'Buy again · 3 items' })).toBeInTheDocument();
    // A LiftCard is named by its visible text on the web (label in name, live-run audit #10).
    const consult = screen.getByTestId('m2-home-consult');
    expect(consult).not.toHaveAttribute('aria-label');
    expect(consult).toHaveTextContent(/Confirmed/);
    fireEvent.click(screen.getByRole('link', { name: 'Fever and cold' }));
    expect(links.concern).toHaveBeenCalledWith({ query: 'fever' });
  });

  it('leaves out what has no backend: no pickup claim, no trust strip, no call-to-order without an order line, no recently viewed', () => {
    wrap(<M2HomeView name="Asha Rao" campus="" verified={false} data={DATA} links={homeLinks()} recent={[]} />);
    expect(screen.queryByText(/Clinic pickup today/)).toBeNull();
    expect(screen.queryByText(/Licensed partner pharmacies|checked by a pharmacist/)).toBeNull();
    expect(screen.queryByTestId('m2-home-call')).toBeNull();
    expect(screen.queryByTestId('m2-home-recent')).toBeNull();
    expect(screen.getByRole('link', { name: 'Add your campus' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Voice search isn’t available yet' })).toBeInTheDocument();
  });

  it('says plainly when today’s medicines or a consult are missing, and offers booking', () => {
    const links = homeLinks();
    const data: M2HomeData = { ...DATA, meds: { loading: false, failed: true, summary: null }, consult: { loading: false, next: null }, buyAgainCount: 0 };
    wrap(<M2HomeView name="Asha Rao" campus="VNR VJIET" verified data={data} links={links} recent={[]} />);
    expect(screen.getByText('Couldn’t load today’s medicines')).toBeInTheDocument();
    expect(screen.queryByTestId('m2-home-meds-ring')).toBeNull();
    fireEvent.click(screen.getByTestId('m2-home-consult'));
    expect(links.bookConsult).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Buy again' })).toBeInTheDocument();
  });

  it('shows what the student opened this session, with add only for items the cart takes', () => {
    const add = vi.fn();
    const recent: LiveCatalogItem[] = [listing({ id: 'ors', name: 'ORS sachets' }), listing({ id: 'rx', name: 'Azithromycin 500', requiresPrescription: true })];
    wrap(<M2HomeView name="Asha Rao" campus="VNR VJIET" verified data={DATA} links={homeLinks()} recent={recent} cart={{ count: 0, add, canAdd: (i) => !i.requiresPrescription }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add ORS sachets to cart' }));
    expect(add).toHaveBeenCalledWith(recent[0]);
    expect(screen.queryByRole('button', { name: 'Add Azithromycin 500 to cart' })).toBeNull();
  });

  it('leaves a service off the rail where the platform has no screen for it', () => {
    const links = homeLinks();
    links.services = { medicines: vi.fn(), labs: vi.fn() };
    wrap(<M2HomeView name="A" campus="" verified={false} data={DATA} links={links} recent={[]} />);
    expect(within(screen.getByRole('navigation', { name: 'Services' })).getAllByRole('link').map((l) => l.getAttribute('aria-label'))).toEqual(['For You', 'Medicines', 'Lab tests']);
  });

  it('wide (desktop shell): the same board without the shell’s copies (bell, cart, SOS, account, search), the rail unscrolled, Today for you in one row', () => {
    const links = homeLinks();
    wrap(<M2HomeView wide name="Asha Rao" campus="VNR VJIET" verified data={DATA} links={links} recent={[]} cart={{ count: 2, add: vi.fn(), canAdd: () => true }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Asha Rao' })).toBeInTheDocument();
    for (const id of ['m2-home-bell', 'm2-home-cart', 'm2-home-avatar', 'm2-home-search']) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Upload a prescription' }));
    expect(links.uploadRx).toHaveBeenCalled();
    expect(screen.getByTestId('m2-home-meds')).toBeInTheDocument();
    expect(screen.getByTestId('m2-home-consult')).toBeInTheDocument();
    expect(screen.getByTestId('m2-home-emergency')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Fever and cold' }));
    expect(links.concern).toHaveBeenCalledWith({ query: 'fever' });
  });

  it('highlights only what is real: a listed lab package, Generics only when switched on, never a made-up offer', () => {
    wrap(<M2HomeView name="A" campus="" verified={false} data={DATA} links={homeLinks()} recent={[]} />);
    expect(screen.queryByTestId('hero-carousel-slide-check')).toBeNull();
    expect(screen.queryByTestId('hero-carousel-slide-generics')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Three checks, one visit/);
    cleanup();
    wrap(<M2HomeView name="A" campus="" verified={false} data={{ ...DATA, featuredLab: pkg({ name: 'Complete Health Checkup' }), genericsHighlight: true }} links={homeLinks()} recent={[]} />);
    expect(screen.getByTestId('hero-carousel-slide-check')).toHaveTextContent('Complete Health Checkup');
  });

  it('has no axe violations', async () => {
    const { container } = wrap(<M2HomeView name="Asha Rao" campus="VNR VJIET" verified data={DATA} links={homeLinks()} recent={[]} />);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

function slides(onPress = vi.fn()): HeroSlide[] {
  return ['one', 'two', 'three'].map((key) => ({ key, eyebrow: key, title: `Title ${key}`, body: 'Body', cta: 'Go', icon: 'lab', stops: NAVY_STOPS, chipFill: 'navy', ink: 'navy', onPress }));
}

describe('hero carousel motion', () => {
  it('moves on by itself when motion is allowed, and stops for good once a dot is picked', () => {
    motionFlag.reduced = false;
    vi.useFakeTimers();
    wrap(<HeroCarousel label="Highlights" slides={slides()} dotLabel={(n) => `Show highlight ${n}`} />);
    expect(screen.getByTestId('hero-carousel-slide-one')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(motion.duration.carousel); });
    expect(screen.getByTestId('hero-carousel-slide-two')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show highlight 1' }));
    expect(screen.getByRole('button', { name: 'Show highlight 1' })).toHaveAttribute('aria-pressed', 'true');
    act(() => { vi.advanceTimersByTime(motion.duration.carousel * 3); });
    expect(screen.getByTestId('hero-carousel-slide-one')).toBeInTheDocument();
  });

  it('never advances under reduced motion', () => {
    motionFlag.reduced = true;
    vi.useFakeTimers();
    wrap(<HeroCarousel label="Highlights" slides={slides()} dotLabel={(n) => `Show highlight ${n}`} />);
    act(() => { vi.advanceTimersByTime(motion.duration.carousel * 3); });
    expect(screen.getByTestId('hero-carousel-slide-one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show highlight 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is named as a carousel and holds while focus is inside it', () => {
    motionFlag.reduced = false;
    vi.useFakeTimers();
    wrap(<HeroCarousel label="Highlights" slides={slides()} dotLabel={(n) => `Show highlight ${n}`} />);
    const region = screen.getByTestId('hero-carousel');
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    fireEvent.focus(region);
    act(() => { vi.advanceTimersByTime(motion.duration.carousel * 2); });
    expect(screen.getByTestId('hero-carousel-slide-one')).toBeInTheDocument();
  });
});

describe('pill nav', () => {
  it('names every destination, marks the current one, and selects', () => {
    const onSelect = vi.fn();
    wrap(<PillNav current="orders" onSelect={onSelect} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    fireEvent.click(within(nav).getByRole('link', { name: 'Ask Ayush' }));
    expect(onSelect).toHaveBeenCalledWith('ayush');
  });
});

function medLinks(): M2MedicinesLinks {
  return { back: vi.fn(), cart: vi.fn(), search: vi.fn(), rx: vi.fn(), category: vi.fn(), generics: vi.fn(), refills: vi.fn(), product: vi.fn(), seeAll: vi.fn(), rewards: vi.fn(), labs: vi.fn() };
}

describe('M2Medicines', () => {
  const shelf = [listing({ id: 'cet', name: 'Cetirizine 10 mg', category: 'medicines' }), listing({ id: 'full', name: 'Full price', mrpPaise: 14900 })];

  it('shows the catalogue below MRP, adds what the cart takes, and keeps refills a plain link', () => {
    const links = medLinks();
    const add = vi.fn();
    wrap(<M2MedicinesView links={links} cartCount={0} shelf={{ phase: 'ready', items: shelf, retry: vi.fn() }} cart={{ add, canAdd: () => true }} />);
    expect(within(screen.getByTestId('m2-med-deals')).getByRole('link', { name: /Cetirizine 10 mg/ })).toBeInTheDocument();
    expect(screen.queryByTestId('m2-med-deal-full')).toBeNull();
    expect(screen.getByText('40% off')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Cetirizine 10 mg to cart' }));
    expect(add).toHaveBeenCalledWith(shelf[0]);
    fireEvent.click(screen.getByRole('link', { name: /Refills for your regular medicines/ }));
    expect(links.refills).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'Order with prescription' }));
    expect(links.rx).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'Devices' }));
    expect(links.category).toHaveBeenCalledWith({ category: 'devices' });
  });

  it('shows call and chat to order as not available, not as buttons', () => {
    wrap(<M2MedicinesView links={medLinks()} cartCount={0} shelf={{ phase: 'ready', items: [], retry: vi.fn() }} />);
    expect(screen.getByTestId('m2-med-call-unavailable')).toHaveAttribute('aria-label', 'Call to order, Not available yet');
    expect(screen.getByTestId('m2-med-chat')).toHaveAttribute('aria-label', 'Chat to order, Coming soon');
    expect(screen.queryByRole('link', { name: /Call/ })).toBeNull();
    expect(screen.getByTestId('m2-med-deals-empty')).toBeInTheDocument();
  });

  it('has loading and error states for the shelf, and searches what was typed', () => {
    const retry = vi.fn();
    const links = medLinks();
    const { rerender } = wrap(<M2MedicinesView links={links} cartCount={1} shelf={{ phase: 'loading', items: [], retry }} />);
    expect(screen.getByRole('button', { name: 'Cart, 1 item' })).toBeInTheDocument();
    rerender(<LanguageProvider><M2MedicinesView links={links} cartCount={1} shelf={{ phase: 'error', items: [], retry }} /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    const input = screen.getByLabelText('Search medicines');
    fireEvent.change(input, { target: { value: 'paracetamol' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
    expect(links.search).toHaveBeenCalledWith('paracetamol');
  });
});

describe('M2Labs', () => {
  const packages = [
    pkg({ id: 'thy', name: 'Thyroid profile', includes: ['TSH', 'T3', 'T4'] }),
    pkg({ id: 'full', name: 'Full body check', includes: ['CBC', 'LFT', 'KFT', 'Lipid', 'TSH'], fastingHours: 10, pricePaise: 129900 }),
  ];

  it('features the biggest package, lists every test with its price, and books through the flow', () => {
    const book = vi.fn();
    wrap(<M2LabsView phase="ready" packages={packages} retry={vi.fn()} block="Block C" links={{ back: vi.fn(), reports: vi.fn(), rx: vi.fn(), book }} />);
    expect(screen.getByText('Sample collected at Block C')).toBeInTheDocument();
    expect(within(screen.getByTestId('m2-labs-hero')).getByText('Full body check')).toBeInTheDocument();
    // Named by what it shows on the web (label in name, live-run audit #10).
    expect(screen.getByTestId('m2-labs-pkg-thy')).not.toHaveAttribute('aria-label');
    expect(screen.getByTestId('m2-labs-pkg-thy')).toHaveTextContent('Thyroid profile3 tests · no fasting₹499Book');
    fireEvent.click(screen.getByRole('link', { name: 'Full body' }));
    expect(book).toHaveBeenCalledWith(packages[1]);
    // No audience tabs and no "most booked" claim: packages carry neither.
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText(/most booked/i)).toBeNull();
    expect(screen.getByTestId('m2-labs-call-unavailable')).toBeInTheDocument();
  });

  it('filters by what is typed, and says when nothing matches', () => {
    wrap(<M2LabsView phase="ready" packages={packages} retry={vi.fn()} block="" links={{ back: vi.fn(), reports: vi.fn(), rx: vi.fn(), book: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText('Search tests'), { target: { value: 'tsh' } });
    expect(screen.getByTestId('m2-labs-pkg-thy')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search tests'), { target: { value: 'zinc' } });
    expect(screen.getByTestId('m2-labs-no-match')).toHaveTextContent('No test matches “zinc”.');
  });

  it('has loading, error and empty states', () => {
    const retry = vi.fn();
    const links = { back: vi.fn(), reports: vi.fn(), rx: vi.fn(), book: vi.fn() };
    const { rerender } = wrap(<M2LabsView phase="loading" packages={[]} retry={retry} block="" links={links} />);
    expect(screen.queryByTestId('m2-labs-hero')).toBeNull();
    rerender(<LanguageProvider><M2LabsView phase="error" packages={[]} retry={retry} block="" links={links} /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    rerender(<LanguageProvider><M2LabsView phase="ready" packages={[]} retry={retry} block="" links={links} /></LanguageProvider>);
    expect(screen.getByTestId('m2-labs-empty')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Full body' })).toBeNull();
  });

  it('picks package art from the name and the biggest package', () => {
    expect(labArt('Thyroid profile').icon).toBe('thyroid');
    expect(labArt('Lipid profile').icon).toBe('trend-zigzag');
    expect(labArt('Women’s wellness').icon).toBe('female');
    expect(productArt({ name: 'ORS sachets', category: 'medicines' }).icon).toBe('droplet');
    expect(biggestPackage(packages)?.id).toBe('full');
    expect(matchPackages(packages, 'lft').map((p) => p.id)).toEqual(['full']);
  });
});

const CONSULTS = {
  '/catalog': { items: [listing({ id: 'gp', kind: 'consultation', name: 'General medicine', brand: 'Dr. Meera Rao', pricePaise: 29900 }), listing({ id: 'derm', kind: 'consultation', name: 'Dermatology', brand: 'Dr. Arjun Das', pricePaise: 49900 })] },
  '/appointments/availability?catalogItemId=gp': { slots: [{ id: 's1', slotStart: later(1), slotEnd: later(1.5), capacity: 1, booked: 0, available: 1 }] },
  '/appointments/availability?catalogItemId=derm': { slots: [{ id: 's2', slotStart: later(30), slotEnd: later(30.5), capacity: 1, booked: 1, available: 0 }] },
};

describe('M2Consults', () => {
  it('lists the catalogue’s consultations with their next open slot, and books the soonest from Consult now', async () => {
    const { request, calls } = fakeRequest(CONSULTS);
    const vm = new ConsultsViewModel(request);
    await vm.load();
    const book = vi.fn();
    wrap(<M2ConsultsView vm={vm} links={{ back: vi.fn(), book, plus: vi.fn() }} />);
    expect(screen.getByRole('link', { name: 'Consult now · from ₹299' })).toBeInTheDocument();
    expect(screen.getByTestId('m2-doc-gp').getAttribute('aria-label')).toMatch(/^Dr\. Meera Rao, General medicine, From ₹299\. Free (Tomorrow )?at /);
    expect(screen.getByTestId('m2-doc-derm').getAttribute('aria-label')).toMatch(/No open slot yet/);
    fireEvent.click(screen.getByRole('link', { name: 'Consult now · from ₹299' }));
    expect(book).toHaveBeenCalledWith(expect.objectContaining({ id: 'gp' }));
    // Only the catalogue and availability are read: nothing from the health record.
    expect(calls.every((c) => c.path.startsWith('/catalog') || c.path.startsWith('/appointments/availability'))).toBe(true);
    // No invented doctor details.
    expect(screen.queryByText(/Reg\. no\./)).toBeNull();
    expect(screen.getByTestId('m2-doc-follow-up')).toHaveAttribute('aria-label', 'Free follow-up, Not available yet');
  });

  it('shows the counsellor note with the crisis lines for stress, sleep and low mood only', async () => {
    const vm = new ConsultsViewModel(fakeRequest(CONSULTS).request);
    wrap(<M2ConsultsView vm={vm} links={{ back: vi.fn(), book: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fever' }));
    expect(screen.queryByTestId('m2-doc-mind')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Low mood' }));
    expect(screen.getByRole('button', { name: 'Low mood' })).toHaveAttribute('aria-pressed', 'true');
    const note = screen.getByTestId('m2-doc-mind');
    expect(within(note).getByText(/campus counsellor is free and private/)).toBeInTheDocument();
    expect(within(note).getByTestId('m2-doc-crisis')).toBeInTheDocument();
    // No Student Plus card where the platform has no plan screen.
    expect(screen.queryByTestId('m2-doc-plus')).toBeNull();
  });

  it('opens one answer at a time', () => {
    wrap(<M2ConsultsView vm={new ConsultsViewModel(fakeRequest(CONSULTS).request)} links={{ back: vi.fn(), book: vi.fn() }} />);
    const first = screen.getByRole('button', { name: 'How soon can I talk to a doctor?' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Is my consult private?' }));
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Is my consult private?' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('has error and empty states', async () => {
    const failing = new ConsultsViewModel(fakeRequest({}).request);
    await failing.load();
    wrap(<M2ConsultsView vm={failing} links={{ back: vi.fn(), book: vi.fn() }} />);
    expect(screen.getByText('Doctors didn’t load')).toBeInTheDocument();
    cleanup();
    const empty = new ConsultsViewModel(fakeRequest({ '/catalog': { items: [] } }).request);
    await empty.load();
    wrap(<M2ConsultsView vm={empty} links={{ back: vi.fn(), book: vi.fn() }} />);
    await waitFor(() => expect(screen.getByTestId('m2-doc-empty')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Consult now/ })).toBeNull();
  });

  it('takes the soonest slot with room that is still ahead', () => {
    const slots = [
      { id: 'past', slotStart: later(-1), slotEnd: later(-0.5), capacity: 1, booked: 0, available: 1 },
      { id: 'full', slotStart: later(1), slotEnd: later(1.5), capacity: 1, booked: 1, available: 0 },
      { id: 'open', slotStart: later(2), slotEnd: later(2.5), capacity: 1, booked: 0, available: 1 },
    ];
    expect(soonestOpen(slots)?.id).toBe('open');
  });
});
