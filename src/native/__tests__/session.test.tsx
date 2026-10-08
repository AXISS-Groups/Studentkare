import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeSessionProvider, isSignedInSession, useNativeSession } from '../session';
import { destinationsFor } from '../homeDestinations';
import * as http from '@/data/services/http';
import type { Account } from '@/data/types/workflowTypes';

const student: Account = {
  id: 'a1', fullName: 'Asha Rao', role: 'STUDENT', email: 'a@b.edu', phone: '', dob: '', university: '',
  rollNumber: '', bloodGroup: '', ageVerified: true, isVerifiedStudent: false,
};

function Probe() {
  const { status } = useNativeSession();
  return <span data-testid="status">{status}</span>;
}

afterEach(() => vi.restoreAllMocks());

describe('isSignedInSession', () => {
  it('accepts only a complete user with a known role and a CSRF token', () => {
    expect(isSignedInSession({ user: student, csrfToken: 't' })).toBe(true);
    expect(isSignedInSession({ user: student, csrfToken: '' })).toBe(false);
    expect(isSignedInSession({ user: null, csrfToken: 't' })).toBe(false);
    expect(isSignedInSession({ user: { ...student, id: '' }, csrfToken: 't' })).toBe(false);
    expect(isSignedInSession(null)).toBe(false);
  });
});

describe('NativeSessionProvider fails closed', () => {
  it('is signed out when the server cannot be reached', async () => {
    vi.spyOn(http, 'apiRequest').mockRejectedValue(new Error('offline'));
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
  });

  it('is signed out on a malformed session', async () => {
    vi.spyOn(http, 'apiRequest').mockResolvedValue({ user: { ...student, role: 'ROOT' }, csrfToken: 't' });
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
  });

  it('is signed in only on a well-formed session', async () => {
    vi.spyOn(http, 'apiRequest').mockResolvedValue({ user: student, csrfToken: 't' });
    render(<NativeSessionProvider><Probe /></NativeSessionProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
  });
});

describe('home destinations', () => {
  it('gives the clinician console to doctors only, and staff consoles stay on the web', () => {
    expect(destinationsFor('STUDENT').map((d) => d.route)).not.toContain('ClinicianConsole');
    expect(destinationsFor('NMC_DOCTOR').map((d) => d.route)).toContain('ClinicianConsole');
    expect(destinationsFor('SUPER_ADMIN')).toHaveLength(0);
    expect(destinationsFor('VENDOR')).toHaveLength(0);
  });
});
