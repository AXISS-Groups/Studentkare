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
    const checkIn = screen.getByRole('button', { name: /Check in patient.*Not available yet/ });
    expect(checkIn).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(checkIn);
    expect(props.onNavigate).not.toHaveBeenCalled();
  });

  it('shows count badges only for counts above zero, with a spoken count', () => {
    renderShell({ counts: { inbox: 9, 'report-reviews': 0 } });
    expect(screen.getByRole('button', { name: /Inbox.*9 waiting/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inbox/ }).querySelector('.sk-console-nav__badge')).toHaveTextContent('9');
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
    fireEvent.click(within(chip.parentElement as HTMLElement).getByRole('button', { name: 'Sign out' }));
    expect(props.onSignOut).toHaveBeenCalled();
  });

  it('signs out from the sidebar footer, like the Super Admin sidebar', () => {
    const props = renderShell();
    fireEvent.click(within(screen.getByRole('complementary', { name: 'Clinician workspace' })).getByRole('button', { name: 'Sign out' }));
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
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

  it('draws every nav icon from the manifest, as named in the ClinicianConsole brief', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Clinician' });
    const icons = Array.from(nav.querySelectorAll('svg')).map((icon) => icon.getAttribute('data-icon'));
    expect(icons).toEqual([
      'clock', 'scan', 'inbox', 'align-left', 'video-2', 'flask', 'file', 'heart-pulse', 'doc', 'prescription',
      'flask', 'arrow-up-right', 'repeat',
      'users', 'heart', 'leaf', 'sparkle',
      'calendar-2', 'banknote',
    ]);
    nav.querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });

  it('follows the canvas groups and order', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Clinician' });
    expect(within(nav).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Clinical', 'Orders', 'Patients', 'Practice']);
    expect(within(nav).getAllByRole('group')).toHaveLength(4);
  });

  it('shows the brand mark and the help link with the clinician’s name', () => {
    const props = renderShell({ clinician: { fullName: 'Dr. Sameer Menon', initials: 'SM', credentials: 'MBBS, MD · NMC 71842' } });
    const sidebar = screen.getByRole('complementary', { name: 'Clinician workspace' });
    expect(sidebar.querySelector('[data-icon="brand:studentkare-logo"]')).not.toBeNull();
    expect(within(sidebar).getByText('CLINICIAN')).toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('button', { name: /Dr. Sameer Menon · NMC 71842.*help centre/ }));
    expect(props.onNavigate).toHaveBeenCalledWith('support');
  });
});
