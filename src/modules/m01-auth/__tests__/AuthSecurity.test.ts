import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authStore } from '../state/AuthStore';
import { authRepository } from '../data/AuthRepository';

describe('M01 Auth Security Guardrails (Fail Closed & No Auth Fallback)', () => {
  beforeEach(() => {
    authStore.reset();
  });

  it('initializes with null currentUser and idle status', () => {
    expect(authStore.currentUser).toBeNull();
    expect(authStore.status.kind).toBe('idle');
  });

  it('does NOT produce an authenticated session when verification fails', async () => {
    vi.spyOn(authRepository, 'verifyCode').mockRejectedValueOnce(new Error('Invalid OTP code'));

    authStore.setCode('000000');
    const response = await authStore.verify();

    expect(response).toBeNull();
    expect(authStore.currentUser).toBeNull();
    expect(authStore.status.kind).toBe('error');
    expect(authStore.errorMessage).toBe('Invalid OTP code');
  });

  it('does NOT produce an authenticated session on network failure during signup', async () => {
    vi.spyOn(authRepository, 'completeSignup').mockRejectedValueOnce(new Error('Network error'));

    const response = await authStore.completeSignup();

    expect(response).toBeNull();
    expect(authStore.currentUser).toBeNull();
    expect(authStore.status.kind).toBe('error');
    expect(authStore.errorMessage).toBe('Network error');
  });
});
