import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider, translate } from '@/i18n';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { MedsTodayViewModel } from '../viewmodel/MedsTodayViewModel';
import type { MedsTodayPlan } from '../viewmodel/MedsTodayViewModel';
import { MedicineRemindersViewModel } from '../viewmodel/MedicineRemindersViewModel';
import type { ReminderScheduler, ReminderSlot } from '../viewmodel/MedicineRemindersViewModel';
import { WaterViewModel } from '../viewmodel/WaterViewModel';
import { WaterRemindersViewModel } from '../viewmodel/WaterRemindersViewModel';
import type { WaterReminderPlan, WaterReminderScheduler } from '../viewmodel/WaterRemindersViewModel';
import { M2RemindersView } from '../views/M2RemindersView';
import type { M2RemindersLinks } from '../views/M2RemindersView';
import { M2WaterView } from '../views/M2WaterView';
import type { M2WaterLinks } from '../views/M2WaterView';
import { MedsTodayCard, WaterCard } from '../views/TodayCards';

const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const WATER_TODAY = {
  date: '2026-10-21', timezone: 'Asia/Kolkata', consumedMl: 750, goalMl: 2000, goalSource: 'OWNER', percent: 38,
  entries: [{ id: 'w1', amountMl: 500, recordedAt: '2026-10-21T04:00:00+00:00', source: 'MANUAL' }, { id: 'w2', amountMl: 250, recordedAt: '2026-10-21T06:00:00+00:00', source: 'MANUAL' }],
};
const WATER_ROUTES = {
  '/wellness/water/today': WATER_TODAY,
  '/wellness/water/goal': { goalMl: 2000, goalSource: 'OWNER', minMl: 500, maxMl: 6000 },
  '/wellness/water/days': {
    timezone: 'Asia/Kolkata', from: '2026-10-15', to: '2026-10-21', goalMl: 2000, goalSource: 'OWNER',
    days: [
      { date: '2026-10-15', consumedMl: 1500, entries: 4 }, { date: '2026-10-16', consumedMl: null, entries: 0 },
      { date: '2026-10-17', consumedMl: 2250, entries: 6 }, { date: '2026-10-18', consumedMl: null, entries: 0 },
      { date: '2026-10-19', consumedMl: 1000, entries: 3 }, { date: '2026-10-20', consumedMl: 1750, entries: 5 },
      { date: '2026-10-21', consumedMl: 750, entries: 2 },
    ],
  },
};

const iron = (over: Partial<MedsTodayPlan> = {}): MedsTodayPlan => ({
  planId: 'med_1', name: 'Ferrous sulphate', dosage: '200 mg', dosesPlanned: 2, dosesTaken: 1, dosesSkipped: 0, nextSlot: 2, undo: null, ...over,
});
const medsRoutes = (plans: MedsTodayPlan[]) => ({ '/meds/today': { date: '2026-10-21', timezone: 'Asia/Kolkata', plans } });

function waterLinks(): M2WaterLinks { return { back: vi.fn(), sos: vi.fn(), openSettings: vi.fn() }; }
function remLinks(): M2RemindersLinks { return { back: vi.fn(), sos: vi.fn(), water: vi.fn(), uploadPrescription: vi.fn(), addMedicine: vi.fn(), openSettings: vi.fn() }; }

function waterPhone(initial: WaterReminderPlan | null = null) {
  let plan = initial;
  const scheduler: WaterReminderScheduler = {
    current: vi.fn(async () => plan),
    permission: vi.fn(async () => 'granted' as const),
    request: vi.fn(async () => true),
    set: vi.fn(async (next: WaterReminderPlan) => { plan = { ...next }; }),
    clear: vi.fn(async () => { plan = null; }),
  };
  return scheduler;
}

function medPhone(permission: 'granted' | 'undetermined' | 'denied' = 'granted', allow = true) {
  const store: Record<string, ReminderSlot> = {};
  const scheduler: ReminderScheduler = {
    scheduled: vi.fn(async () => ({ ...store })),
    permission: vi.fn(async () => permission),
    request: vi.fn(async () => allow),
    set: vi.fn(async (id: string, slot: ReminderSlot) => { store[id] = slot; }),
    clear: vi.fn(async (id: string) => { delete store[id]; }),
  };
  return { scheduler, store };
}

