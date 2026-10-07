import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SuperAdminShell } from '../admin/SuperAdminShell';
import { SUPER_ADMIN_NAVIGATION } from '../admin/superAdminNavigation';

const onNavigate = vi.fn();
const onSignOut = vi.fn();
const theme = { mode: 'light' as 'light' | 'dark', setTheme: vi.fn() };
vi.mock('../../../theme/theme', () => ({ useTheme: () => theme }));

const renderShell = (props: Partial<React.ComponentProps<typeof SuperAdminShell>> = {}) => render(
  <SuperAdminShell route="admin" role="SUPER_ADMIN" onNavigate={onNavigate} onSignOut={onSignOut} signingOut={false} signOutError="" {...props}>
    <p>Page content</p>
  </SuperAdminShell>,
);

const nav = () => screen.getByRole('navigation', { name: 'Super admin navigation' });

beforeEach(() => { onNavigate.mockReset(); onSignOut.mockReset(); theme.mode = 'light'; theme.setTheme.mockReset(); });

describe('alerts and SOS', () => {
  it('opens the real activity feed from Alerts, not the demo notification centre', () => {
    renderShell();
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Alerts' }));
    expect(onNavigate).toHaveBeenCalledWith('admin/activity');
    expect(screen.queryByText(/blood sos alert|care points/i)).toBeNull();
  });

  it.each([
    ['admin/activity', 'Operations & SOS'],
    ['admin/support', 'Operations & SOS'],
    ['admin/requests', 'Operations & SOS'],
    ['admin/billing', 'Organisations'],
    ['admin/preventive', 'Partner applications'],
    ['admin/telemetry', 'Integrations'],
    ['admin/api-keys', 'Integrations'],
    ['admin/case', 'Check-in audit'],
    ['admin/price-fix', 'Plans & pricing'],
  ] as const)('highlights the parent entry for the %s tab', (route, parent) => {
    renderShell({ route });
    const current = within(nav()).getAllByRole('button').filter(button => button.getAttribute('aria-current') === 'page');
    expect(current.map(button => button.textContent)).toEqual([parent]);
  });

  it('opens the emergency helplines from SOS, with real numbers to call', () => {
    // jsdom has no <dialog>.showModal(); the dialog's content is what is under test.
    const dialog = HTMLDialogElement.prototype as { showModal?: () => void; close?: () => void };
    dialog.showModal ??= vi.fn();
    dialog.close ??= vi.fn();
    renderShell();
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'SOS' }));
    expect(screen.getByText('24x7 Emergency Helplines')).toBeInTheDocument();
    // Without a real showModal the dialog never gets `open`, so its content counts as hidden.
    expect(screen.getByRole('link', { name: /call national emergency response/i, hidden: true })).toHaveAttribute('href', 'tel:112');
  });
});

describe('theme toggle', () => {
  it('sits at the top of the page, not in the sidebar, and turns dark mode on', () => {
    renderShell();
    const toggle = within(screen.getByRole('main')).getByRole('button', { name: 'Dark mode' });
    expect(within(document.getElementById('sk-admin-sidebar') as HTMLElement).queryByRole('button', { name: 'Dark mode' })).toBeNull();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(toggle);
    expect(theme.setTheme).toHaveBeenCalledWith('dark');
  });

  it('shows as on in dark mode and turns it off', () => {
    theme.mode = 'dark';
    renderShell();
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(theme.setTheme).toHaveBeenCalledWith('light');
  });
});

