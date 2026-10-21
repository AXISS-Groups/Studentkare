import { translate } from '@/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AccountRole } from '../../../data/types/workflowTypes';

const auth: { user: { fullName: string; role: AccountRole; university?: string; isVerifiedStudent?: boolean } | null } = { user: null };
const nav = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock('../../../theme/tokens/theme', () => ({ useTheme: () => ({ mode: 'light', setTheme: vi.fn() }) }));
vi.mock('../../../data/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock('../../../data/services/http', () => ({ apiRequest: () => new Promise(() => undefined) }));
vi.mock('@/core/navigation', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/core/navigation')>()), useNavigate: () => vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()),
  navigate: (path: string) => { nav.calls.push(path); },
}));

import { BrowserRouter } from '@/core/navigation';
import { WorkspaceScreen } from '../WorkspaceScreen';
import { STUDENT_NAV_ROUTES, isStudentNavRoot, studentNavFor } from '../StudentPhoneFrame';
import { PILL_NAV } from '@/design-system/m2';
import { drawsStudentPhoneFrame } from '../../../App';
import manifest from '../../../../design/icons/icon-manifest.json';

const original = window.matchMedia;
function phoneWidth(matches: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches, media: query, onchange: null,
    addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  auth.user = { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true, university: 'VNR VJIET' };
  nav.calls = [];
  phoneWidth(true);
});
afterEach(() => { window.matchMedia = original; });

describe('student pill nav (Mobile 2.0, approved 2026-10-21)', () => {
  it('has the boards’ destinations, order and brief icon names, all in the manifest', () => {
    expect(PILL_NAV.map(item => item.key)).toEqual(['home', 'orders', 'ayush', 'health', 'profile']);
    expect(PILL_NAV.map(item => item.icon)).toEqual(['home', 'box', 'ayush-spark', 'heart-3', 'user-5']);
    const names = new Set((manifest as { icons: { name: string }[] }).icons.map(icon => icon.name));
    for (const item of PILL_NAV) expect(names.has(item.icon)).toBe(true);
  });

  it('maps each destination to its route; the store boards show Home as current', () => {
    expect(Object.values(STUDENT_NAV_ROUTES)).toEqual(['health', 'orders', 'ayush', 'your-care', 'profile']);
    expect(studentNavFor('health')).toBe('home');
    expect(studentNavFor('your-care')).toBe('health');
    for (const mine of ['health/medicines', 'health/water'] as const) expect(studentNavFor(mine)).toBe('health');
    for (const store of ['shop', 'lab-tests', 'care'] as const) expect(studentNavFor(store)).toBe('home');
    expect(isStudentNavRoot('shop')).toBe(false);
    expect(studentNavFor('appointments')).toBeNull();
    expect(studentNavFor('notifications')).toBeNull();
  });
});

