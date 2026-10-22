import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const apiRequest = vi.fn(async (_path: string, _init?: RequestInit) => ({ user: null, csrfToken: '' }));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { AuthViewModel } from '../AuthViewModel';
import { SIGNUP_CONSENT_VERSION, SIGNUP_PURPOSES, SignupConsentState } from '../signupConsent';
import { SignupConsent } from '../../views/SignupConsent';

beforeEach(() => apiRequest.mockClear());

describe('DPDP consent at signup', () => {
  it('sends nothing to the server until every required item is ticked', async () => {
    const vm = new AuthViewModel('signup', null);
    vm.consent.toggle('RECORDS_STORAGE');
    vm.consent.toggle('CAMPUS_ENROLMENT');
    await vm.completeSignup(() => undefined);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(vm.error).toMatch(/three required items/);
  });

  it('sends the version, every required purpose and the reading language', async () => {
    const vm = new AuthViewModel('signup', null);
    SIGNUP_PURPOSES.forEach((purpose) => vm.consent.toggle(purpose));
    vm.setNewPassword('Tamarind-river 42');
    vm.setPasswordAgain('Tamarind-river 42');
    vm.setConsentLanguage('te');
    await vm.completeSignup(() => undefined);
    const [path, init] = apiRequest.mock.calls[0];
    expect(path).toBe('/auth/signup');
    expect(JSON.parse(String(init?.body)).consent).toEqual({ version: SIGNUP_CONSENT_VERSION, purposes: [...SIGNUP_PURPOSES], language: 'te' });
  });

  it('starts with nothing ticked, and ticking is the student’s own act', () => {
    const consent = new SignupConsentState();
    render(<SignupConsent consent={consent} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    boxes.forEach((box) => expect((box as HTMLInputElement).checked).toBe(false));
    fireEvent.click(screen.getByRole('checkbox', { name: /I am 18 or older/ }));
    expect(consent.agreed.ADULT_18_PLUS).toBe(true);
    expect(consent.complete).toBe(false);
  });

  it('shows no guardian route and names no grievance officer', () => {
    render(<SignupConsent consent={new SignupConsentState()} />);
    expect(screen.queryByText(/parent or guardian/i)).toBeNull();
    expect(screen.queryByText(/grievance@/i)).toBeNull();
    expect(screen.getByRole('link', { name: 'Read the privacy notice' }).getAttribute('href')).toBe('/privacy');
  });
});
