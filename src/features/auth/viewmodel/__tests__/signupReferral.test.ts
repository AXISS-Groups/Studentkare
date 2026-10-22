import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequest = vi.fn(async (_path: string, _init?: RequestInit) => ({ user: null, csrfToken: '' }));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { AuthViewModel } from '../AuthViewModel';
import { SIGNUP_PURPOSES } from '../signupConsent';

beforeEach(() => apiRequest.mockClear());

async function signupBody(ref: string | null): Promise<Record<string, unknown>> {
  const vm = new AuthViewModel('signup', null);
  SIGNUP_PURPOSES.forEach((purpose) => vm.consent.toggle(purpose));
  vm.setNewPassword('Tamarind-river 42');
  vm.setPasswordAgain('Tamarind-river 42');
  vm.setReferralCode(ref);
  await vm.completeSignup(() => undefined);
  return JSON.parse(String(apiRequest.mock.calls[0][1]?.body)) as Record<string, unknown>;
}

describe('invite code at signup', () => {
  it('sends the code from the ?ref= link, normalised', async () => {
    expect((await signupBody('abcd-2345')).referralCode).toBe('ABCD2345');
  });

  it('sends nothing for a missing or malformed code', async () => {
    expect(await signupBody(null)).not.toHaveProperty('referralCode');
    apiRequest.mockClear();
    expect(await signupBody('<script>')).not.toHaveProperty('referralCode');
    apiRequest.mockClear();
    expect(await signupBody('ABCD0O1I')).not.toHaveProperty('referralCode');
  });
});
