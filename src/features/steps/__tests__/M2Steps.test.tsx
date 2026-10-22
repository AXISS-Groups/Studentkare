import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider, translate } from '@/i18n';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { getSetting } from '@/data/services/config';
import { InsightsViewModel } from '@/features/insights/viewmodel/InsightsViewModel';
import { M2InsightsView } from '@/features/insights/views/M2InsightsView';
import type { ActivityTrends } from '../data/stepsApi';
import type { ConnectorStatus, StepConnector } from '../sources/connectors';
import type { HealthSyncOutcome } from '../sources/healthSources';
import type { StepProvider } from '../model/stepSources';
import { StepsViewModel } from '../viewmodel/StepsViewModel';
import { M2StepsView } from '../views/M2StepsView';

const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
const WEEK_PATH = '/activity/trends';

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function week(days: ActivityTrends['days'], average: number | null = null): ActivityTrends {
  return {
    period: 'this_week', timezone: 'Asia/Kolkata', from: '2026-10-19', to: '2026-10-21', daysInPeriod: 3,
    metrics: { steps: { unit: 'steps', total: null, dailyAverage: average, daysWithData: days.length } },
    days,
  };
}
const day = (date: string, steps: number, source: 'HEALTHKIT' | 'HEALTH_CONNECT' | 'PHONE_MOTION' | 'MANUAL') => ({
  date, steps, distanceKm: null, floors: null, activeEnergyKcal: null, standingMinutes: null, sources: { steps: source },
});
const EMPTY = week([]);
const FULL = week([day('2026-10-19', 4210, 'MANUAL'), day('2026-10-21', 6120, 'HEALTHKIT')], 5165);

interface FakeConnector extends StepConnector {
  connect: Mock<() => Promise<ConnectorStatus>>;
  status: Mock<() => Promise<ConnectorStatus>>;
  disconnect: Mock<() => void>;
  emit?: (steps: number) => void;
  stopped?: () => boolean;
}

function connector(provider: StepProvider, opts: { status?: ConnectorStatus; connect?: ConnectorStatus; live?: boolean; dayTotal?: boolean } = {}): FakeConnector {
  let state: ConnectorStatus = opts.status ?? 'not_connected';
  let listener: ((n: number) => void) | null = null;
  let stopped = false;
  const c: FakeConnector = {
    provider,
    readsDayTotal: opts.dayTotal ?? true,
    status: vi.fn(async () => state),
    connect: vi.fn(async () => { state = opts.connect ?? 'connected'; return state; }),
    disconnect: vi.fn(() => { state = 'not_connected'; }),
    openSettings: vi.fn(),
  };
  if (opts.live) {
    c.watchLive = (cb) => { listener = cb; stopped = false; return () => { stopped = true; listener = null; }; };
    c.emit = (n) => listener?.(n);
    c.stopped = () => stopped;
  }
  return c;
}

function makeVm(over: { connectors?: StepConnector[]; routes?: Record<string, unknown>; sync?: () => Promise<HealthSyncOutcome> } = {}) {
  const { request, calls } = fakeRequest({ [WEEK_PATH]: FULL, ...over.routes });
  const sync = vi.fn(over.sync ?? (async (): Promise<HealthSyncOutcome> => ({ status: 'not_connected' })));
  const ticks: Array<() => void> = [];
  const every = vi.fn((_ms: number, run: () => void) => { ticks.push(run); return () => undefined; });
  const vm = new StepsViewModel({ request, connectors: over.connectors ?? [], sync, every, now: () => new Date(2026, 9, 21, 15) });
  return { vm, calls, sync, every, ticks };
}

