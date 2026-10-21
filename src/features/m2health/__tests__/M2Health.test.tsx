import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider, translate } from '@/i18n';
import { fakeRequest, listing } from '@/features/phoneKit/__tests__/fixtures';
import { forgetListings } from '@/features/phoneKit/listingCache';
import { axeViolations, describeViolations } from '@/test/axe';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { list, value } from '@/features/labResults/viewmodel/__tests__/labFixtures';
import { ProfileViewModel, completeness, PROFILE_FIELDS } from '@/features/m2profile/viewmodel/ProfileViewModel';
import { M2ProfileView } from '@/features/m2profile/views/M2ProfileView';
import type { M2ProfileLinks } from '@/features/m2profile/views/M2ProfileView';
import { InsightsViewModel, latestNote, orderedTests, refillLine } from '@/features/insights/viewmodel/InsightsViewModel';
import type { LabOrder } from '@/features/insights/viewmodel/InsightsViewModel';
import { M2InsightsView } from '@/features/insights/views/M2InsightsView';
import type { M2InsightsLinks } from '@/features/insights/views/M2InsightsView';
import { AyushViewModel } from '@/features/chat/viewmodel/AyushViewModel';
import { M2AskAyushView } from '@/features/chat/views/M2AskAyushView';
import { M2ProductViewModel } from '@/features/shopPhone/viewmodel/M2ProductViewModel';
import { M2ProductView, strengthOf } from '@/features/shopPhone/views/M2ProductView';
import type { M2ProductLinks } from '@/features/shopPhone/views/M2ProductView';
import { addToCart } from '@/features/shopPhone/views/M2ProductBoard';
import { VaccinesViewModel, badgeOf } from '@/features/preventive/viewmodel/VaccinesViewModel';
import { M2VaccinesView } from '@/features/preventive/views/M2VaccinesView';
import type { ReportReview, VaccineOffering } from '@/features/preventive/models';

const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
/** A link called without a test, value or medicine in it (only the press event, if any). */
const noData = (fn: unknown) => (fn as { mock: { calls: unknown[][] } }).mock.calls.flat().every((a) => typeof a !== 'string' && typeof a !== 'number');
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const PROFILE: MemberProfile = {
  id: 'u1', fullName: 'Asha Rao', role: 'STUDENT', email: 'asha@vnr.in', phone: '+919876543210', dob: '2004-01-02', university: 'VNR VJIET',
  rollNumber: '21B01', bloodGroup: 'B+', ageVerified: true, isVerifiedStudent: true, emergencyContactName: 'Ravi', emergencyContactPhone: '+919000000000',
  emergencyContactRelation: 'Father', allergies: [], chronicConditions: [], updatedAt: null, hostelBlock: 'Block C', room: '',
};

const HOUR = 3_600_000;
const later = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

// ── M2Profile ────────────────────────────────────────────────────────────────

function profileLinks(): M2ProfileLinks {
  return {
    sos: vi.fn(), settings: vi.fn(), account: vi.fn(), emergencyCard: vi.fn(), pass: vi.fn(), documents: vi.fn(), addDocument: vi.fn(),
    plus: vi.fn(), orders: vi.fn(), privacy: vi.fn(), help: vi.fn(), signOut: vi.fn(),
  };
}

const PROFILE_ROUTES = {
  '/profile': PROFILE,
  '/body/measurements': { height: { id: 'h', value: 174, unit: 'cm', recordedAt: '2026-06-02T10:00:00Z', source: 'MANUAL' }, weight: null },
  '/health/documents': { items: [], total: 12, categoryCounts: { LAB: 6, PRESCRIPTION: 4, OTHER: 1, VACCINE: 1 } },
  '/plans': { plans: [{ id: 'STUDENT_PLUS', name: 'Student Plus', price: 149, period: 'per month', packages: [{ id: 'QUARTER', months: 3, price: 2199 }] }] },
};

