import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleBrand, ConsoleNav, ConsoleSidebarLink, ConsoleTopbar } from '../ConsoleShell';
import type { ConsoleNavGroup } from '../ConsoleShell';
import { skTokens } from '../../../theme/tokens/generated/skTokens';
import { contrast } from '../../../theme/tokens/__tests__/wcag';

const groups = (onSelect = vi.fn()): ConsoleNavGroup[] => [
  {
    id: 'store',
    title: 'Store',
    items: [
      { id: 'home', label: 'Home', icon: 'home-2', current: true, onSelect },
      { id: 'orders', label: 'Orders', icon: 'box-2', count: 6, onSelect },
      { id: 'rx', label: 'Rx review', icon: 'prescription', count: 0, onSelect },
    ],
  },
  {
    id: 'lab',
    title: 'Lab',
    items: [{ id: 'release', label: 'Release results', icon: 'file' }],
  },
  { id: 'empty', title: 'Empty', items: [] },
];

describe('ConsoleNav', () => {
  it('is a named navigation landmark with one labelled group and heading per non-empty group', () => {
    render(<ConsoleNav label="Partner links" groups={groups()} />);
    const nav = screen.getByRole('navigation', { name: 'Partner links' });
    expect(within(nav).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Store', 'Lab']);
    expect(within(nav).getByRole('group', { name: 'Store' })).toBeInTheDocument();
    expect(within(nav).getByRole('group', { name: 'Lab' })).toBeInTheDocument();
    expect(within(nav).queryByRole('heading', { name: 'Empty' })).toBeNull();
  });

  it('marks only the current page, as the white pill', () => {
    render(<ConsoleNav label="Partner links" groups={groups()} />);
    const home = screen.getByRole('button', { name: 'Home' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(home).toHaveClass('is-current');
    expect(screen.getByRole('button', { name: /Orders/ })).not.toHaveAttribute('aria-current');
  });

  it('navigates from an available item', () => {
    const onSelect = vi.fn();
    render(<ConsoleNav label="Partner links" groups={groups(onSelect)} />);
    fireEvent.click(screen.getByRole('button', { name: /Orders/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows a count badge only above zero, and speaks it', () => {
    render(<ConsoleNav label="Partner links" groups={groups()} />);
    const orders = screen.getByRole('button', { name: 'Orders 6 waiting' });
    expect(orders.querySelector('.sk-console-nav__badge')).toHaveTextContent('6');
    expect(orders.querySelector('.sk-console-nav__badge')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Rx review' }).querySelector('.sk-console-nav__badge')).toBeNull();
  });

  it('keeps an unbuilt item in place, says so, and never navigates', () => {
    render(<ConsoleNav label="Partner links" groups={groups()} />);
    const release = screen.getByRole('button', { name: 'Release results Not available yet' });
    expect(release).toHaveAttribute('aria-disabled', 'true');
    expect(release).toHaveClass('is-unavailable');
    expect(release).not.toHaveAttribute('aria-current');
  });

  it('draws manifest icons, hidden from screen readers next to their labels', () => {
    render(<ConsoleNav label="Partner links" groups={groups()} />);
    const icons = Array.from(screen.getByRole('navigation').querySelectorAll('svg'));
    expect(icons.map((icon) => icon.getAttribute('data-icon'))).toEqual(['home-2', 'box-2', 'prescription', 'file']);
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});

describe('ConsoleBrand and ConsoleSidebarLink', () => {
  it('shows the brand mark once (decorative beside the wordmark) and the role line', () => {
    const { container } = render(<ConsoleBrand role="SUPER ADMIN" />);
    const logo = container.querySelector('[data-icon="brand:studentkare-logo"]');
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveTextContent('Student Kare');
    expect(screen.getByText('SUPER ADMIN')).toBeInTheDocument();
  });

  it('a footer link is a named button with a spoken hint, and can be disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<ConsoleSidebarLink icon="help-circle" label="MedPlus" hint="help centre" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'MedPlus help centre' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<ConsoleSidebarLink icon="log-out" label="Signing out…" disabled onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
  });
});

describe('ConsoleTopbar', () => {
  it('has the page name, a working search when given a handler, and notifications', () => {
    const onChange = vi.fn();
    const onClick = vi.fn();
    render(<ConsoleTopbar title="Partner console" search={{ label: 'Search patients, orders, results', value: '', onChange }} notifications={{ label: 'Notifications', onClick }} />);
    expect(screen.getByRole('banner')).toHaveTextContent('Partner console');
    const search = screen.getByRole('searchbox', { name: 'Search patients, orders, results' });
    expect(search).toBeEnabled();
    fireEvent.change(search, { target: { value: 'ORD-5521' } });
    expect(onChange).toHaveBeenCalledWith('ORD-5521');
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(onClick).toHaveBeenCalled();
    expect(document.querySelector('.sk-console-topbar__unread')).toBeNull();
  });

  it('shows search as disabled when it is not wired, and an unread dot only when told', () => {
    render(<ConsoleTopbar title="Today" search={{ label: 'Search' }} notifications={{ label: 'Notifications, unread', unread: true, onClick: vi.fn() }} />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeDisabled();
    expect(document.querySelector('.sk-console-topbar__unread')).toHaveAttribute('aria-hidden', 'true');
  });

  it('never shows a 2FA chip unless the session reported it', () => {
    const { rerender } = render(<ConsoleTopbar title="Today" />);
    expect(screen.queryByText('2FA on')).toBeNull();
    rerender(<ConsoleTopbar title="Today" twoFactorLabel="2FA on" />);
    expect(screen.getByText('2FA on').querySelector('[data-icon="shield-2"]')).not.toBeNull();
  });

  it('renders the console’s account control and leading control', () => {
    render(<ConsoleTopbar title="Today" leading={<button type="button">Open navigation</button>} account={<button type="button">Account</button>} />);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
  });
});

describe('theme', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/design-system/console-shell/console-shell.css'), 'utf8');

  it('uses tokens only: no hex, rgb or named colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(/);
    expect(css).not.toMatch(/:\s*(white|black|red)\s*;/);
  });

  it('draws the navy sidebar rows, the white current pill and the 44 px rows from tokens', () => {
    expect(css).toMatch(/\.sk-console-nav__link\.is-current \{[^}]*background: var\(--sk-color-sidebar-active\)[^}]*color: var\(--sk-color-on-nav-current\)/);
    expect(css).toMatch(/\.sk-console-nav__link \{[^}]*min-height: var\(--sk-size-touch-target\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).not.toMatch(/var\(--sk-color-danger/);
  });

  it.each(['light', 'dark'] as const)('%s: badge, labels and top-bar pairs meet contrast', (scheme) => {
    const c = skTokens.color[scheme];
    const { text, nonText } = skTokens.contrastMinimum;
    // Badge: navy on white off the pill, white on navy on the pill.
    expect(contrast(c.sidebar, c.sidebarInk)).toBeGreaterThanOrEqual(text);
    // Row labels and group headings on the navy.
    expect(contrast(c.sidebarInk2, c.sidebar)).toBeGreaterThanOrEqual(text);
    expect(contrast(c.sidebarInk3, c.sidebar)).toBeGreaterThanOrEqual(text);
    expect(contrast(c.onNavCurrent, c.sidebarActive)).toBeGreaterThanOrEqual(text);
    // Top bar.
    expect(contrast(c.text, c.surface)).toBeGreaterThanOrEqual(text);
    expect(contrast(c.text3, c.surface2)).toBeGreaterThanOrEqual(text);
    expect(contrast(c.positive, c.positiveBg)).toBeGreaterThanOrEqual(text);
    expect(contrast(c.action, c.surface)).toBeGreaterThanOrEqual(nonText);
  });
});