describe('navigation structure', () => {
  it('follows the design’s groups and order exactly, with nothing extra', () => {
    expect(SUPER_ADMIN_NAVIGATION.map(group => group.title)).toEqual(['Platform', 'Tenants', 'Gatekeeping', 'Commerce', 'Content & AI', 'Governance']);
    const designed = SUPER_ADMIN_NAVIGATION.flatMap(group => group.items.map(item => item.label));
    expect(designed).toEqual([
      'Overview', 'Operations & SOS', 'Surveillance map', 'Feature flags', 'Accounts',
      'Organisations', 'Integrations', 'Code sentinel', 'Token sync',
      'Clinician verification', 'Partner applications', 'Catalogue ops',
      'Plans & pricing', 'Billing ledger',
      'Message templates', 'Knowledge base', 'Intake & OCR',
      'Rule L firewall', 'Consent policy', 'Break-glass log', 'Check-in audit', 'Casualty handover', 'Audit explorer', 'AI governance', 'Erasure queue',
    ]);
  });

  it('gives every designed entry its own screen', () => {
    SUPER_ADMIN_NAVIGATION.forEach(group => group.items.forEach(item => expect(item.route, item.label).toBeDefined()));
    const routes = SUPER_ADMIN_NAVIGATION.flatMap(group => group.items.flatMap(item => item.route ? [item.route] : []));
    expect(new Set(routes).size).toBe(25);
    // Removed from the sidebar on request; the routes still exist.
    ['admin/activity', 'admin/billing', 'admin/requests', 'admin/support', 'admin/telemetry', 'admin/preventive'].forEach(route => expect(routes).not.toContain(route));
  });

  it('renders every group heading', () => {
    renderShell();
    SUPER_ADMIN_NAVIGATION.forEach(group => expect(within(nav()).getByRole('heading', { name: group.title })).toBeInTheDocument());
  });
});

describe('available entries', () => {
  it('marks the current page', () => {
    renderShell({ route: 'admin/accounts' });
    expect(within(nav()).getByRole('button', { name: 'Accounts' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).getByRole('button', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('navigates to the linked route', () => {
    renderShell();
    fireEvent.click(within(nav()).getByRole('button', { name: 'Catalogue ops' }));
    expect(onNavigate).toHaveBeenCalledWith('admin/catalog');
    fireEvent.click(within(nav()).getByRole('button', { name: 'Operations & SOS' }));
    expect(onNavigate).toHaveBeenCalledWith('admin/ops');
  });

  it('has the design’s 25 links and no More tools group', () => {
    renderShell();
    expect(within(nav()).getAllByRole('button')).toHaveLength(25);
    expect(within(nav()).queryByRole('heading', { name: 'More tools' })).toBeNull();
  });

  it('opens the new screens, including the ones awaiting design review', () => {
    renderShell();
    fireEvent.click(within(nav()).getByRole('button', { name: 'Erasure queue' }));
    expect(onNavigate).toHaveBeenCalledWith('admin/erasure');
    fireEvent.click(within(nav()).getByRole('button', { name: 'Break-glass log' }));
    expect(onNavigate).toHaveBeenCalledWith('admin/break-glass-log');
  });
});

describe('no unavailable entries', () => {
  it('marks nothing as not available', () => {
    renderShell();
    expect(nav().querySelectorAll('[aria-disabled="true"]')).toHaveLength(0);
    expect(nav()).not.toHaveTextContent('Not available yet');
  });
});

describe('account actions', () => {
  it('asks to sign out, and shows progress while it runs', () => {
    const { rerender } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalled();
    rerender(<SuperAdminShell route="admin" role="SUPER_ADMIN" onNavigate={onNavigate} onSignOut={onSignOut} signingOut signOutError=""><p>Page content</p></SuperAdminShell>);
    expect(screen.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
  });

  it('keeps only Sign out below the navigation', () => {
    renderShell();
    expect(screen.queryByRole('button', { name: 'My personal health' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marketplace' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('renders the page inside the main landmark', () => {
    renderShell();
    expect(screen.getByRole('main')).toHaveTextContent('Page content');
  });
});

describe('drawer on smaller screens', () => {
  it('opens, closes on Escape, and returns focus to the menu button', () => {
    renderShell();
    const menu = screen.getByRole('button', { name: 'Open super admin navigation' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('sk-admin-sidebar')).toHaveClass('is-open');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  });

  it('closes after choosing a page', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Open super admin navigation' }));
    fireEvent.click(within(nav()).getByRole('button', { name: 'Accounts' }));
    expect(document.getElementById('sk-admin-sidebar')).not.toHaveClass('is-open');
  });
});

describe('accessibility', () => {
  it('names every control and hides every navigation icon', () => {
    renderShell();
    screen.getAllByRole('button').forEach(button => expect(button).toHaveAccessibleName());
    nav().querySelectorAll('svg').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});