describe('M2Profile', () => {
  it('counts only the declared profile fields; allergies and clinical values never count', () => {
    expect(PROFILE_FIELDS).not.toContain('allergies');
    expect(completeness(PROFILE)).toEqual({ done: 6, total: 7, fraction: 6 / 7 });
    expect(completeness({ ...PROFILE, room: '12', allergies: ['Peanuts'] }).done).toBe(7);
  });

  it('draws the server’s data: identity, ring words, vitals with their source, documents by kind and Student Plus', async () => {
    const { request, calls } = fakeRequest(PROFILE_ROUTES);
    const vm = new ProfileViewModel(request);
    vm.load();
    const links = profileLinks();
    const { container } = wrap(<M2ProfileView vm={vm} links={links} />);
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByTestId('m2-prof-complete')).toHaveTextContent(en('m2.prof.complete', { done: 6, total: 7 }));
    expect(screen.getByText(en('m2.prof.ringNote'))).toBeInTheDocument();
    // Course and year are not stored (D-M2-16): only the campus and block.
    expect(screen.getByText('VNR VJIET · Block C')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('m2-prof-height')).toHaveTextContent('174 cm'));
    expect(screen.getByTestId('m2-prof-weight')).toHaveTextContent(en('pb.profile.notAdded'));
    expect(screen.getByTestId('m2-prof-blood')).toHaveTextContent(en('m2.prof.typedByYou'));
    expect(screen.getByTestId('m2-prof-blood')).not.toHaveTextContent(/from lab/i);
    expect(await screen.findByTestId('m2-prof-doc-lab')).toHaveTextContent('6');
    expect(screen.getByTestId('m2-prof-doc-vaccines')).toHaveTextContent('1');
    expect(await screen.findByTestId('m2-prof-plus')).toHaveTextContent('₹149 a month · or 3 months for ₹2,199');
    expect(screen.queryByText(/medical leave/i)).toBeNull();
    expect(calls.map((c) => c.path).every((p) => !p.includes('lab-results'))).toBe(true);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('draws no fake switches: Ayush access is not available yet and family sharing is coming soon', async () => {
    const { request } = fakeRequest(PROFILE_ROUTES);
    const vm = new ProfileViewModel(request);
    vm.load();
    wrap(<M2ProfileView vm={vm} links={profileLinks()} />);
    expect(await screen.findByTestId('m2-prof-ayush')).toHaveTextContent(en('m2.notYet'));
    expect(screen.getByTestId('m2-prof-family')).toHaveTextContent(en('m2.prof.familyMeta'));
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('keeps SOS and the emergency card reachable, and each card fails on its own', async () => {
    const { request } = fakeRequest({ ...PROFILE_ROUTES, '/body/measurements': new Error('down'), '/plans': new Error('down') });
    const vm = new ProfileViewModel(request);
    vm.load();
    const links = profileLinks();
    wrap(<M2ProfileView vm={vm} links={links} />);
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(await screen.findByTestId('m2-prof-body-error')).toBeInTheDocument();
    // No plan list, no price: the Student Plus card is hidden, never a fallback price.
    await waitFor(() => expect(vm.plans.phase).toBe('error'));
    expect(screen.queryByTestId('m2-prof-plus')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en('m2.sosSpoken') }));
    fireEvent.click(screen.getByRole('link', { name: `${en('m2.prof.emergency')}. ${en('m2.prof.emergencyBody')}` }));
    expect(links.sos).toHaveBeenCalledTimes(1);
    expect(links.emergencyCard).toHaveBeenCalledTimes(1);
  });
});

// ── M2Insights ───────────────────────────────────────────────────────────────

function insightsLinks(): M2InsightsLinks {
  return {
    sos: vi.fn(), trends: vi.fn(), records: vi.fn(), reportUpload: vi.fn(), medicines: vi.fn(), water: vi.fn(), refill: vi.fn(), collection: vi.fn(),
    addVaccineCard: vi.fn(), appointments: vi.fn(),
  };
}

const REVIEW: ReportReview = {
  id: 'r1', documentId: 'doc-1', status: 'APPROVED', version: 2, reviewedBy: 'doc', reviewedAt: 1782000000, reviewedByName: 'Dr. S. Kumar',
  guidance: { summary: 'Exactly what the doctor wrote.', questions: [], nextSteps: ['Walk'], steps: [{ text: 'Walk', kind: 'ACTIVITY', often: null, when: null }], sourceRefs: [] },
};

const ORDER: LabOrder = { id: 'o1', status: 'BOOKED', testPanel: ['Vitamin D'], orderedByDoctor: 'Dr. S. Kumar', collectedAt: null, slotStart: null, createdAt: 1782000000 };

