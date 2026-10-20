import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { LanguageProvider } from '@/i18n';
import { campusConsoleHi } from '@/i18n/areas/campusConsole';
import { skIcons } from '../../icons/generated/skIconData';
import { CampusShell } from '../CampusShell';
import { CAMPUS_NAV, CAMPUS_NAV_ITEMS } from '../campusNav';

function renderShell(overrides: Partial<React.ComponentProps<typeof CampusShell>> = {}) {
  const props: React.ComponentProps<typeof CampusShell> = {
    current: 'overview',
    identity: { fullName: 'Priya Rao', initials: 'PR', roleLabel: 'Campus admin' },
    roleLine: 'Campus admin · VNR VJIET',
    campusLabel: 'VNR VJIET',
    scopes: [{ id: 'campus', label: 'Whole campus', meta: 'Every student verified at your campus' }],
    scope: 'campus',
    onScopeChange: vi.fn(),
    scopeNote: 'Hostel blocks appear here once connected.',
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    children: <p>page</p>,
    ...overrides,
  };
  const view = render(<CampusShell {...props} />);
  return { props, ...view };
}

const nav = () => screen.getByRole('navigation', { name: 'Campus admin' });

describe('CampusShell sidebar', () => {
  it('draws the four canvas groups in order, every item a real link', () => {
    renderShell();
    const groups = within(nav()).getAllByRole('group').map((group) => group.getAttribute('aria-labelledby'));
    expect(groups).toHaveLength(4);
    expect(within(nav()).getAllByRole('group').map((group) => group.firstElementChild?.textContent)).toEqual(['Campus', 'Safety', 'Public health', 'Admin']);
    const links = within(nav()).getAllByRole('link');
    expect(links).toHaveLength(CAMPUS_NAV_ITEMS.length);
    for (const link of links) expect(link.getAttribute('href')).toMatch(/^\/campus/);
  });

  it('uses the exact canvas drawing for every item, all from the icon manifest', () => {
    renderShell();
    const drawn = within(nav()).getAllByRole('link').map((link) => link.querySelector('svg')?.getAttribute('data-icon'));
    expect(drawn).toEqual(CAMPUS_NAV_ITEMS.map((item) => item.icon));
    for (const item of CAMPUS_NAV_ITEMS) expect(skIcons[item.icon]).toBeDefined();
    expect(CAMPUS_NAV.flatMap((group) => group.items).map((item) => item.icon)).toEqual(expect.arrayContaining([
      'users-small', 'users', 'hostel', 'shield-check', 'bar-chart', 'alert-triangle-2', 'file-check', 'heart-2',
      'alert-triangle', 'ambulance-2', 'message-dots', 'lock', 'heart-plus', 'window', 'file-minus',
      'locate', 'droplet', 'bottle', 'utensils', 'timer', 'user', 'volume', 'bar-chart-2', 'settings-2',
    ]));
  });

  it('marks only the current page, and navigates in place on a plain click', () => {
    const { props } = renderShell({ current: 'verification' });
    const current = within(nav()).getByRole('link', { name: 'Verification' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveClass('is-current');
    expect(within(nav()).getAllByRole('link').filter((link) => link.getAttribute('aria-current'))).toHaveLength(1);
    fireEvent.click(within(nav()).getByRole('link', { name: 'Water radar' }));
    expect(props.onNavigate).toHaveBeenCalledWith('campus/water');
  });

  it('leaves a modified click (new tab) to the browser', () => {
    const { props } = renderShell();
    fireEvent.click(within(nav()).getByRole('link', { name: 'Students' }), { metaKey: true });
    expect(props.onNavigate).not.toHaveBeenCalled();
  });

  it('shows badges only above zero, spoken, with the danger fill only for urgent queues', () => {
    renderShell({ counts: { verification: 14, sos: 2, certificates: 0 } });
    const verification = within(nav()).getByRole('link', { name: /^Verification ?, 14 waiting$/ });
    expect(verification.querySelector('.sk-cshell__badge')).not.toHaveClass('is-urgent');
    const sos = within(nav()).getByRole('link', { name: /^SOS alerts ?, 2 waiting$/ });
    expect(sos.querySelector('.sk-cshell__badge')).toHaveClass('is-urgent');
    expect(within(nav()).getByRole('link', { name: 'Certificates' }).querySelector('.sk-cshell__badge')).toBeNull();
  });

  it('keeps support and sign out in the footer', () => {
    const { props } = renderShell();
    fireEvent.click(screen.getByRole('link', { name: /^Support ?, help centre$/ }));
    expect(props.onNavigate).toHaveBeenCalledWith('support');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(props.onSignOut).toHaveBeenCalled();
  });
});

describe('CampusShell top bar', () => {
  it('claims 2FA only when the session reports it', () => {
    const { unmount } = renderShell();
    expect(screen.queryByText('2FA on')).toBeNull();
    unmount();
    renderShell({ twoFactorOn: true });
    expect(screen.getByText('2FA on')).toBeInTheDocument();
  });

  it('names the unread count on the bell and opens notifications', () => {
    const { props } = renderShell({ unreadNotifications: 5 });
    fireEvent.click(screen.getByRole('link', { name: 'Notifications, 5 unread' }));
    expect(props.onNavigate).toHaveBeenCalledWith('notifications');
  });

  it('shows search in its place but disabled, and says it is not available', () => {
    renderShell();
    const search = screen.getByRole('searchbox', { name: /not available yet/ });
    expect(search).toBeDisabled();
  });

  it('opens the scope list box, marks the chosen scope, explains the missing scopes, and closes on Escape', () => {
    const { props } = renderShell();
    const button = screen.getByRole('button', { name: /VNR VJIET.*Whole campus.*change scope/ });
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox', { name: 'Scope' });
    const option = within(list).getByRole('option', { name: /Whole campus/ });
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(option.querySelector('[data-icon="check-2"]')).not.toBeNull();
    expect(screen.getByText('Hostel blocks appear here once connected.')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('option', { name: /Whole campus/ }));
    expect(props.onScopeChange).toHaveBeenCalledWith('campus');
  });

  it('draws no scope, search, 2FA or bell on boards without the top bar', () => {
    renderShell({ topBar: false, twoFactorOn: true });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByText('2FA on')).toBeNull();
    expect(screen.queryByRole('link', { name: /Notifications/ })).toBeNull();
    // The menu button stays for the drawer at narrow widths.
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
  });

  it('opens the sidebar as a modal drawer and closes it with Escape', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Campus console' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CampusShell language, theme and accessibility', () => {
  it('follows the app language', () => {
    render(
      <LanguageProvider initial="hi">
        <CampusShell
          current="overview" identity={{ fullName: 'Priya Rao', initials: 'PR', roleLabel: 'x' }} roleLine="x" campusLabel="VNR VJIET"
          scopes={[{ id: 'campus', label: 'x' }]} scope="campus" onScopeChange={vi.fn()} onNavigate={vi.fn()} onSignOut={vi.fn()}
        >
          <p>page</p>
        </CampusShell>
      </LanguageProvider>,
    );
    expect(screen.getByRole('navigation', { name: campusConsoleHi['campusShell.navLabel'] })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: campusConsoleHi['campusShell.nav.overview'] })).toBeInTheDocument();
  });

  it('draws only from tokens, with the white pill as the one selected state on the navy', () => {
    const css = readFileSync(join(process.cwd(), 'src/design-system/campus-shell/campus-shell.css'), 'utf-8');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    expect(css).toMatch(/\.sk-cshell__sidebar \{[^}]*background: var\(--sk-color-sidebar\)/);
    expect(css).toMatch(/\.sk-cshell__link\.is-current[^{]*\{[^}]*background: var\(--sk-color-sidebar-active\);[^}]*color: var\(--sk-color-on-nav-current\)/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it('has 44 px targets on every control', () => {
    const css = readFileSync(join(process.cwd(), 'src/design-system/campus-shell/campus-shell.css'), 'utf-8');
    for (const selector of ['.sk-cshell__link {', '.sk-cshell__scope-btn {', '.sk-cshell__scope-option {', '.sk-cshell__icon-btn {']) {
      const start = css.indexOf(`\n${selector}`);
      expect(start, selector).toBeGreaterThan(-1);
      const rule = css.slice(start, css.indexOf('}', start));
      expect(rule, selector).toMatch(/(min-height|height): var\(--sk-size-touch-target\)/);
    }
  });

  it('has no axe violations, top bar open or not', async () => {
    const { container, unmount } = renderShell({ counts: { verification: 3 }, twoFactorOn: true, unreadNotifications: 2 });
    let violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    unmount();
    const compact = renderShell({ topBar: false });
    violations = await axeViolations(compact.container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
