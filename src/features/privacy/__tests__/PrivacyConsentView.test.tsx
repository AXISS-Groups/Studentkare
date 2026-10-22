import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { navigate } from '@/lib/utils/workflowRouting';
import { PrivacyConsentView } from '../PrivacyConsentView';
import type { ConsentOverview } from '../privacyRepository';

vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

const SIGNED_UP = 1_760_000_000;

function overview(ayushOn: boolean, withdrawnAt: number | null = null): ConsentOverview {
  return {
    required: { purposes: ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'], version: 'signup-2026-10-16b', language: 'en', givenAt: SIGNED_UP, noticeVersion: 'unpublished', termsVersion: '2026-11-01' },
    optional: [
      { purpose: 'AYUSH_HISTORY', on: ayushOn, canGiveHere: true, version: ayushOn ? 'optional-2026-10-23' : null, givenAt: ayushOn ? SIGNED_UP : null, withdrawnAt },
      { purpose: 'BLOOD_DONOR_CONTACT', on: false, canGiveHere: false, version: null, givenAt: null, withdrawnAt: null },
      { purpose: 'PICKUP_LOCATION', on: false, canGiveHere: true, version: null, givenAt: null, withdrawnAt: null },
      { purpose: 'PREVENTIVE_OFFERS', on: false, canGiveHere: true, version: null, givenAt: null, withdrawnAt: null },
      { purpose: 'SEASONAL_EDUCATION', on: false, canGiveHere: true, version: null, givenAt: null, withdrawnAt: null },
    ],
    history: [{ purposes: ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'], version: 'signup-2026-10-16b', givenAt: SIGNED_UP, withdrawnAt: null }],
  };
}

beforeEach(() => vi.mocked(navigate).mockClear());

describe('Privacy & consent (audit H2)', () => {
  it('lists the sign-up consents with wording, notice versions and how to withdraw them', async () => {
    const repo = { consents: vi.fn().mockResolvedValue(overview(false)), change: vi.fn() };
    const { container } = render(<PrivacyConsentView repository={repo} />);
    expect(await screen.findByText('Needed for your account')).toBeTruthy();
    expect(screen.getAllByText(/wording signup-2026-10-16b/)).toHaveLength(3);
    expect(screen.getByText('Privacy notice: not published yet when you signed up')).toBeTruthy();
    expect(screen.getByText('Terms shown: version 2026-11-01')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/ }));
    expect(navigate).toHaveBeenCalledWith('delete-account');
    // Required ones have no switch; every optional one that can be given here has one, off.
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(4);
    expect(switches.every((item) => item.getAttribute('aria-checked') === 'false')).toBe(true);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('withdraws an optional consent as easily as it was given', async () => {
    const change = vi.fn().mockResolvedValue(overview(false, SIGNED_UP + 60));
    const repo = { consents: vi.fn().mockResolvedValue(overview(true)), change };
    render(<PrivacyConsentView repository={repo} />);
    const ayush = await screen.findByRole('switch', { name: /Keep my Ayush chats On/ });
    expect(ayush.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(ayush);
    expect(change).toHaveBeenCalledWith('AYUSH_HISTORY', false, 'en');
    await waitFor(() => expect(screen.getByRole('switch', { name: /Keep my Ayush chats Off/ }).getAttribute('aria-checked')).toBe('false'));
    expect(screen.getByText(/^Turned off/)).toBeTruthy();
  });

  it('keeps the switch as it was and says so when the change fails', async () => {
    const repo = { consents: vi.fn().mockResolvedValue(overview(true)), change: vi.fn().mockRejectedValue(new Error('500')) };
    render(<PrivacyConsentView repository={repo} />);
    fireEvent.click(await screen.findByRole('switch', { name: /Keep my Ayush chats/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('switch', { name: /Keep my Ayush chats/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('sends a donor to register before giving donor contact', async () => {
    const repo = { consents: vi.fn().mockResolvedValue(overview(false)), change: vi.fn() };
    render(<PrivacyConsentView repository={repo} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Register as a donor first' }));
    expect(navigate).toHaveBeenCalledWith('lifeshare');
  });

  it('shows a calm error with a retry when the consents cannot load', async () => {
    const consents = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(overview(false));
    render(<PrivacyConsentView repository={{ consents, change: vi.fn() }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Needed for your account')).toBeTruthy();
  });
});