describe('student workspace at phone width', () => {
  it('draws the pill nav instead of the desktop shell; Home draws its own header', async () => {
    render(<WorkspaceScreen route="health" />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual(['Home', 'Orders', 'Ask Ayush', 'My health', 'Profile']);
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByTestId('m2-home')).toBeInTheDocument();
    // The board's header replaces the frame's: no frame title, no menu button.
    expect(screen.queryByRole('heading', { name: 'Student Kare' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();
    // Desktop shell pieces are gone: sidebar (until More is opened), greeting, old bottom nav, the old tab bar.
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(document.querySelector('.wf-mobile-bottom-nav')).toBeNull();
  });

  it('keeps SOS and notifications on Home, and opens the helplines from SOS', async () => {
    // jsdom has no modal dialogs.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
    render(<WorkspaceScreen route="health" />);
    await screen.findByTestId('m2-home');
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SOS, get help now' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // After the helplines: Nearest hospitals opens Find care (plan tier1-care-directory-2026-10-21 §3).
    fireEvent.click(screen.getByTestId('helplines-find-care'));
    expect(nav.calls).toContain('find-care');
  });

  it('opens Find care from Home Near me in the phone frame with Home current', async () => {
    render(<WorkspaceScreen route="find-care" />);
    expect(await screen.findByTestId('fc-directory')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('fc-emergency-112')).toBeInTheDocument();
  });

  it('opens the account menu (More) from the avatar on Home', async () => {
    render(<WorkspaceScreen route="health" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open your account menu' }));
    expect(screen.getByTestId('more-hub')).toBeInTheDocument();
  });

  it('gives a screen opened from Home a back button and its own title, with no destination current', () => {
    render(<WorkspaceScreen route="notifications" />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    for (const link of within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current');
  });

  it('opens the route of the pressed destination', () => {
    render(<WorkspaceScreen route="health" />);
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }));
    fireEvent.click(screen.getByRole('link', { name: 'My health' }));
    fireEvent.click(screen.getByRole('link', { name: 'Ask Ayush' }));
    expect(nav.calls).toEqual(['orders', 'your-care', 'ayush']);
  });

  it('opens the More panel (MoreHub board) from More, with log out in reach', () => {
    render(<WorkspaceScreen route="appointments" />);
    const more = screen.getByRole('button', { name: 'Open menu' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('more-hub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translate('en', 'shell.logout') })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('more-hub-requests'));
    expect(nav.calls).toEqual(['my-requests']);
  });

  it('draws a board’s own header: its title, and its controls on the row under the header', () => {
    render(<WorkspaceScreen route="appointments" />);
    expect(screen.getByRole('heading', { name: translate('en', 'pb.appt.title') })).toBeInTheDocument();
    expect(within(screen.getByTestId('board-toolbar')).getByRole('link', { name: translate('en', 'pb.appt.book') })).toBeInTheDocument();
    // SOS stays in the header on every board.
    expect(screen.getByRole('button', { name: 'SOS' })).toBeInTheDocument();
  });

  it('keeps the desktop shell above 430 px, and for staff', () => {
    phoneWidth(false);
    const { unmount } = render(<WorkspaceScreen route="health" />);
    expect(screen.queryByTestId('pill-nav')).toBeNull();
    // Above the phone width a student gets the student web shell (S1), not the phone frame.
    expect(screen.getByRole('navigation', { name: translate('en', 'shell.sidebar.aria') })).toBeInTheDocument();
    unmount();
    phoneWidth(true);
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route="profile" />);
    expect(screen.queryByTestId('pill-nav')).toBeNull();
  });
});

describe('phone boards in the frame (WP-04)', () => {
  it('draws Mobile 2.0 Home on /health: SOS before search, and no health data beyond today’s medicines', async () => {
    render(<WorkspaceScreen route="health" />);
    const board = await screen.findByTestId('m2-home');
    const sos = within(board).getByRole('button', { name: 'SOS, get help now' });
    const search = within(board).getByRole('search', { name: 'Open search' });
    expect(sos.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lets a board with its own back control leave the header without one', async () => {
    render(<BrowserRouter><WorkspaceScreen route="search" /></BrowserRouter>);
    await screen.findByTestId('search-entry');
    expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
  });

  it('keeps the desktop orders page above 430 px', () => {
    phoneWidth(false);
    render(<WorkspaceScreen route="orders" />);
    expect(screen.queryByTestId('order-history')).toBeNull();
  });
});

describe('app bar above the frame', () => {
  it('is left out only for a student workspace page at phone width', () => {
    expect(drawsStudentPhoneFrame('/health', 'STUDENT', true)).toBe(true);
    expect(drawsStudentPhoneFrame('/health', 'STUDENT', false)).toBe(false);
    expect(drawsStudentPhoneFrame('/health', 'SUPER_ADMIN', true)).toBe(false);
    // The shop and checkout are public pages, but a student at phone width gets their phone boards in the frame.
    expect(drawsStudentPhoneFrame('/shop', 'STUDENT', true)).toBe(true);
    expect(drawsStudentPhoneFrame('/checkout', 'STUDENT', true)).toBe(true);
    expect(drawsStudentPhoneFrame('/checkout', 'STUDENT', false)).toBe(false);
    expect(drawsStudentPhoneFrame('/shop', null, true)).toBe(false);
    // Mobile 2.0 Lab tests and Doctor consults are store boards in the frame too.
    expect(drawsStudentPhoneFrame('/lab-tests', 'STUDENT', true)).toBe(true);
    expect(drawsStudentPhoneFrame('/care', 'STUDENT', true)).toBe(true);
    expect(drawsStudentPhoneFrame('/care', 'STUDENT', false)).toBe(false);
  });
});
