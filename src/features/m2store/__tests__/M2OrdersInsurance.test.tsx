import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider } from '@/i18n';
import { fakeRequest, order } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import type { ClaimRequest, LivePolicy, OrderLine } from '@/data/types/workflowTypes';
import { OrdersViewModel } from '@/features/orders/viewmodel/OrdersViewModel';
import { canReturn, headline, initialTab, pastLabel, routeProgress } from '../data/orderProgress';
import { M2OrdersView } from '../views/M2OrdersView';
import type { M2OrdersLinks } from '../views/M2OrdersView';
import { M2InsuranceView } from '../views/M2InsuranceView';
import {
  InsuranceViewModel, checkClaim, checkPolicy, claimStage, maskPolicy, parseDay, rupeesToPaise, todayIso,
} from '../viewmodel/InsuranceViewModel';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

beforeEach(() => { motionFlag.reduced = true; });
afterEach(() => { cleanup(); });

type Status = OrderLine['status'];
const line = (status: Status, kind: OrderLine['kind'] = 'product', name = `${kind} item`): OrderLine =>
  ({ id: `ln-${status}-${kind}-${name}`, itemId: 'x', name, kind, quantity: 1, pricePaise: 14900, status });

const onTheWay = order({ id: 'ordway0001', delivery: { mode: 'delivery', address: 'Block C', city: 'Hyderabad', pincode: '500090' }, lines: [line('DISPATCHED', 'product', 'Cetirizine'), line('DISPATCHED', 'product', 'ORS')] });
const delivered = order({ id: 'orddone0002', delivery: { mode: 'delivery', address: 'Block C', city: '', pincode: '' }, lines: [line('COMPLETED', 'product', 'Vitamin D3 60K')] });
const labDone = order({ id: 'ordlab00003', lines: [line('COMPLETED', 'lab', 'Complete blood count')] });
const unpaid = order({ id: 'ordunpaid04', paymentStatus: 'UNPAID', lines: [line('REQUESTED', 'product', 'Paracetamol')] });

function links(): M2OrdersLinks {
  return {
    help: vi.fn(), sos: vi.fn(), shop: vi.fn(), buyAgain: vi.fn(), returnItem: vi.fn(), reports: vi.fn(), details: vi.fn(), allOrders: vi.fn(),
    openEmergencyCard: vi.fn(), openPass: vi.fn(), openCrisis: vi.fn(),
  };
}

async function ordersVm(items: unknown[], extra: Record<string, unknown> = {}) {
  const fake = fakeRequest({ '/orders': { items, total: items.length }, ...extra });
  const vm = new OrdersViewModel(fake.request);
  await vm.load();
  return { vm, calls: fake.calls };
}

describe('M2Orders data (pure, from the order API only)', () => {
  it('opens on Active when something is going, else Past', () => {
    expect(initialTab([delivered, onTheWay])).toBe('active');
    expect(initialTab([delivered, labDone])).toBe('past');
    expect(initialTab([])).toBe('past');
  });

  it('puts the marker on the current step and draws the scooter only once a delivery is on its way', () => {
    const way = routeProgress(onTheWay);
    expect(way.steps.map((s) => s.key)).toEqual(['placed', 'paid', 'accepted', 'dispatched', 'completed']);
    expect(way.at).toBe(3);
    expect(way.show).toEqual(['done', 'done', 'done', 'now', 'todo']);
    expect(way.fraction).toBe(0.75);
    expect(way.moving).toBe(true);
    expect(routeProgress(delivered)).toMatchObject({ at: 4, finished: true, fraction: 1 });
    const waiting = routeProgress(unpaid);
    expect(waiting.at).toBe(1);
    expect(waiting.fraction).toBe(0.25);
    expect(waiting.show).toEqual(['done', 'now', 'todo', 'todo', 'todo']);
    expect(waiting.moving).toBe(false);
    const pickup = routeProgress(order({ lines: [line('DISPATCHED')] }));
    expect(pickup.moving).toBe(false);
  });

  it('says the step in the headline, never a time', () => {
    expect(headline(onTheWay)).toEqual({ key: 'm2.ord.head.dispatchedTo', vars: { place: 'Block C' } });
    expect(headline(order({ lines: [line('DISPATCHED')] })).key).toBe('m2.ord.head.dispatchedPickup');
    expect(headline(order({ lines: [line('ACCEPTED', 'consultation')] })).key).toBe('m2.ord.head.acceptedService');
    expect(headline(unpaid).key).toBe('m2.ord.head.awaitingPayment');
  });

  it('labels past orders by how they ended and offers a return only for goods', () => {
    expect(pastLabel(delivered)).toBe('m2.ord.past.delivered');
    expect(pastLabel(order({ lines: [line('COMPLETED')] }))).toBe('m2.ord.past.pickedUp');
    expect(pastLabel(labDone)).toBe('m2.ord.past.done');
    expect(pastLabel(order({ lines: [line('CANCELLED')] }))).toBe('phone.orders.state.cancelled');
    expect(canReturn(delivered)).toBe(true);
    expect(canReturn(labDone)).toBe(false);
    expect(canReturn(onTheWay)).toBe(false);
  });
});