function insightsRoutes(over: Record<string, unknown> = {}) {
  const values = [
    value({ testName: 'HbA1c', rangeState: 'ABOVE' }),
    value({ testName: 'LDL', rangeState: 'IN_RANGE', bodySystem: 'HEART_BLOOD' }),
    value({ testName: 'Urine sugar', rangeState: 'NO_RANGE', valueNumeric: null, valueText: 'Negative', refText: '', refLow: null, refHigh: null }),
  ];
  return {
    '/health/lab-results': { ...list(values), bodySystems: [{ bodySystem: 'HEART_BLOOD', tests: 4, outsideRange: 1, noRange: 0 }] },
    '/appointments': { items: [{ id: 'a1', slotStart: later(30), status: 'CONFIRMED' }] },
    '/health/documents': { items: [], total: 11, categoryCounts: {} },
    '/records/shares': { items: [{ id: 's', active: false }] },
    '/preventive/report-reviews': { items: [REVIEW], total: 1 },
    '/refills/plans': { items: [{ id: 'p1', name: 'Cetirizine', dosage: '10 mg' }] },
    '/lab-orders': { items: [ORDER, { ...ORDER, id: 'self', orderedByDoctor: '' }, { ...ORDER, id: 'done', status: 'REPORT_RELEASED' }], total: 3 },
    '/meds/today': { date: '2026-10-21', timezone: 'Asia/Kolkata', plans: [] },
    '/wellness/water/today': { date: '2026-10-21', timezone: 'Asia/Kolkata', consumedMl: 0, goalMl: 2000, goalSource: 'DEFAULT', percent: 0, entries: [] },
    '/wellness/water/goal': { goalMl: 2000, goalSource: 'DEFAULT', minMl: 500, maxMl: 6000 },
    ...over,
  };
}

