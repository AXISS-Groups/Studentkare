import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceScreen } from '../WorkspaceScreen';

vi.mock('@/data/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/data/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/core/navigation', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/handover' }),
}));

vi.mock('@/lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn(() => 'vendor'),
  canAccessRoute: vi.fn(() => true),
}));

describe('WorkspaceScreen vendor routing', () => {
  it('renders VendorHandoverScreen when route is handover even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="handover" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'OTP handover' })).toBeInTheDocument();
  });

  it('renders VendorSubstitutionScreen when route is substitutions even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="substitutions" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Substitutions' })).toBeInTheDocument();
  });

  it('renders VendorReorderScreen when route is reorder even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="reorder" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Reorder rules' })).toBeInTheDocument();
  });

  it('renders VendorCampIntakeScreen when route is camp-intake even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="camp-intake" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp intake' })).toBeInTheDocument();
  });

  it('renders VendorConsoleScreen when route is console or performance even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="console" />);
    // Signed out, the queue can't be read: the page says so rather than showing sample orders.
    expect(await screen.findByRole('heading', { level: 1, name: /fulfilment queue/i })).toBeInTheDocument();
  });

  it('renders VendorSettlementScreen when route is settlement even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="settlement" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Earnings & settlement' })).toBeInTheDocument();
  });

  it('renders VendorRxReviewScreen when route is rx-review even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="rx-review" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Rx review' })).toBeInTheDocument();
  });

  it('renders PartnerStaffScreen when route is partner-staff even with unauthenticated session', async () => {
    render(<WorkspaceScreen route="partner-staff" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Staff & roles' })).toBeInTheDocument();
  });
});
