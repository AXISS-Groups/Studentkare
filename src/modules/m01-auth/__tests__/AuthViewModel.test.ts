import { describe, it, expect, beforeEach } from 'vitest';
import { authStore } from '../state/AuthStore';

describe('M01 Auth Module Characterisation Tests', () => {
  beforeEach(() => {
    authStore.reset();
  });

  it('initializes in login mode at step 1', () => {
    expect(authStore.mode).toBe('login');
    expect(authStore.step).toBe(1);
    expect(authStore.isLogin).toBe(true);
    expect(authStore.currentUser).toBeNull();
  });

  it('formats OTP code strictly to 6 digits', () => {
    authStore.setCode('12345678');
    expect(authStore.code).toBe('123456');

    authStore.setCode('abc123xyz');
    expect(authStore.code).toBe('123');
  });

  it('channel selection resets identifier field', () => {
    authStore.setIdentifier('9876543210');
    expect(authStore.identifier).toBe('9876543210');

    authStore.setChannel('EMAIL');
    expect(authStore.channel).toBe('EMAIL');
    expect(authStore.identifier).toBe('');
  });

  it('mode switching correctly updates isLogin computed', () => {
    authStore.setMode('signup');
    expect(authStore.mode).toBe('signup');
    expect(authStore.isLogin).toBe(false);
  });
});