describe('M2Insights', () => {
  it('reads only doctor-ordered tests still waiting, and the newest approved note', () => {
    expect(orderedTests([ORDER, { ...ORDER, id: 'x', orderedByDoctor: '' }, { ...ORDER, id: 'y', collectedAt: 5 }]).map((o) => o.id)).toEqual(['o1']);
    expect(latestNote([{ ...REVIEW, id: 'old', reviewedAt: 1 }, REVIEW, { ...REVIEW, id: 'pending', status: 'ASSIGNED', guidance: null }])?.id).toBe('r1');
  });

  it('shows the server’s counts, filters with pressed cards, and keeps a no-range value neutral', async () => {
    const { request } = fakeRequest(insightsRoutes());
    const vm = new InsightsViewModel(request);
    vm.load();
    const links = insightsLinks();
    const { container } = wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links} />);
    const look = await screen.findByTestId('m2-ins-count-look');
    expect(look).toHaveTextContent('1');
    expect(screen.getByTestId('m2-ins-count-ok')).toHaveTextContent('1');
    expect(screen.getByTestId('m2-ins-stat-todo')).toHaveTextContent('2');
    expect(screen.getByTestId('m2-ins-stat-docs')).toHaveTextContent('11');
    expect(screen.getByTestId('m2-ins-stat-shared')).toHaveTextContent('0');
    expect(screen.getByText(en('m2.ins.noScore'))).toBeInTheDocument();
    const rows = within(screen.getByTestId('m2-ins-values'));
    expect(rows.getAllByRole('link')).toHaveLength(3);
    expect(rows.getByRole('link', { name: /Urine sugar, Negative, no range on the report/ })).toBeInTheDocument();
    fireEvent.click(look);
    expect(look).toHaveAttribute('aria-pressed', 'true');
    expect(rows.getAllByRole('link')).toHaveLength(1);
    fireEvent.click(look);
    expect(rows.getAllByRole('link')).toHaveLength(3);
    // No link carries a test or a value.
    fireEvent.click(rows.getAllByRole('link')[0] as HTMLElement);
    expect(links.trends).toHaveBeenCalled();
    expect(noData(links.trends)).toBe(true);
    // The doctor's note, verbatim and attributed.
    expect(await screen.findByTestId('m2-ins-note-text')).toHaveTextContent('Exactly what the doctor wrote.');
    expect(screen.getByTestId('m2-ins-note')).toHaveTextContent('Dr. S. Kumar');
    // Ask Ayush about this report needs record access (D-M2-13): not drawn.
    expect(screen.queryByText(/Ask Ayush about this report/)).toBeNull();
    expect(screen.getByTestId('m2-ins-vaccines')).toHaveTextContent(en('m2.ins.vaccineRecordNotYet'));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('links care cards to the refill request and the order’s collection time, with nothing in the call', async () => {
    const { request } = fakeRequest(insightsRoutes());
    const vm = new InsightsViewModel(request);
    vm.load();
    const links = insightsLinks();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links} />);
    expect(await screen.findByTestId('m2-ins-ordered')).toHaveTextContent('Vitamin D');
    fireEvent.click(screen.getByRole('link', { name: en('m2.ins.requestRefill') }));
    fireEvent.click(screen.getByRole('link', { name: en('m2.ins.pickTime') }));
    expect(links.refill).toHaveBeenCalled();
    expect(links.collection).toHaveBeenCalled();
    expect(noData(links.refill) && noData(links.collection)).toBe(true);
  });

  it('shows a refill’s due date only when the server sent one, and never makes one up', async () => {
    const due = (date: string) => `due ${date}`;
    const date = (seconds: number) => `D${seconds}`;
    expect(refillLine({ id: 'p', name: 'Vitamin D3', dosage: '60K', dueAt: 1_793_000_000 }, due, date)).toBe('Vitamin D3 · 60K · due D1793000000');
    expect(refillLine({ id: 'p', name: 'Vitamin D3', dosage: '60K', dueAt: null }, due, date)).toBe('Vitamin D3 · 60K');
    expect(refillLine({ id: 'p', name: 'Iron', dosage: '' }, due, date)).toBe('Iron');
    const { request } = fakeRequest(insightsRoutes({ '/refills/plans': { items: [
      { id: 'p1', name: 'Cetirizine', dosage: '10 mg', dueAt: null },
      { id: 'p2', name: 'Vitamin D3', dosage: '60K', dueAt: 1_793_000_000 },
    ] } }));
    const vm = new InsightsViewModel(request);
    vm.load();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={insightsLinks()} />);
    const card = await screen.findByTestId('m2-ins-refills');
    await waitFor(() => expect(card).toHaveTextContent('Vitamin D3'));
    const shown = new Date(1_793_000_000 * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    expect(card).toHaveTextContent(`Vitamin D3 · 60K · due ${shown}`);
    expect(card).toHaveTextContent('Cetirizine · 10 mg');
    expect(card.textContent?.match(/due /g)).toHaveLength(1);
  });

  it('first time: no stored values asks for a report; one failing read does not blank the page', async () => {
    const { request } = fakeRequest(insightsRoutes({ '/health/lab-results': { reports: [], bodySystems: [], total: 0 }, '/appointments': new Error('down') }));
    const vm = new InsightsViewModel(request);
    vm.load();
    const links = insightsLinks();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links} />);
    fireEvent.click(await screen.findByRole('link', { name: en('m2.ins.addReport') }));
    expect(links.reportUpload).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('m2-ins-stat-consult')).toHaveTextContent('–'));
    expect(screen.getByTestId('m2-ins-stat-docs')).toHaveTextContent('11');
    expect(await screen.findByTestId('m2-ins-note')).toBeInTheDocument();
  });

  it('asks a doctor to explain the latest report once, for that report', async () => {
    const posted: string[] = [];
    let reviews: ReportReview[] = [];
    const { request } = fakeRequest(insightsRoutes({
      '/preventive/report-reviews': () => ({ items: reviews, total: reviews.length }),
      'POST /preventive/report-reviews': (_p: string, init?: RequestInit) => {
        posted.push(String(init?.body));
        reviews = [{ ...REVIEW, status: 'REQUESTED', guidance: null, reviewedAt: null, reviewedByName: null }];
        return reviews[0];
      },
    }));
    const vm = new InsightsViewModel(request);
    vm.load();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={insightsLinks()} />);
    fireEvent.click(await screen.findByTestId('m2-ins-ask-review-button'));
    expect(await screen.findByTestId('m2-ins-review-status')).toHaveTextContent(en('m2.ins.reviewRequested'));
    expect(posted).toEqual([JSON.stringify({ documentId: 'doc-1' })]);
  });
});

