import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MemberIdentity } from '@/data/workflowTypes';

const state: { data: MemberIdentity | null } = { data: null };
vi.mock('@/hooks/useApiResource', () => ({
  useApiResource: () => ({ data: state.data, loading: false, error: '', reload: vi.fn() }),
}));
vi.mock('@/lib/workflowRouting', () => ({ navigate: vi.fn() }));

import { WebPass } from '../WebPass';

const identity = (over: Partial<MemberIdentity> = {}): MemberIdentity => ({
  memberId: 'SK-1', fullName: 'Test Student', university: 'Test University', rollNumber: 'R-1',
  campusStatus: 'PENDING', issued: true, issuedAt: 1, code: 'SACARE-ID:x.y', qrSvg: '<svg xmlns="http://www.w3.org/2000/svg"/>', ...over,
});

describe('My check-in pass', () => {
  it('shows the server-issued QR and the real campus status', () => {
    state.data = identity();
    render(<WebPass />);
    expect(screen.getByText('Test Student')).toBeInTheDocument();
    expect(screen.getByText('Campus review pending')).toBeInTheDocument();
    expect(screen.getByAltText('Your member verification QR code')).toBeInTheDocument();
  });

  it('lists no check-ins, because none are recorded by the backend', () => {
    state.data = identity();
    render(<WebPass />);
    expect(screen.getByText(/No check-ins recorded/)).toBeInTheDocument();
    for (const fabricated of [/MedPlus/, /Vijaya Diagnostics/, /Photo matched/, /Identity verified · 4 of 4/, /This wasn’t me/]) {
      expect(screen.queryByText(fabricated)).toBeNull();
    }
  });

  it('offers to create a Digital ID instead of drawing a QR when none is issued', () => {
    state.data = identity({ issued: false, issuedAt: null, code: undefined, qrSvg: undefined });
    render(<WebPass />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create my Digital ID' })).toBeInTheDocument();
  });
});
