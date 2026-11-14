import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { translate } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { invalidateSessionScope, setSessionAccount } from '@/core/session/sessionScope';
import { emergencyStore } from '../../state/EmergencyStore';
import { emergencyRepository } from '../../data/EmergencyRepository';
import { anyoneReached } from '../../domain/Emergency';
import type { SosAlert } from '../../domain/Emergency';

const alert = (over: Partial<SosAlert> = {}): SosAlert => ({
  id: 'a1', status: 'ACTIVE', campus: 'IIT Hyderabad', locationNote: null, createdAt: 1, acknowledgedAt: null,
  resolvedAt: null, cancelledAt: null, resolutionNote: null,
  deliveries: [{ recipientKind: 'CAMPUS_CONSOLE', channel: 'CONSOLE', recipient: 'IIT Hyderabad', status: 'SENT', detail: '' }],
  ...over,
});

function deferred<T>() {
  const controls: { resolve: (value: T) => void; reject: (reason: Error) => void }[] = [];
  const promise = new Promise<T>((resolve, reject) => { controls.push({ resolve, reject }); });
  const control = controls[0];
  if (!control) throw new Error('Deferred promise was not initialized');
  return { promise, ...control };
}

const pendingOperations = ['current', 'raise', 'cancel'] as const;

/** Starts an account A request without awaiting the response that the test controls. */
async function startPendingOperation(operation: typeof pendingOperations[number], promise: Promise<SosAlert>): Promise<{ request: Promise<void> }> {
  if (operation === 'current') {
    vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(promise);
    return { request: emergencyStore.loadCurrent() };
  }
  if (operation === 'raise') {
    vi.spyOn(emergencyRepository, 'raiseSos').mockReturnValueOnce(promise);
    return { request: emergencyStore.dispatchEmergency() };
  }
  vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
  await emergencyStore.dispatchEmergency();
  vi.spyOn(emergencyRepository, 'cancel').mockReturnValueOnce(promise);
  return { request: emergencyStore.cancelAlert() };
}

function expectCleared() {
  expect(emergencyStore.status).toBe('IDLE');
  expect(emergencyStore.alert).toBeNull();
  expect(emergencyStore.locationNote).toBe('');
  expect(emergencyStore.error).toBe('');
  expect(emergencyStore.refreshError).toBe('');
  expect(emergencyStore.countdownSeconds).toBe(3);
}