describe('StepsViewModel', () => {
  it('on the web reads the week, connects nothing and syncs nothing', async () => {
    const { vm, sync, every } = makeVm();
    vm.open();
    await waitFor(() => expect(vm.week.phase).toBe('ready'));
    expect(vm.automatic).toBe(false);
    expect(sync).not.toHaveBeenCalled();
    expect(every).not.toHaveBeenCalled();
    expect(vm.today).toEqual({ date: '2026-10-21', steps: 6120, source: 'HEALTHKIT' });
    vm.dispose();
  });

  it('opening the screen never asks for a permission; Continue after the explainer does', async () => {
    const hk = connector('healthkit');
    const { vm, sync } = makeVm({ connectors: [hk], sync: async () => ({ status: 'synced', provider: 'healthkit', date: '2026-10-21', day: FULL.days[1] }) });
    vm.open();
    await waitFor(() => expect(vm.states.healthkit).toBe('not_connected'));
    expect(hk.connect).not.toHaveBeenCalled();
    vm.explain('healthkit');
    expect(vm.explaining).toBe('healthkit');
    vm.cancelExplain();
    expect(hk.connect).not.toHaveBeenCalled();
    vm.explain('healthkit');
    await vm.confirmConnect();
    expect(hk.connect).toHaveBeenCalledTimes(1);
    expect(vm.states.healthkit).toBe('connected');
    expect(sync).toHaveBeenCalled();
    vm.dispose();
  });

  it('permission denied leaves the source off and says so', async () => {
    const motion = connector('phone_motion', { connect: 'denied', live: true });
    const { vm } = makeVm({ connectors: [motion] });
    vm.open();
    vm.explain('phone_motion');
    await vm.confirmConnect();
    expect(vm.states.phone_motion).toBe('denied');
    expect(vm.liveSteps).toBeNull();
    vm.dispose();
  });

  it('a phone without the sensor shows it as unavailable', async () => {
    const { vm } = makeVm({ connectors: [connector('phone_motion', { status: 'unavailable' })] });
    await vm.refreshSources();
    expect(vm.states.phone_motion).toBe('unavailable');
  });

  it('counts live while open and stops when the screen goes away', async () => {
    const motion = connector('phone_motion', { status: 'connected', live: true, dayTotal: false });
    const { vm } = makeVm({ connectors: [motion] });
    vm.open();
    await waitFor(() => expect(vm.liveSteps).toBe(0));
    expect(vm.liveOnly).toBe(true);
    act(() => motion.emit?.(37));
    expect(vm.liveSteps).toBe(37);
    vm.dispose();
    expect(motion.stopped?.()).toBe(true);
    expect(vm.liveSteps).toBeNull();
  });

  it('re-syncs on the registry cadence and re-reads the week after a sync', async () => {
    const { vm, every, ticks, sync, calls } = makeVm({
      connectors: [connector('health_connect', { status: 'connected' })],
      sync: async () => ({ status: 'synced', provider: 'health_connect', date: '2026-10-21', day: FULL.days[1] }),
    });
    vm.open();
    expect(every).toHaveBeenCalledWith(getSetting('wellness.steps_live_sync_seconds') * 1000, expect.any(Function));
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(vm.sync).toBe('synced'));
    ticks[0]();
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith(WEEK_PATH)).length).toBeGreaterThanOrEqual(3));
    vm.dispose();
  });

  it('typed steps: refused above the registry maximum without a request; saved for the server’s today', async () => {
    const posted: unknown[] = [];
    const { vm, calls } = makeVm({ routes: { 'POST /activity/entries': (_p: string, init?: RequestInit) => { posted.push(JSON.parse(String(init?.body))); return FULL.days[1]; } } });
    vm.load();
    await waitFor(() => expect(vm.week.phase).toBe('ready'));
    const max = getSetting('wellness.activity_steps_max');
    vm.setTyped(String(max + 1));
    await vm.saveTyped();
    expect(vm.typedState).toBe('error');
    expect(vm.typedError).toEqual({ key: 'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE', vars: { min: 0, max } });
    vm.setTyped('12.5');
    await vm.saveTyped();
    expect(vm.typedState).toBe('error');
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
    vm.setTyped('3400');
    await vm.saveTyped();
    expect(vm.typedState).toBe('saved');
    expect(posted).toEqual([{ date: '2026-10-21', steps: 3400 }]);
  });
});

