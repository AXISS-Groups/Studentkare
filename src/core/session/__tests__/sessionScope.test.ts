import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureSessionScope, invalidateSessionScope, isCurrentSessionScope, setSessionAccount, subscribeSessionScope } from '../sessionScope';

afterEach(() => invalidateSessionScope());

describe('authenticated feature ownership', () => {
  it('rejects anonymous work and previous-account results', () => {
    invalidateSessionScope();
    expect(isCurrentSessionScope(captureSessionScope())).toBe(false);
    setSessionAccount('account-a');
    const accountA = captureSessionScope();
    setSessionAccount('account-b');
    expect(isCurrentSessionScope(accountA)).toBe(false);
    expect(isCurrentSessionScope(captureSessionScope())).toBe(true);
  });

  it('preserves the same owner during a successful refresh', () => {
    setSessionAccount('account-a');
    const beforeRefresh = captureSessionScope();
    setSessionAccount('account-a');
    expect(isCurrentSessionScope(beforeRefresh)).toBe(true);
  });

  it('does not revive old work when the same account signs in again', () => {
    setSessionAccount('account-a');
    const previousLogin = captureSessionScope();
    invalidateSessionScope();
    setSessionAccount('account-a');
    expect(isCurrentSessionScope(previousLogin)).toBe(false);
  });

  it('clears listeners synchronously and supports removing a subscription', () => {
    setSessionAccount('account-a');
    const clear = vi.fn(() => expect(captureSessionScope().accountId).toBeNull());
    const unsubscribe = subscribeSessionScope(clear);
    invalidateSessionScope();
    expect(clear).toHaveBeenCalledOnce();
    unsubscribe();
    invalidateSessionScope();
    expect(clear).toHaveBeenCalledOnce();
  });
});