describe('M04 SOS store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    invalidateSessionScope();
    setSessionAccount('account-a');
    emergencyStore.reset();
  });

  afterEach(() => {
    invalidateSessionScope();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('refreshes an active alert through acknowledgement, delivery changes and resolution', async () => {
    const current = vi.spyOn(emergencyRepository, 'current');
    current.mockResolvedValueOnce(alert());
    await emergencyStore.loadCurrent();
    const acknowledged = alert({ status: 'ACKNOWLEDGED', acknowledgedAt: 2,
      deliveries: [{ recipientKind: 'CAMPUS_SECURITY', channel: 'WHATSAPP', recipient: 'Gate', status: 'SENT', detail: '' }] });
    current.mockResolvedValueOnce(acknowledged);
    await emergencyStore.loadCurrent();
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.alert).toEqual(acknowledged);
    const resolved = { ...acknowledged, status: 'RESOLVED' as const, resolvedAt: 3, resolutionNote: 'Synthetic resolution' };
    current.mockResolvedValueOnce(resolved);
    await emergencyStore.loadCurrent();
    expect(emergencyStore.status).toBe('CLOSED');
    expect(emergencyStore.alert).toEqual(resolved);
  });

  it.each(['ACTIVE', 'RESOLVED'] as const)('keeps the last %s record on a refresh failure and clears only the refresh warning on recovery', async (status) => {
    const current = vi.spyOn(emergencyRepository, 'current').mockResolvedValueOnce(alert({ status }));
    await emergencyStore.loadCurrent();
    current.mockRejectedValueOnce(new Error('offline'));
    await emergencyStore.loadCurrent();
    expect(emergencyStore.alert?.status).toBe(status);
    expect(emergencyStore.status).toBe(status === 'ACTIVE' ? 'OPEN' : 'CLOSED');
    expect(emergencyStore.refreshError).toBe('sos.refreshFailed');
    emergencyStore.error = 'sos.cancelFailed';
    current.mockResolvedValueOnce(alert({ status }));
    await emergencyStore.loadCurrent();
    expect(emergencyStore.refreshError).toBe('');
    expect(emergencyStore.error).toBe('sos.cancelFailed');
  });

  it('reports an initial refresh failure without inventing a recorded alert', async () => {
    vi.spyOn(emergencyRepository, 'current').mockRejectedValueOnce(new Error('offline'));
    await emergencyStore.loadCurrent();
    expect(emergencyStore.status).toBe('IDLE');
    expect(emergencyStore.alert).toBeNull();
    expect(emergencyStore.refreshError).toBe('sos.refreshFailed');
  });

  it.each(['success', 'failure'] as const)('ignores an older refresh %s after a newer refresh resolves the alert', async (outcome) => {
    const pending = deferred<SosAlert>();
    const current = vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(pending.promise);
    const older = emergencyStore.loadCurrent();
    current.mockResolvedValueOnce(alert({ status: 'RESOLVED', resolvedAt: 3 }));
    await emergencyStore.loadCurrent();
    if (outcome === 'success') pending.resolve(alert());
    else pending.reject(new Error('Older refresh failed'));
    await older;
    expect(emergencyStore.status).toBe('CLOSED');
    expect(emergencyStore.alert?.status).toBe('RESOLVED');
    expect(emergencyStore.refreshError).toBe('');
  });

  it('does not let an in-flight poll reopen an alert after a confirmed cancellation', async () => {
    vi.spyOn(emergencyRepository, 'current').mockResolvedValueOnce(alert());
    await emergencyStore.loadCurrent();
    const pending = deferred<SosAlert>();
    vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(pending.promise);
    const poll = emergencyStore.loadCurrent();
    vi.spyOn(emergencyRepository, 'cancel').mockResolvedValueOnce(alert({ status: 'CANCELLED', cancelledAt: 2 }));
    await emergencyStore.cancelAlert();
    pending.resolve(alert());
    await poll;
    expect(emergencyStore.status).toBe('CLOSED');
    expect(emergencyStore.alert?.status).toBe('CANCELLED');
  });

  it('does not fetch or apply a refresh over a countdown or a send', async () => {
    const pending = deferred<SosAlert>();
    const current = vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(pending.promise);
    const poll = emergencyStore.loadCurrent();
    emergencyStore.triggerSos();
    await emergencyStore.loadCurrent();
    pending.resolve(alert());
    await poll;
    expect(emergencyStore.status).toBe('COUNTDOWN');
    expect(current).toHaveBeenCalledTimes(1);
    const sending = deferred<SosAlert>();
    vi.spyOn(emergencyRepository, 'raiseSos').mockReturnValueOnce(sending.promise);
    const send = emergencyStore.dispatchEmergency();
    await emergencyStore.loadCurrent();
    expect(emergencyStore.status).toBe('SENDING');
    expect(current).toHaveBeenCalledTimes(1);
    sending.resolve(alert());
    await send;
  });

  it('ignores a previous account refresh failure while the new account has an alert', async () => {
    const pending = deferred<SosAlert>();
    vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(pending.promise);
    const poll = emergencyStore.loadCurrent();
    setSessionAccount('account-b');
    vi.spyOn(emergencyRepository, 'current').mockResolvedValueOnce(alert({ id: 'b1' }));
    await emergencyStore.loadCurrent();
    pending.reject(new Error('Account A offline'));
    await poll;
    expect(emergencyStore.alert?.id).toBe('b1');
    expect(emergencyStore.refreshError).toBe('');
  });

  it('counts down three seconds and can be cancelled before anything is sent', () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos');
    emergencyStore.triggerSos();
    expect(emergencyStore.status).toBe('COUNTDOWN');
    vi.advanceTimersByTime(1000);
    expect(emergencyStore.countdownSeconds).toBe(2);
    emergencyStore.cancelCountdown();
    vi.advanceTimersByTime(5000);
    expect(emergencyStore.status).toBe('IDLE');
    expect(raise).not.toHaveBeenCalled();
  });

  it('never shows an alert the server did not record', async () => {
    vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(emergencyRepository, 'current').mockResolvedValueOnce(null);
    await emergencyStore.dispatchEmergency();
    expect(emergencyStore.status).toBe('UNCONFIRMED');
    expect(emergencyStore.alert).toBeNull();
    expect(emergencyStore.error).not.toBe('');
    expect(translate('en', emergencyStore.error as MessageKey)).toMatch(/112/);
  });

  it('reconciles a timeout after the alert was committed', async () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('timeout'));
    const current = vi.spyOn(emergencyRepository, 'current').mockResolvedValueOnce(alert());
    await emergencyStore.dispatchEmergency();
    expect(current).toHaveBeenCalledWith(raise.mock.calls[0]?.[1]);
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.error).toBe('');
  });

  it('retains uncertainty after an empty check, then finds a later commit', async () => {
    vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('timeout'));
    const current = vi.spyOn(emergencyRepository, 'current').mockResolvedValueOnce(null);
    await emergencyStore.dispatchEmergency();
    expect(emergencyStore.status).toBe('UNCONFIRMED');
    expect(emergencyStore.isEmergencyActive).toBe(true);
    emergencyStore.cancelCountdown();
    expect(emergencyStore.status).toBe('UNCONFIRMED');
    current.mockResolvedValueOnce(alert({ status: 'RESOLVED', resolvedAt: 3 }));
    await emergencyStore.loadCurrent();
    expect(emergencyStore.status).toBe('CLOSED');
    expect(emergencyStore.error).toBe('');
  });

  it('retries the same request and original location after a failed outcome check', async () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('timeout'));
    vi.spyOn(emergencyRepository, 'current').mockRejectedValueOnce(new Error('offline'));
    emergencyStore.setLocationNote('Original location');
    await emergencyStore.dispatchEmergency();
    emergencyStore.setLocationNote('Changed location');
    raise.mockResolvedValueOnce(alert({ status: 'CANCELLED', cancelledAt: 3 }));
    await emergencyStore.dispatchEmergency();
    expect(raise.mock.calls[1]).toEqual(raise.mock.calls[0]);
    expect(emergencyStore.status).toBe('CLOSED');
    emergencyStore.triggerSos();
    raise.mockResolvedValueOnce(alert({ id: 'new-alert' }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(raise.mock.calls[2]?.[1]).not.toBe(raise.mock.calls[0]?.[1]);
  });

  it('ignores an old outcome check during a same-request retry', async () => {
    const pending = deferred<SosAlert | null>();
    vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('timeout'));
    vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(pending.promise);
    const first = emergencyStore.dispatchEmergency();
    await Promise.resolve();
    vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert({ status: 'CANCELLED', cancelledAt: 3 }));
    await emergencyStore.dispatchEmergency();
    pending.resolve(alert());
    await first;
    expect(emergencyStore.status).toBe('CLOSED');
  });

  it('discards delayed reconciliation after account change and uses a fresh request', async () => {
    const pending = deferred<SosAlert | null>();
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('timeout'));
    const current = vi.spyOn(emergencyRepository, 'current').mockReturnValueOnce(pending.promise);
    const first = emergencyStore.dispatchEmergency();
    await Promise.resolve();
    setSessionAccount('account-b');
    raise.mockResolvedValueOnce(alert({ id: 'b1' }));
    await emergencyStore.dispatchEmergency();
    pending.resolve(alert());
    await first;
    expect(emergencyStore.alert?.id).toBe('b1');
    expect(raise.mock.calls[1]?.[1]).not.toBe(raise.mock.calls[0]?.[1]);
    expect(current).toHaveBeenCalledTimes(1);
  });

  it('creates a valid request ID on native without crypto and suppresses double submission', async () => {
    vi.stubGlobal('crypto', undefined);
    try {
      const pending = deferred<SosAlert>();
      const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockReturnValueOnce(pending.promise);
      const first = emergencyStore.dispatchEmergency();
      await emergencyStore.dispatchEmergency();
      expect(raise).toHaveBeenCalledTimes(1);
      expect(raise.mock.calls[0]?.[1]).toMatch(/^[A-Za-z0-9_-]+$/);
      pending.resolve(alert());
      await first;
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows exactly what the server recorded, and sends the location note', async () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
    emergencyStore.setLocationNote('Library, 2nd floor');
    await emergencyStore.dispatchEmergency();
    expect(raise).toHaveBeenCalledWith('Library, 2nd floor', expect.any(String));
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.alert?.deliveries).toHaveLength(1);
  });

  it('only shows the alert closed once the server confirms the cancel', async () => {
    vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
    await emergencyStore.dispatchEmergency();
    vi.spyOn(emergencyRepository, 'cancel').mockRejectedValueOnce(new Error('offline'));
    await emergencyStore.cancelAlert();
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.error).not.toBe('');
    expect(translate('en', emergencyStore.error as MessageKey)).toMatch(/112/);
    vi.spyOn(emergencyRepository, 'cancel').mockResolvedValueOnce(alert({ status: 'CANCELLED', cancelledAt: 2 }));
    await emergencyStore.cancelAlert();
    expect(emergencyStore.status).toBe('CLOSED');
  });

  it('treats an alert as reaching someone only if a delivery was actually sent', () => {
    expect(anyoneReached(alert())).toBe(true);
    expect(anyoneReached(alert({ deliveries: [{ recipientKind: 'CAMPUS_SECURITY', channel: 'WHATSAPP', recipient: 'Gate', status: 'FAILED', detail: '' }] }))).toBe(false);
    expect(anyoneReached(alert({ deliveries: [{ recipientKind: 'CAMPUS_SECURITY', channel: 'WHATSAPP', recipient: 'Gate', status: 'UNKNOWN', detail: '' }] }))).toBe(false);
  });

  it('clears account-owned alert, location and error on logout without cancelling the server alert', async () => {
    vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
    const cancel = vi.spyOn(emergencyRepository, 'cancel').mockRejectedValueOnce(new Error('offline'));
    emergencyStore.setLocationNote('Account A location');
    await emergencyStore.dispatchEmergency();
    await emergencyStore.cancelAlert();
    expect(emergencyStore.error).toBe('sos.cancelFailed');

    invalidateSessionScope();
    expectCleared();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it.each(pendingOperations)('discards a delayed %s response after logout', async (operation) => {
    const pending = deferred<SosAlert>();
    emergencyStore.setLocationNote('Account A location');
    const { request } = await startPendingOperation(operation, pending.promise);

    invalidateSessionScope();
    expectCleared();
    pending.resolve(alert({ status: 'CANCELLED', cancelledAt: 2 }));
    await request;
    expectCleared();
  });

  it.each(['account-b', 'account-a'])('cannot restore an old current alert when %s signs in after logout', async (accountId) => {
    const pending = deferred<SosAlert>();
    const { request } = await startPendingOperation('current', pending.promise);

    invalidateSessionScope();
    setSessionAccount(accountId);
    emergencyStore.setLocationNote('Current account location');
    pending.resolve(alert());
    await request;

    expect(emergencyStore.status).toBe('IDLE');
    expect(emergencyStore.alert).toBeNull();
    expect(emergencyStore.locationNote).toBe('Current account location');
  });

  it.each(['raise', 'cancel'] as const)('ignores a stale %s success while account B has a new alert', async (operation) => {
    const pending = deferred<SosAlert>();
    const { request } = await startPendingOperation(operation, pending.promise);

    setSessionAccount('account-b');
    emergencyStore.setLocationNote('Account B location');
    vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert({ id: 'b1' }));
    await emergencyStore.dispatchEmergency();
    pending.resolve(alert({ status: 'CANCELLED', cancelledAt: 2 }));
    await request;

    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.alert?.id).toBe('b1');
    expect(emergencyStore.locationNote).toBe('Account B location');
    expect(emergencyStore.error).toBe('');
  });

  it.each(['raise', 'cancel'] as const)('ignores a stale %s failure while account B has a new alert', async (operation) => {
    const pending = deferred<SosAlert>();
    const { request } = await startPendingOperation(operation, pending.promise);

    setSessionAccount('account-b');
    vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert({ id: 'b1' }));
    await emergencyStore.dispatchEmergency();
    pending.reject(new Error('Account A request failed'));
    await request;

    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.alert?.id).toBe('b1');
    expect(emergencyStore.error).toBe('');
  });

  it.each([null, 'account-b'])('stops an account A countdown when the account changes to %s', async (accountId) => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValue(alert());
    emergencyStore.setLocationNote('Account A location');
    emergencyStore.triggerSos();
    vi.advanceTimersByTime(1000);

    setSessionAccount(accountId);
    expectCleared();
    await vi.advanceTimersByTimeAsync(5000);
    expect(raise).not.toHaveBeenCalled();
    expectCleared();
  });

  it('preserves the same account countdown and recorded alert when its session refreshes', async () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
    emergencyStore.setLocationNote('Account A location');
    emergencyStore.triggerSos();
    vi.advanceTimersByTime(1000);

    setSessionAccount('account-a');
    expect(emergencyStore.status).toBe('COUNTDOWN');
    expect(emergencyStore.countdownSeconds).toBe(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(raise).toHaveBeenCalledTimes(1);
    expect(raise).toHaveBeenCalledWith('Account A location', expect.any(String));

    setSessionAccount('account-a');
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.alert?.id).toBe('a1');
    expect(emergencyStore.locationNote).toBe('Account A location');
  });

  it.each(pendingOperations)('discards a delayed %s response after a local reset in the same account', async (operation) => {
    const pending = deferred<SosAlert>();
    const { request } = await startPendingOperation(operation, pending.promise);

    emergencyStore.reset();
    pending.resolve(alert({ status: 'CANCELLED', cancelledAt: 2 }));
    await request;
    expectCleared();
  });

  it('does not send or fetch an SOS without an authenticated account scope', async () => {
    const current = vi.spyOn(emergencyRepository, 'current');
    const raise = vi.spyOn(emergencyRepository, 'raiseSos');
    const cancel = vi.spyOn(emergencyRepository, 'cancel');
    invalidateSessionScope();

    emergencyStore.triggerSos();
    await emergencyStore.loadCurrent();
    await emergencyStore.dispatchEmergency();
    await emergencyStore.cancelAlert();
    await vi.advanceTimersByTimeAsync(5000);

    expect(current).not.toHaveBeenCalled();
    expect(raise).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expectCleared();
  });
});