describe('M2StepsView', () => {
  it('web: today with its source, the week with an empty day as no number, and the open-the-phone-app card', async () => {
    const { vm } = makeVm();
    vm.open();
    const { container } = wrap(<M2StepsView vm={vm} links={{ back: vi.fn() }} />);
    expect(await screen.findByTestId('m2-steps-today-value')).toHaveTextContent('6,120');
    expect(screen.getByTestId('m2-steps-today-source')).toHaveTextContent(en('steps.source.HEALTHKIT'));
    expect(screen.getByTestId('m2-steps-web')).toHaveTextContent(en('steps.sources.webTitle'));
    expect(screen.queryByTestId('m2-steps-sources')).toBeNull();
    const chart = within(screen.getByTestId('m2-steps-week'));
    expect(chart.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByTestId('m2-steps-bar-2026-10-20')).toHaveAttribute('aria-label', expect.stringContaining(en('steps.week.barNone', { day: '' }).trim().slice(1)));
    expect(screen.getByTestId('m2-steps-bar-2026-10-19')).toHaveAttribute('aria-label', expect.stringContaining(en('steps.source.MANUAL')));
    expect(screen.getByTestId('m2-steps-average')).toHaveTextContent('5,165');
    expect(screen.getByText(en('steps.noPressure'))).toBeInTheDocument();
    // No goal, ring, score, streak or medal anywhere.
    const shown = (container.textContent ?? '').replace(en('steps.noPressure'), '').replace(en('steps.explain.use'), '');
    expect(shown).not.toMatch(/goal|score|streak|medal|badge|points|great job|%/i);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    vm.dispose();
  });

  it('no steps for today: no invented number, says what to do', async () => {
    const { vm } = makeVm({ routes: { [WEEK_PATH]: EMPTY } });
    vm.open();
    wrap(<M2StepsView vm={vm} links={{ back: vi.fn() }} />);
    expect(await screen.findByTestId('m2-steps-today-none')).toHaveTextContent(en('steps.noneToday'));
    expect(screen.getByText(en('steps.noneTodayWeb'))).toBeInTheDocument();
    expect(screen.getByTestId('m2-steps-week-empty')).toBeInTheDocument();
    expect(screen.getByTestId('m2-steps-today').textContent ?? '').not.toMatch(/\d/);
    expect(screen.getByTestId('m2-steps-week').textContent ?? '').not.toMatch(/\d/);
    vm.dispose();
  });

  it('the week failing to load says so and retries', async () => {
    let fail = true;
    const { vm } = makeVm({ routes: { [WEEK_PATH]: () => { if (fail) throw new Error('down'); return FULL; } } });
    vm.open();
    wrap(<M2StepsView vm={vm} links={{ back: vi.fn() }} />);
    const retry = await screen.findByTestId('m2-steps-retry');
    expect(screen.getByText(en('steps.failed'), { selector: '[data-testid="m2-steps-hero"] *' })).toBeInTheDocument();
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByTestId('m2-steps-today-value')).toHaveTextContent('6,120');
    vm.dispose();
  });

  it('phone: each source with its state; the explainer comes before the platform prompt', async () => {
    const hc = connector('health_connect');
    const motion = connector('phone_motion', { status: 'blocked' });
    const { vm } = makeVm({ connectors: [motion, hc] });
    vm.open();
    const { container } = wrap(<M2StepsView vm={vm} links={{ back: vi.fn() }} />);
    expect(await screen.findByTestId('m2-steps-state-health_connect')).toHaveTextContent(en('steps.state.not_connected'));
    expect(screen.getByTestId('m2-steps-state-phone_motion')).toHaveTextContent(en('steps.state.blocked'));
    // Most trusted first.
    const rows = screen.getAllByTestId(/^m2-steps-source-/).map((el) => el.getAttribute('data-testid'));
    expect(rows).toEqual(['m2-steps-source-health_connect', 'm2-steps-source-phone_motion']);
    expect(screen.getByText(en('steps.sources.order'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-steps-settings-phone_motion'));
    expect(motion.openSettings).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('m2-steps-connect-health_connect'));
    expect(hc.connect).not.toHaveBeenCalled();
    expect(await screen.findByText(en('steps.explain.body.health_connect'))).toBeInTheDocument();
    expect(screen.getByText(en('steps.explain.use'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-steps-explain-continue'));
    await waitFor(() => expect(hc.connect).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('m2-steps-state-health_connect')).toHaveTextContent(en('steps.state.connected')));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    vm.dispose();
  });

  it('typed entry shows the server’s refusal in the student’s words', async () => {
    const { ApiError } = await import('@/data/services/http');
    const { vm } = makeVm({ routes: { 'POST /activity/entries': () => { throw new ApiError('nope', 422, { code: 'ACTIVITY_DAY_TOO_OLD', values: { days: 7 } }); } } });
    vm.open();
    wrap(<M2StepsView vm={vm} links={{ back: vi.fn() }} />);
    await screen.findByTestId('m2-steps-today-value');
    fireEvent.change(screen.getByLabelText(en('steps.typed.label')), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('m2-steps-typed-save'));
    expect(await screen.findByText(en('wellness.msg.ACTIVITY_DAY_TOO_OLD', { days: 7 }))).toBeInTheDocument();
    vm.dispose();
  });
});

describe('Steps card on My health', () => {
  const links = () => ({ sos: vi.fn(), trends: vi.fn(), records: vi.fn(), reportUpload: vi.fn(), steps: vi.fn(), medicines: vi.fn(), water: vi.fn() });

  it('shows today’s steps with their source and opens Steps', async () => {
    const { request } = fakeRequest({ [WEEK_PATH]: FULL });
    const vm = new InsightsViewModel(request);
    vm.load();
    const l = links();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={l} stepsOnPhone />);
    const card = await screen.findByTestId('m2-ins-steps');
    expect(card).toHaveTextContent(en('steps.count', { count: '6,120' }));
    expect(card).toHaveTextContent(en('steps.source.HEALTHKIT'));
    fireEvent.click(card);
    expect(l.steps).toHaveBeenCalled();
    vm.dispose();
  });

  it('web with no steps: no number, says to open the phone app', async () => {
    const { request } = fakeRequest({ [WEEK_PATH]: EMPTY });
    const vm = new InsightsViewModel(request);
    vm.load();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links()} />);
    const card = await screen.findByTestId('m2-ins-steps');
    expect(card).toHaveTextContent(en('steps.card.none'));
    expect(card).toHaveTextContent(en('steps.card.web'));
    expect(card.textContent ?? '').not.toMatch(/\d/);
    vm.dispose();
  });

  it('a failed read is its own card error, with a retry', async () => {
    const { request } = fakeRequest({ [WEEK_PATH]: new Error('down') });
    const vm = new InsightsViewModel(request);
    vm.load();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links()} />);
    expect(await screen.findByTestId('m2-ins-steps-error')).toHaveTextContent(en('steps.card.failed'));
    vm.dispose();
  });
});