describe('safety elements on the health screens', () => {
  it('SOS, the emergency card and the helpline render, take keyboard focus, and survive every read failing', async () => {
    const { request } = fakeRequest({});
    const insights = new InsightsViewModel(request);
    insights.load();
    const profile = new ProfileViewModel(request);
    profile.load();
    const sos = vi.fn();
    const { unmount } = wrap(<M2InsightsView vm={insights} name="" links={{ ...insightsLinks(), sos }} />);
    await waitFor(() => expect(insights.values.phase).toBe('error'));
    const insightsSos = screen.getByRole('button', { name: en('m2.sosSpoken') });
    expect(insightsSos).toHaveAttribute('tabindex', '0');
    fireEvent.click(insightsSos);
    unmount();
    const links = profileLinks();
    const second = wrap(<M2ProfileView vm={profile} links={links} />);
    await waitFor(() => expect(profile.profile.phase).toBe('error'));
    expect(screen.getByRole('button', { name: en('m2.sosSpoken') })).toHaveAttribute('tabindex', '0');
    const card = screen.getByRole('link', { name: `${en('m2.prof.emergency')}. ${en('m2.prof.emergencyBody')}` });
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.click(card);
    expect(links.emergencyCard).toHaveBeenCalled();
    second.unmount();
    wrap(<M2AskAyushView vm={new AyushViewModel(request)} links={{ back: vi.fn(), sos }} />);
    expect(screen.getByRole('link', { name: en('m2.ask.callSpoken', { number: '14416' }) })).toHaveAttribute('tabindex', '0');
    expect(sos).toHaveBeenCalledTimes(1);
  });
});

// ── M2AskAyush (general mode) ────────────────────────────────────────────────

describe('M2AskAyush', () => {
  it('runs in general mode: says it cannot read records, offers no record suggestions, and keeps the helpline one tap away', () => {
    const { request, calls } = fakeRequest({});
    const vm = new AyushViewModel(request);
    const links = { back: vi.fn(), sos: vi.fn() };
    wrap(<M2AskAyushView vm={vm} links={links} />);
    expect(screen.getByTestId('m2-ask-banner')).toHaveTextContent(en('m2.ask.noRecords'));
    expect(screen.queryByText(/lipid profile|What did my doctor write|Which tests are due/)).toBeNull();
    const call = screen.getByRole('link', { name: en('m2.ask.callSpoken', { number: '14416' }) });
    expect(call).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: en('m2.sosSpoken') }));
    expect(links.sos).toHaveBeenCalled();
  });

  it('sends to the server agent, shows typing while it waits, and draws the server’s crisis card', async () => {
    let release: (v: unknown) => void = () => {};
    const { request, calls } = fakeRequest({
      'POST /agents/ayush/ask': () => new Promise((resolve) => { release = resolve; }),
    });
    const vm = new AyushViewModel(request);
    const { container } = wrap(<M2AskAyushView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText(en('m2.ask.inputLabel')), { target: { value: 'I feel unsafe' } });
    fireEvent.click(screen.getByRole('button', { name: en('m2.ask.send') }));
    expect(await screen.findByTestId('m2-ask-typing')).toBeInTheDocument();
    expect(calls[0]?.path).toBe('/agents/ayush/ask');
    release({ agent: 'ayush', outcome: 'CRISIS', answer: 'Please reach out now.', citations: [], answered: false,
      crisis: { kind: 'SELF_HARM', resources: [{ label: 'Tele-MANAS', number: '14416', detail: '' }] } });
    const crisis = await screen.findByTestId('m2-ask-crisis');
    expect(crisis).toHaveAttribute('role', 'alert');
    expect(within(crisis).getByRole('link', { name: en('ayush.callSpoken', { label: 'Tele-MANAS', number: '14416' }) })).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('says why when Ayush declines a personal-record question', async () => {
    const { request } = fakeRequest({
      'POST /agents/ayush/ask': { agent: 'ayush', outcome: 'REFUSED_PERSONAL', answer: 'I can’t read your health records.', citations: [], answered: false },
    });
    const vm = new AyushViewModel(request);
    wrap(<M2AskAyushView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: en('ayush.starter1') }));
    expect(await screen.findByText(en('ayush.refusal.REFUSED_PERSONAL'))).toBeInTheDocument();
  });
});

