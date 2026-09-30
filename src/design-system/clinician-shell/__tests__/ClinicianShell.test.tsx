import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ClinicianShell } from '../ClinicianShell';

function renderShell(overrides: Partial<React.ComponentProps<typeof ClinicianShell>> = {}) {
  const props = {
    current: 'today' as const,
    clinician: { fullName: 'Dr. Sameer Menon', initials: 'SM' },
    context: 'Thursday, 24 September',
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    onPersonalHealth: vi.fn(),
    ...overrides,
  };
  render(<ClinicianShell {...props}><p>page</p></ClinicianShell>);
  return props;
}

describe('ClinicianShell', () => {
  it('marks the current page and navigates from built items', () => {
    const props = renderShell();
    const nav = screen.getByRole('navigation', { name: 'Clinician' });
    expect(within(nav).getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(nav).getByRole('button', { name: 'Earnings' }));
    expect(props.onNavigate).toHaveBeenCalledWith('earnings');
  });

  it('shows unbuilt screens as unavailable and does not navigate', () => {
    const props = renderShell();
    const schedule = screen.getByRole('button', { name: /Schedule — not available yet/ });
    expect(schedule).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(schedule);
    expect(props.onNavigate).not.toHaveBeenCalled();
  });

  it('shows count badges only for counts above zero, with a spoken count', () => {
    renderShell({ counts: { inbox: 9, 'report-reviews': 0 } });
    expect(screen.getByRole('button', { name: /Inbox.*9 waiting/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report reviews' })).toBeInTheDocument();
  });

  it('never claims 2FA or credentials it was not given', () => {
    renderShell();
    expect(screen.queryByText('2FA on')).not.toBeInTheDocument();
    expect(screen.queryByText(/NMC/)).not.toBeInTheDocument();
    renderShell({ twoFactorOn: true, clinician: { fullName: 'Dr. Sameer Menon', initials: 'SM', credentials: 'MBBS, MD · NMC 71842' } });
    expect(screen.getByText('2FA on')).toBeInTheDocument();
  });

  it('signs out from the account menu', () => {
    const props = renderShell();
    const chip = screen.getByRole('button', { name: /account menu/ });
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(props.onSignOut).toHaveBeenCalled();
  });

  it('opens the navigation drawer as a modal and closes it with Escape, returning focus', () => {
    renderShell();
    const open = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(open);
    expect(screen.getByRole('dialog', { name: 'Clinician workspace' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
  });
});
