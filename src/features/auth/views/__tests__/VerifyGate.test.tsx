import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MemberIdentity } from '@/data/types/workflowTypes';

// Verification gate (VerifyGate / WebVerifyGate, Tier 1). Crisis help, SOS, the
// emergency card and help render before /identity answers and when it fails; the
// rows say what the server says; Not now always closes.

let identityAnswer: () => Promise<unknown> = () => new Promise(() => undefined);
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string) => (path === '/identity' ? identityAnswer() : Promise.resolve({})),
}));
const go = vi.fn();
vi.mock('@/core/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/navigation')>()),
  useNavigate: () => go,
}));

import { VerifyGateView } from '../VerifyGateView';

const identity = (campusStatus: MemberIdentity['campusStatus']): MemberIdentity => ({
  memberId: 'SK-1', fullName: 'Test Student', university: 'U', rollNumber: 'R1', campusStatus, issued: false, issuedAt: null,
});

function at(width: 'phone' | 'web') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => { go.mockClear(); identityAnswer = () => new Promise(() => undefined); });
afterEach(() => vi.unstubAllGlobals());

describe.each(['phone', 'web'] as const)('Verification gate (%s)', (width) => {
  beforeEach(() => at(width));

  it('is a labelled modal with the brief’s 3D shield', () => {
    const { container } = render(<VerifyGateView />);
    const dialog = screen.getByRole('dialog', { name: 'Finish verifying to book' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(container.querySelector('[data-icon="3d:shield--p5"]')).not.toBeNull();
  });

  it('keeps every always-open link reachable while /identity is still loading', () => {
    render(<VerifyGateView />);
    const always = screen.getByTestId('gate-always-open');
    for (const [name, to] of [['Crisis support', '/crisis'], ['SOS', '/sos'], ['Emergency card', '/emergency-card'], ['Help', '/support']] as const) {
      fireEvent.click(within(always).getByRole('link', { name }));
      expect(go).toHaveBeenLastCalledWith(to);
    }
  });

  it('lets the keyboard reach every always-open link, and keeps Tab inside the dialog', () => {
    render(<VerifyGateView />);
    const links = within(screen.getByTestId('gate-always-open')).getAllByRole('link');
    links.forEach((link) => expect(link.tabIndex).toBeGreaterThanOrEqual(0));
    const dialog = screen.getByRole('dialog');
    const last = screen.getByTestId(width === 'phone' ? 'gate-not-now' : 'gate-always-help');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('keeps them when /identity fails, and marks nothing done', async () => {
    identityAnswer = async () => { throw new Error('offline'); };
    render(<VerifyGateView />);
    expect(await screen.findByText(/couldn’t check your verification/)).toBeInTheDocument();
    expect(within(screen.getByTestId('gate-always-open')).getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByTestId('gate-campus-done')).toBeNull();
  });

  it('shows the rows the server reports', async () => {
    identityAnswer = async () => identity('PENDING');
    const { container } = render(<VerifyGateView />);
    const campus = await screen.findByTestId('gate-campus');
    expect(within(campus).getByText('In review')).toBeInTheDocument();
    expect(within(screen.getByTestId('gate-photo')).getByText('Not available yet')).toBeInTheDocument();
    for (const icon of ['user-2', 'mail', 'id-card', 'shield']) expect(container.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
    expect(screen.queryByTestId('gate-campus-done')).toBeNull();
  });

  it('marks campus done only from the server', async () => {
    identityAnswer = async () => identity('VERIFIED');
    const { container } = render(<VerifyGateView />);
    expect(await screen.findByTestId('gate-campus-done')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="check"]')).not.toBeNull();
  });

  it('is never a dead end: Not now and Esc close it, Finish goes to verification', () => {
    const onClose = vi.fn();
    render(<VerifyGateView onClose={onClose} />);
    fireEvent.click(screen.getByTestId('gate-not-now'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('gate-finish'));
    expect(go).toHaveBeenLastCalledWith('/verify');
  });
});