// ── M2Product ────────────────────────────────────────────────────────────────

function productLinks(): M2ProductLinks {
  return { back: vi.fn(), cart: vi.fn(), open: vi.fn(), add: vi.fn(), addRx: vi.fn(), sendRx: vi.fn() };
}

const ALT = { id: 'a1', name: 'Dolo 650', brand: 'Micro', pack: 'Strip of 15', pricePaise: 3000, mrpPaise: 3500, stock: 4, imageUrl: null, manufacturer: 'Micro Labs', dosageForm: 'tablet', composition: 'Paracetamol 650 mg', schedule: '', requiresPrescription: false };

describe('M2Product', () => {
  beforeEach(() => forgetListings());

  it('OTC: the stepper stops at the stock, other makers are cheapest first, and add sends the quantity once', async () => {
    const item = listing({ id: 'p1', name: 'Calpol 650', medicineId: 'm1', stock: 3, composition: 'Paracetamol 650 mg' });
    const { request, calls } = fakeRequest({
      '/catalog?': { items: [item], total: 1 },
      '/catalog/p1/alternatives': { itemId: 'p1', composition: 'Paracetamol 650 mg', dosageForm: 'tablet', restricted: false, items: [{ ...ALT, id: 'a2', pricePaise: 4000 }, ALT] },
      '/inventory/p1': { id: 'p1', available: true, stock: 3 },
    });
    const vm = new M2ProductViewModel(request);
    await vm.load('p1');
    const links = productLinks();
    const { container } = wrap(<M2ProductView vm={vm} cartCount={0} links={links} />);
    expect(screen.getByText(en('m2.prod.contains', { composition: 'Paracetamol 650 mg' }))).toBeInTheDocument();
    const plus = screen.getByRole('button', { name: en('m2.prod.more') });
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getByTestId('m2-prod-qty')).toHaveTextContent('3');
    expect(plus).toHaveAttribute('aria-disabled', 'true');
    const alts = within(screen.getByTestId('m2-prod-alts')).getAllByRole('link');
    expect(alts[0]).toHaveAccessibleName(/Dolo 650.*Lowest/);
    fireEvent.click(screen.getByRole('button', { name: en('m2.prod.addN', { count: 3 }) }));
    expect(links.add).toHaveBeenCalledTimes(1);
    expect(links.add).toHaveBeenCalledWith(3);
    // Reviewed medicine information does not exist yet (D-M2-1): no "About this medicine".
    expect(screen.queryByText(/About this medicine|side effects|Do not take with/i)).toBeNull();
    // Commerce only: nothing from the health record is read here.
    expect(calls.every((c) => /^\/(catalog|inventory)/.test(c.path))).toBe(true);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('prescription: no other makers, no stepper, no add; Add Rx and send to a pharmacy instead', async () => {
    const item = listing({ id: 'rx1', name: 'Azithral 500', medicineId: 'm2', requiresPrescription: true, stock: 9 });
    const { request } = fakeRequest({
      '/catalog?': { items: [item], total: 1 },
      // Even if a response wrongly carried other makers, a prescription listing shows none.
      '/catalog/rx1/alternatives': { itemId: 'rx1', composition: 'Azithromycin 500 mg', dosageForm: 'tablet', restricted: false, items: [ALT] },
      '/inventory/rx1': { id: 'rx1', available: true, stock: 9 },
    });
    const vm = new M2ProductViewModel(request);
    await vm.load('rx1');
    const links = productLinks();
    wrap(<M2ProductView vm={vm} cartCount={0} links={links} />);
    expect(screen.getByTestId('m2-prod-rx')).toHaveTextContent(en('m2.prod.rxNeeded'));
    expect(screen.queryByTestId('m2-prod-stepper')).toBeNull();
    expect(screen.queryByTestId('m2-prod-alts')).toBeNull();
    expect(screen.queryByTestId('m2-prod-add')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: en('m2.prod.sendRx') }));
    fireEvent.click(screen.getByRole('link', { name: en('m2.prod.addRx') }));
    expect(links.sendRx).toHaveBeenCalled();
    expect(links.addRx).toHaveBeenCalled();
  });

  it('fails closed when stock cannot be read, and draws the strength from the composition', async () => {
    expect(strengthOf('Paracetamol 650 mg')).toBe('650 mg');
    const item = listing({ id: 'p2', name: 'Plain', stock: 5 });
    const { request } = fakeRequest({ '/catalog?': { items: [item], total: 1 }, '/inventory/p2': new Error('down') });
    const vm = new M2ProductViewModel(request);
    await vm.load('p2');
    wrap(<M2ProductView vm={vm} cartCount={0} links={productLinks()} />);
    expect(screen.getByTestId('m2-prod-add')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('m2-prod-stepper')).toBeNull();
  });

  it('adds the chosen quantity to a one-line-per-listing cart', () => {
    const item = listing({ id: 'p3' });
    const lines: { item: typeof item; quantity: number }[] = [];
    const cart = {
      lines,
      add: vi.fn((i: typeof item) => { lines.push({ item: i, quantity: 1 }); }),
      setQuantity: vi.fn((id: string, q: number) => { const l = lines.find((x) => x.item.id === id); if (l) l.quantity = q; }),
      clear: vi.fn(),
    };
    addToCart(cart, item, 2);
    addToCart(cart, item, 1);
    expect(cart.add).toHaveBeenCalledTimes(1);
    expect(lines[0]?.quantity).toBe(3);
  });
});