describe('M2Orders', () => {
  it('shows an active order with its real steps, the route band and no invented handover code or arrival time', async () => {
    const { vm } = await ordersVm([onTheWay, delivered]);
    const l = links();
    wrap(<M2OrdersView vm={vm} links={l} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your orders' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active · 1' })).toHaveAttribute('aria-selected', 'true');
    const card = screen.getByTestId('m2-ord-card-ordway0001');
    expect(within(card).getByText('Order ORDWAY00')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'On the way to Block C' })).toBeInTheDocument();
    expect(within(card).getByText('2 items · ₹578 paid')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Order progress: step 4 of 5, Dispatched' })).toBeInTheDocument();
    expect(within(card).getByText('Now')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/handover|arriving|by \d/i);
    fireEvent.click(within(card).getByRole('button', { name: 'Get help with order ORDWAY00' }));
    expect(l.help).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'SOS, get help now' }));
    expect(l.sos).toHaveBeenCalled();
  });

  it('lists past orders with Buy again, Return and My reports (a lab order never shows a result)', async () => {
    const { vm } = await ordersVm([onTheWay, delivered, labDone]);
    const l = links();
    wrap(<M2OrdersView vm={vm} links={l} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Past' }));
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
    const past = screen.getByTestId('m2-ord-past-orddone0002');
    expect(within(past).getByText('Delivered')).toBeInTheDocument();
    fireEvent.click(within(past).getByRole('link', { name: 'Buy Vitamin D3 60K again' }));
    expect(l.buyAgain).toHaveBeenCalledWith(delivered);
    fireEvent.click(within(past).getByRole('link', { name: 'Return an item from order ORDDONE0' }));
    expect(l.returnItem).toHaveBeenCalledWith(delivered);
    const lab = screen.getByTestId('m2-ord-past-ordlab00003');
    expect(within(lab).queryByRole('link', { name: /Buy .* again/ })).toBeNull();
    fireEvent.click(within(lab).getByRole('link', { name: 'Open my reports in My health' }));
    expect(l.reports).toHaveBeenCalled();
    expect(lab.textContent).not.toMatch(/report ready|result/i);
    fireEvent.click(within(lab).getAllByRole('link', { name: 'Details of order ORDLAB00' })[0]!);
    expect(l.details).toHaveBeenCalledWith('ordlab00003');
  });

  it('opens on Past when nothing is on the way, and says so on Active', async () => {
    const { vm } = await ordersVm([delivered]);
    wrap(<M2OrdersView vm={vm} links={links()} />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true'));
    fireEvent.click(screen.getByRole('tab', { name: 'Active' }));
    expect(screen.getByTestId('m2-ord-empty-active')).toHaveTextContent('Nothing on the way');
    fireEvent.click(screen.getByTestId('m2-ord-see-past'));
    expect(screen.getByTestId('m2-ord-past-orddone0002')).toBeInTheDocument();
  });

  it('cancels an unpaid order nobody has acted on', async () => {
    const { vm, calls } = await ordersVm([unpaid], { 'POST /orders/': { ok: true } });
    wrap(<M2OrdersView vm={vm} links={links()} />);
    await act(async () => { fireEvent.click(screen.getByTestId('m2-ord-cancel-ordunpaid04')); });
    expect(calls.some((c) => c.path === '/orders/ordunpaid04/cancel' && c.init?.method === 'POST')).toBe(true);
  });

  it('shows the first-time, loading and error states', async () => {
    const { vm } = await ordersVm([]);
    const l = links();
    const { unmount } = wrap(<M2OrdersView vm={vm} links={l} />);
    expect(screen.getByTestId('m2-ord-first')).toHaveTextContent('No orders yet');
    fireEvent.click(screen.getByTestId('m2-ord-browse'));
    expect(l.shop).toHaveBeenCalled();
    unmount();
    const loading = new OrdersViewModel(fakeRequest({}).request);
    const second = wrap(<M2OrdersView vm={loading} links={links()} />);
    expect(screen.getByLabelText('Loading your orders')).toBeInTheDocument();
    second.unmount();
    const failing = new OrdersViewModel(fakeRequest({}).request);
    await failing.load();
    wrap(<M2OrdersView vm={failing} links={links()} />);
    expect(screen.getByText('Your orders didn’t load')).toBeInTheDocument();
  });

  it('draws one order on its own page, and says so when it is not found', async () => {
    const { vm } = await ordersVm([delivered]);
    const l = links();
    const { unmount } = wrap(<M2OrdersView vm={vm} links={l} focusId="orddone0002" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Order ORDDONE0' })).toBeInTheDocument();
    expect(screen.getByTestId('m2-ord-card-orddone0002')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All my orders' }));
    expect(l.allOrders).toHaveBeenCalled();
    unmount();
    wrap(<M2OrdersView vm={vm} links={links()} focusId="nope" />);
    expect(screen.getByText('We couldn’t find this order')).toBeInTheDocument();
  });

  it('keeps the live dots still under reduced motion and pulses them when motion is allowed', async () => {
    const { vm } = await ordersVm([onTheWay, unpaid]);
    const first = wrap(<M2OrdersView vm={vm} links={links()} />);
    expect(screen.queryByTestId('m2-ord-now-pulse')).toBeNull();
    expect(screen.queryByTestId('m2-ord-route-ordunpaid04-pulse')).toBeNull();
    first.unmount();
    motionFlag.reduced = false;
    wrap(<M2OrdersView vm={vm} links={links()} />);
    expect(screen.getAllByTestId('m2-ord-now-pulse').length).toBeGreaterThan(0);
    expect(screen.getByTestId('m2-ord-route-ordunpaid04-pulse')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { vm } = await ordersVm([onTheWay, delivered]);
    const { container } = wrap(<M2OrdersView vm={vm} links={links()} />);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

const policy = (over: Partial<LivePolicy> = {}): LivePolicy => ({ id: 'pol1', insurer: 'Campus Health Insurer', policyNumber: 'SHP-00994417', sumInsured: 300000, validUntil: '2099-05-31', verification: 'USER_RECORDED', ...over });
const claim = (over: Partial<ClaimRequest> = {}): ClaimRequest => ({ id: 'clm1', policyId: 'pol1', providerName: 'Campus clinic', service: 'Consult and lab tests', amountPaise: 120000, status: 'DRAFT', createdAt: 1_790_000_000, ...over });

async function insuranceVm(routes: Record<string, unknown>) {
  const fake = fakeRequest(routes);
  const vm = new InsuranceViewModel(fake.request);
  await vm.load();
  return { vm, calls: fake.calls };
}

describe('M2Insurance data (pure)', () => {
  it('maps a claim status to its stage; only DRAFT exists until an insurer is connected', () => {
    expect(claimStage('DRAFT')).toEqual({ step: 1, label: 'm2.ins.stage.prepared' });
    expect(claimStage('SUBMITTED').step).toBe(2);
    expect(claimStage('APPROVED').step).toBe(3);
    expect(claimStage('PAID')).toEqual({ step: 4, label: 'm2.ins.stage.paid' });
    expect(claimStage('SOMETHING_ELSE').step).toBe(1);
  });

  it('masks the policy number and checks the forms as the server does', () => {
    expect(maskPolicy('SHP-00994417')).toBe('••••4417');
    expect(maskPolicy('123')).toBe('123');
    expect(parseDay('2027-05-31')?.getDate()).toBe(31);
    expect(parseDay('2027-02-30')).toBeNull();
    expect(parseDay('31/05/2027')).toBeNull();
    expect(todayIso(new Date(2026, 9, 1))).toBe('2026-10-01');
    expect(rupeesToPaise('1,200.50')).toBe(120050);
    expect(rupeesToPaise('0')).toBeNull();
    expect(checkPolicy({ insurer: 'A', policyNumber: 'P1', sumInsured: '1.5', validUntil: 'soon' }))
      .toEqual({ insurer: 'm2.ins.required', sumInsured: 'm2.ins.amountError', validUntil: 'm2.ins.dateError' });
    expect(checkPolicy({ insurer: 'Acme', policyNumber: 'P1', sumInsured: '300000', validUntil: '2027-05-31' })).toEqual({});
    expect(checkClaim({ policyId: '', providerName: '', service: '', amount: 'x' })).toEqual({ policyId: 'm2.ins.required', amount: 'm2.ins.amountError' });
  });
});

describe('M2Insurance', () => {
  it('shows the student’s own policy record, marked as theirs, and the claims with their stage', async () => {
    const { vm } = await insuranceVm({ '/health/policies': { items: [policy()] }, '/insurance/claims': { items: [claim()] } });
    wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    const card = screen.getByTestId('m2-ins-policy');
    expect(within(card).getByText('Campus Health Insurer')).toBeInTheDocument();
    expect(within(card).getByText('₹3,00,000')).toBeInTheDocument();
    expect(within(card).getByText('••••4417')).toBeInTheDocument();
    expect(within(card).queryByText('SHP-00994417')).toBeNull();
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(within(card).getByText('You entered these details. Your insurer hasn’t confirmed them.')).toBeInTheDocument();
    const row = screen.getByTestId('m2-ins-claim-clm1');
    expect(row).toHaveAccessibleName(/Consult and lab tests · \w+\. Prepared, step 1 of 4/);
    expect(screen.getByText('Claims stay “prepared” until your insurer is connected. Nothing is sent without you.')).toBeInTheDocument();
  });

  it('shows E-card, Network hospitals and More cover as not available, never as buttons', async () => {
    const { vm } = await insuranceVm({ '/health/policies': { items: [policy()] }, '/insurance/claims': { items: [] } });
    wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(screen.getByTestId('m2-ins-ecard')).toHaveAccessibleName('E-card, Not available yet');
    expect(screen.getByTestId('m2-ins-network')).toHaveAccessibleName('Network hospitals, Not available yet');
    for (const name of ['Accident cover', 'Health top-up', 'Travel abroad']) expect(screen.getByLabelText(`${name}, Not yet`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /E-card|Network hospitals|Accident cover/ })).toBeNull();
    expect(screen.getByTestId('m2-ins-no-claims')).toBeInTheDocument();
  });

  it('marks an expired policy, and offers to add one when there is none', async () => {
    const { vm } = await insuranceVm({ '/health/policies': { items: [policy({ validUntil: '2020-01-01' })] }, '/insurance/claims': { items: [] } });
    const first = wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(within(screen.getByTestId('m2-ins-policy')).getByText('Expired')).toBeInTheDocument();
    first.unmount();
    const none = await insuranceVm({ '/health/policies': { items: [] }, '/insurance/claims': { items: [] } });
    wrap(<M2InsuranceView vm={none.vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(screen.getByTestId('m2-ins-no-policy')).toHaveTextContent('Add your health policy');
  });

  it('prepares a claim against the policy and saves nothing to an insurer', async () => {
    const { vm, calls } = await insuranceVm({
      '/health/policies': { items: [policy()] }, '/insurance/claims': { items: [] }, 'POST /insurance/claims': { id: 'clm9', status: 'DRAFT' },
    });
    wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start a claim' }));
    const sheet = await screen.findByTestId('m2-ins-claim-sheet');
    fireEvent.change(within(sheet).getByLabelText('Amount (₹)'), { target: { value: '1200' } });
    fireEvent.change(within(sheet).getByLabelText('Service'), { target: { value: 'Physiotherapy' } });
    await act(async () => { fireEvent.click(within(sheet).getByTestId('m2-ins-save-claim')); });
    const post = calls.find((c) => c.path === '/insurance/claims' && c.init?.method === 'POST');
    expect(post && JSON.parse(String(post.init?.body))).toEqual({ policyId: 'pol1', providerName: '', service: 'Physiotherapy', amountPaise: 120000 });
    expect(calls.some((c) => c.path.includes('/submit'))).toBe(false);
  });

  it('checks the policy form before sending it', async () => {
    const { vm, calls } = await insuranceVm({ '/health/policies': { items: [] }, '/insurance/claims': { items: [] } });
    wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    fireEvent.click(screen.getByTestId('m2-ins-add-policy'));
    const sheet = await screen.findByTestId('m2-ins-policy-sheet');
    fireEvent.click(within(sheet).getByTestId('m2-ins-save-policy'));
    expect(within(sheet).getByText('Enter the date as year-month-day')).toBeInTheDocument();
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
  });

  it('shows the loading and error states', async () => {
    const loading = new InsuranceViewModel(fakeRequest({}).request);
    const first = wrap(<M2InsuranceView vm={loading} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(screen.getByLabelText('Loading your cover')).toBeInTheDocument();
    first.unmount();
    const { vm } = await insuranceVm({});
    wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(screen.getByText('Your cover didn’t load')).toBeInTheDocument();
  });

  it('runs the card shine only when motion is allowed', async () => {
    const { vm } = await insuranceVm({ '/health/policies': { items: [policy()] }, '/insurance/claims': { items: [] } });
    const first = wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(screen.queryByTestId('m2-ins-shine')).toBeNull();
    first.unmount();
    motionFlag.reduced = false;
    wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn() }} />);
    expect(screen.getByTestId('m2-ins-shine')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { vm } = await insuranceVm({ '/health/policies': { items: [policy()] }, '/insurance/claims': { items: [claim(), claim({ id: 'clm2', status: 'PAID', service: 'Physiotherapy' })] } });
    const { container } = wrap(<M2InsuranceView vm={vm} links={{ back: vi.fn(), sos: vi.fn(), manage: vi.fn() }} />);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
