import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { StudentWebShell, initialsOf, shortNameOf } from '../StudentWebShell';
import { STUDENT_NAV, studentNavIdFor } from '../studentNav';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { skIcons } from '../../icons/generated/skIconData';

function renderShell(overrides: Partial<React.ComponentProps<typeof StudentWebShell>> = {}) {
  const props = {
    route: 'health' as const,
    student: { fullName: 'Krishna Chintakayala', campus: 'VNR VJIET', verified: true },
    cartCount: 2,
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
  render(<StudentWebShell {...props}><p>page body</p></StudentWebShell>);
  return props;
}

const sidebarNav = () => screen.getAllByRole('navigation', { name: 'My Student Kare' })[0];

describe('StudentWebShell', () => {
  it('draws the canvas groups and items in order', () => {
    renderShell();
    const nav = sidebarNav();
    const groups = within(nav).getAllByRole('group').filter((group) => group.getAttribute('aria-labelledby'));
    expect(groups.map((group) => group.getAttribute('aria-labelledby'))).toEqual(['sk-sshell-care', 'sk-sshell-services', 'sk-sshell-account']);
    expect(within(groups[0]).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Your Care', 'Health vault', 'My lab tests, Not available yet', 'Report insights, Not available yet', 'Emergency card', 'My check-in pass',
    ]);
    expect(within(groups[1]).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Orders', 'Buy again, Not available yet', 'Ayush AI', 'My requests',
    ]);
    expect(within(groups[2]).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Account', 'Identity verification', 'Sign-in & security', 'Notifications', 'Plan & billing',
    ]);
  });

  it('marks the current item from the route and navigates from built items', () => {
    const props = renderShell({ route: 'records' });
    const care = screen.getByRole('group', { name: 'My care' });
    expect(within(care).getByRole('button', { name: 'Health vault' })).toHaveAttribute('aria-current', 'page');
    expect(within(care).getByRole('button', { name: 'Your Care' })).not.toHaveAttribute('aria-current');
    fireEvent.click(within(sidebarNav()).getByRole('button', { name: 'Sign-in & security' }));
    expect(props.onNavigate).toHaveBeenCalledWith('security');
  });

  it('shows items with no student screen as unavailable and never navigates', () => {
    const props = renderShell();
    const item = within(sidebarNav()).getByRole('button', { name: /Buy again/ });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(props.onNavigate).not.toHaveBeenCalled();
  });

  it('has the top nav, My orders, the cart with its count and the account button', () => {
    const props = renderShell({ route: 'shop' });
    const top = screen.getByRole('navigation', { name: 'Main' });
    expect(within(top).getAllByRole('button').map((button) => button.textContent)).toEqual(['Shop', 'Lab tests', 'Doctors', 'Health vault', 'Ayush']);
    expect(within(top).getByRole('button', { name: 'Shop' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Cart, 2 items' }));
    expect(props.onNavigate).toHaveBeenCalledWith('checkout');
    fireEvent.click(screen.getByRole('button', { name: 'My orders' }));
    expect(props.onNavigate).toHaveBeenCalledWith('orders');
    fireEvent.click(screen.getByRole('button', { name: 'My account' }));
    expect(props.onNavigate).toHaveBeenCalledWith('profile');
  });

  it('shows no cart badge at zero', () => {
    renderShell({ cartCount: 0 });
    const cart = screen.getByRole('button', { name: 'Cart' });
    expect(cart.textContent).toBe('');
  });

  it('shows the account header from the session, never a verification it was not given', () => {
    renderShell();
    expect(screen.getByText('Krishna C.')).toBeInTheDocument();
    expect(screen.getByText('VNR VJIET · Edu ID verified')).toBeInTheDocument();
  });

  it('says verification is pending when the session does not say verified', () => {
    renderShell({ student: { fullName: 'Asha', verified: false } });
    expect(screen.getByText('Verification pending')).toBeInTheDocument();
    expect(screen.queryByText(/Edu ID verified/)).toBeNull();
  });

  it('log out asks the caller (the one confirm dialog) and never signs out itself', () => {
    const props = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it('while signing out the button is busy, and an error is announced', () => {
    renderShell({ signingOut: true, signOutError: 'This is on our side, not yours. Try again.' });
    const button = screen.getByRole('button', { name: 'Logging out…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('This is on our side');
  });

  it('opens the sidebar as a modal drawer, and Escape closes it and returns focus', () => {
    renderShell();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'My Student Kare' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open menu' }));
  });

  it('renders the page inside a main landmark', () => {
    renderShell();
    expect(screen.getByRole('main')).toHaveTextContent('page body');
  });
});

describe('student nav data', () => {
  it('uses only icons that exist in the icon set', () => {
    const names = STUDENT_NAV.flatMap((group) => group.items.map((item) => item.icon));
    expect(names.filter((name) => !(name in skIcons))).toEqual([]);
  });

  it('maps related routes to their sidebar item', () => {
    expect(studentNavIdFor('health')).toBe('your-care');
    expect(studentNavIdFor('digital-id')).toBe('account');
    expect(studentNavIdFor('notification-settings')).toBe('notifications');
    expect(studentNavIdFor('shop')).toBeNull();
  });

  it('formats initials and the short name like the canvas', () => {
    expect(initialsOf('Krishna Chintakayala')).toBe('KC');
    expect(initialsOf('asha')).toBe('A');
    expect(shortNameOf('Krishna Chintakayala')).toBe('Krishna C.');
    expect(shortNameOf('Asha')).toBe('Asha');
  });
});

/** WCAG relative-luminance contrast of two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('student shell colours, both schemes', () => {
  it.each(['light', 'dark'] as const)('%s: sidebar text, group labels, log out and top nav meet AA', (scheme) => {
    const c = skTokens.color[scheme];
    const checks: [string, string, string, number][] = [
      ['account meta', c.sidebarInk2, c.sidebar, 4.5],
      ['group label', c.sidebarInk3, c.sidebar, 4.5],
      ['log out', c.navDanger, c.sidebar, 4.5],
      ['top link', c.text2, c.surface, 4.5],
      ['current top link', c.action, c.surface, 4.5],
      ['cart badge', c.onAction, c.action, 4.5],
    ];
    const failures = checks.filter(([, fg, bg, min]) => contrast(fg.slice(0, 7), bg.slice(0, 7)) < min).map(([what]) => what);
    expect(failures).toEqual([]);
  });

  it('the stylesheet uses tokens only', () => {
    const css = readFileSync(resolve(__dirname, '../student-shell.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });
});