// ── M2Vaccines (booking half) ────────────────────────────────────────────────

const OFFER: VaccineOffering = {
  id: 'v1', providerId: 'p', providerName: 'Campus Clinic', vaccineName: 'Hepatitis B', pincode: '500090', region: 'Hyderabad', sourceUrl: 'https://example.test/s',
  bookingUrl: null, lastVerifiedAt: 1782000000, expiresAt: null, pricePaise: null, currency: 'INR', availability: 'CONFIRMED', verificationStatus: 'VERIFIED',
};

describe('M2Vaccines', () => {
  it('computes badges from names', () => {
    expect(badgeOf('Hepatitis B')).toBe('HB');
    expect(badgeOf('Influenza')).toBe('IN');
  });

  it('builds the picker from the directory, says "Price not listed", and shows Pick a slot as unavailable with its reason', async () => {
    const { request } = fakeRequest({
      '/preventive/vaccines': { items: [OFFER, { ...OFFER, id: 'v2', vaccineName: 'Influenza', providerName: 'City Clinic', pricePaise: 120000, availability: 'UNKNOWN' }], total: 2, offset: 0, limit: 50 },
    });
    const vm = new VaccinesViewModel(request);
    vm.load();
    const links = { back: vi.fn(), myHealth: vi.fn(), camp: vi.fn(), more: vi.fn() };
    const { container } = wrap(<M2VaccinesView vm={vm} links={links} />);
    const hb = await screen.findByRole('tab', { name: 'Hepatitis B' });
    expect(hb).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('m2-vac-detail')).toHaveTextContent(en('m2.vac.noPrice'));
    const slot = screen.getByTestId('m2-vac-slot');
    expect(slot).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('m2-vac-slot-reason')).toHaveTextContent(en('m2.vac.slotReason'));
    // No "why" text, dose schedule or "Due" without a clinician-reviewed source (D-M2-3, D-M2-5).
    expect(screen.queryByText(/dose|Due now|Recommended|Protects/i)).toBeNull();
    // "Vaccine only" is dropped (D-M2-4).
    expect(screen.queryByText(/Vaccine only/)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Influenza' }));
    expect(screen.getByTestId('m2-vac-detail')).toHaveTextContent('City Clinic');
    expect(screen.getByTestId('m2-vac-detail')).not.toHaveTextContent('Campus Clinic');
    fireEvent.click(screen.getByTestId('m2-vac-record'));
    expect(links.myHealth).toHaveBeenCalled();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('says so when the directory is empty or fails', async () => {
    const { request } = fakeRequest({ '/preventive/vaccines': new Error('down') });
    const vm = new VaccinesViewModel(request);
    vm.load();
    wrap(<M2VaccinesView vm={vm} links={{ back: vi.fn(), myHealth: vi.fn() }} />);
    expect(await screen.findByText(en('pb.prev.failedTitle'))).toBeInTheDocument();
  });
});