describe('M2Water', () => {
  it('shows the server’s total against the goal, logs a glass, and draws unknown days as unknown', async () => {
    const posted: unknown[] = [];
    const { request } = fakeRequest({
      ...WATER_ROUTES,
      'POST /wellness/water': (_: string, init?: RequestInit) => { posted.push(JSON.parse(String(init?.body))); return { id: 'w3', ...WATER_TODAY, consumedMl: 1000 }; },
    });
    const vm = new WaterViewModel(request);
    vm.load();
    vm.loadWeek();
    const links = waterLinks();
    const { container } = wrap(<M2WaterView vm={vm} online links={links} />);
    expect(await screen.findByTestId('m2-water-total')).toHaveAccessibleName(en('m2r.water.ofGoal', { consumed: '750', goal: (2000).toLocaleString() }));
    expect(screen.getByTestId('m2-water-day-2026-10-16')).toHaveAccessibleName(expect.stringContaining(en('m2r.water.dayNone')));
    fireEvent.click(screen.getByTestId('m2-water-add'));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(await screen.findByText(en('m2r.water.heroMl', { ml: (1000).toLocaleString() }))).toBeInTheDocument();
    // No streak, medal or score anywhere on the screen.
    expect(screen.getByText(en('m2r.water.noScore'))).toBeInTheDocument();
    expect((container.textContent ?? '').replace(en('m2r.water.noScore'), '')).not.toMatch(/streak|medal|score|badge|points|well done|great job/i);
    fireEvent.click(screen.getByRole('button', { name: en('m2.sosSpoken') }));
    expect(links.sos).toHaveBeenCalledTimes(1);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('on the web, says reminders need the phone app instead of offering them', async () => {
    const vm = new WaterViewModel(fakeRequest(WATER_ROUTES).request);
    vm.load();
    wrap(<M2WaterView vm={vm} online links={waterLinks()} />);
    expect(await screen.findByTestId('m2-water-reminders-web')).toHaveTextContent(en('m2r.wrem.web'));
    expect(screen.queryByTestId('m2-water-rem-save')).toBeNull();
  });

  it('in the app, turns reminders on with the times the gap gives, and off again', async () => {
    const vm = new WaterViewModel(fakeRequest(WATER_ROUTES).request);
    vm.load();
    const scheduler = waterPhone();
    const reminders = new WaterRemindersViewModel(scheduler);
    await reminders.load();
    wrap(<M2WaterView vm={vm} reminders={reminders} online links={waterLinks()} />);
    expect(screen.getByTestId('m2-water-rem-state')).toHaveTextContent(en('m2r.wrem.offState'));
    fireEvent.click(screen.getByTestId('m2-water-rem-save'));
    await waitFor(() => expect(scheduler.set).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('m2-water-rem-off')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-water-rem-off'));
    await waitFor(() => expect(scheduler.clear).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(en('m2r.wrem.offState'))).toBeInTheDocument();
  });

  it('offline: the banner shows, the buttons are disabled, and nothing is sent', async () => {
    const { request, calls } = fakeRequest(WATER_ROUTES);
    const vm = new WaterViewModel(request);
    vm.load();
    vm.setOnline(false);
    wrap(<M2WaterView vm={vm} online={false} links={waterLinks()} />);
    const add = await screen.findByTestId('m2-water-add');
    expect(add).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(add);
    fireEvent.click(screen.getByTestId('m2-water-undo'));
    await flush();
    expect(calls.filter((c) => c.init?.method && c.init.method !== 'GET')).toEqual([]);
  });
});

describe('Medicines today', () => {
  it('lists names and doses from the server with taken / skip, and an undo inside the window', async () => {
    let current = iron();
    const { request, calls } = fakeRequest({
      '/meds/today': () => ({ date: '2026-10-21', timezone: 'Asia/Kolkata', plans: [current] }),
      'POST /meds/skip-dose': () => {
        current = { ...current, dosesSkipped: 1, nextSlot: null, undo: { doseId: 'dose_s', undoUntil: new Date(Date.now() + 60_000).toISOString(), outcome: 'SKIPPED' } };
        return { status: 'SUCCESS', already_logged: false, code: 'DOSE_SKIPPED', doseId: 'dose_s' };
      },
      'DELETE /meds/doses/': () => { current = iron(); return { success: true }; },
    });
    const vm = new MedsTodayViewModel(request);
    vm.load();
    const links = remLinks();
    const { container } = wrap(<M2RemindersView vm={vm} online links={links} />);
    expect(await screen.findByTestId('m2-rem-dose-med_1-name')).toHaveTextContent('Ferrous sulphate');
    expect(screen.getByText('200 mg')).toBeInTheDocument();
    expect(screen.getByTestId('m2-rem-dose-med_1-line')).toHaveTextContent(en('m2r.meds.progress', { taken: 1, planned: 2 }));
    fireEvent.click(screen.getByRole('button', { name: en('m2r.meds.skipSpoken', { name: 'Ferrous sulphate' }) }));
    await waitFor(() => expect(calls.some((c) => c.path === '/meds/skip-dose')).toBe(true));
    expect(await screen.findByRole('button', { name: en('m2r.meds.undoSkippedSpoken', { name: 'Ferrous sulphate' }) })).toBeInTheDocument();
    expect(screen.queryByTestId('m2-rem-dose-med_1-take')).toBeNull();
    fireEvent.click(screen.getByTestId('m2-rem-dose-med_1-undo'));
    await waitFor(() => expect(calls.some((c) => c.path === '/meds/doses/dose_s')).toBe(true));
    expect(await screen.findByTestId('m2-rem-dose-med_1-take')).toBeInTheDocument();
    // The web offers no reminders; it says they need the phone app.
    expect(screen.getByTestId('m2-rem-web-note')).toHaveTextContent(en('m2r.meds.remindWeb'));
    expect(screen.getByText(en('m2r.meds.noScore'))).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('empty: two next steps, and no medicine is invented', async () => {
    const vm = new MedsTodayViewModel(fakeRequest(medsRoutes([])).request);
    vm.load();
    const links = remLinks();
    wrap(<M2RemindersView vm={vm} online links={links} />);
    expect(await screen.findByTestId('m2-rem-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-rem-upload'));
    fireEvent.click(screen.getByTestId('m2-rem-add'));
    expect(links.uploadPrescription).toHaveBeenCalledTimes(1);
    expect(links.addMedicine).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId(/m2-rem-dose-/)).toBeNull();
  });

  it('in the app, a reminder is scheduled for a slot and cancelled with Off; refusal shows how to fix it', async () => {
    const vm = new MedsTodayViewModel(fakeRequest(medsRoutes([iron()])).request);
    vm.load();
    const ok = medPhone('granted');
    const reminders = new MedicineRemindersViewModel(ok.scheduler, fakeRequest({ '/meds/schedule': { plans: [{ id: 'med_1', name: 'Ferrous sulphate', dosage: '200 mg', frequency: '' }] } }).request);
    await reminders.load();
    wrap(<M2RemindersView vm={vm} reminders={reminders} online links={remLinks()} />);
    fireEvent.click(await screen.findByTestId('m2-rem-remind-med_1-morning'));
    await waitFor(() => expect(ok.store).toEqual({ med_1: 'morning' }));
    expect(await screen.findByTestId('m2-rem-remind-med_1-morning')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('m2-rem-remind-med_1-off'));
    await waitFor(() => expect(ok.store).toEqual({}));
    cleanup();

    const refused = medPhone('undetermined', false);
    const denied = new MedicineRemindersViewModel(refused.scheduler, fakeRequest({ '/meds/schedule': { plans: [] } }).request);
    await denied.load();
    const links = remLinks();
    wrap(<M2RemindersView vm={vm} reminders={denied} online links={links} />);
    fireEvent.click(await screen.findByTestId('m2-rem-remind-med_1-night'));
    expect(await screen.findByTestId('m2-rem-denied')).toHaveTextContent(en('reminders.denied'));
    expect(refused.scheduler.set).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('m2-rem-settings'));
    expect(links.openSettings).toHaveBeenCalledTimes(1);
  });

  it('the Insights cards: a dose and a glass each from one tap, each card on its own read', async () => {
    const { request, calls } = fakeRequest({
      ...medsRoutes([iron()]),
      '/wellness/water/today': new Error('down'),
      'POST /meds/log-dose': { status: 'SUCCESS', already_logged: false, code: 'DOSE_RECORDED', doseId: 'd' },
    });
    const meds = new MedsTodayViewModel(request);
    const water = new WaterViewModel(request);
    meds.load();
    water.load();
    const open = vi.fn();
    wrap(<><MedsTodayCard vm={meds} onOpen={open} /><WaterCard vm={water} onOpen={open} /></>);
    fireEvent.click(await screen.findByRole('button', { name: en('m2r.meds.takeSpoken', { name: 'Ferrous sulphate' }) }));
    await waitFor(() => expect(calls.some((c) => c.path === '/meds/log-dose')).toBe(true));
    // Water failed on its own; medicines still work, and water offers a retry.
    expect(await screen.findByTestId('m2-ins-water-error')).toBeInTheDocument();
    expect(screen.getByTestId('m2-ins-meds')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-ins-meds-open'));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
