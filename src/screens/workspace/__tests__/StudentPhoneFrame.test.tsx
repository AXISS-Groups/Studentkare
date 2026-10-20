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

import { WorkspaceScreen } from '../WorkspaceScreen';
import { STUDENT_WEB_TABS, studentTabFor } from '../StudentPhoneFrame';
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

describe('student tab set (canvas HomeDiscover bottom bar)', () => {
  it('has the canvas tabs, order and brief icon names, all in the manifest', () => {
    expect(STUDENT_WEB_TABS.map(tab => tab.key)).toEqual(['discover', 'wellness', 'ayush', 'labTests', 'yourCare']);
    expect(STUDENT_WEB_TABS.map(tab => tab.icon)).toEqual(['compass', 'map-pin', 'sparkle', 'flask-2', 'stethoscope']);
    const names = new Set((manifest as { icons: { name: string }[] }).icons.map(icon => icon.name));
    for (const tab of STUDENT_WEB_TABS) expect(names.has(tab.icon)).toBe(true);
  });

  it('maps each tab to its route, and only tab routes to a tab', () => {
    expect(STUDENT_WEB_TABS.map(tab => tab.path)).toEqual(['health', 'shop', 'ayush', 'lab-tests', 'your-care']);
    expect(studentTabFor('health')).toBe('discover');
    expect(studentTabFor('your-care')).toBe('yourCare');
    expect(studentTabFor('appointments')).toBeNull();
    expect(studentTabFor('notifications')).toBeNull();
  });
});

describe('student workspace at phone width', () => {
  it('draws the phone header and the tab bar instead of the desktop shell', () => {
    render(<WorkspaceScreen route="health" />);
    const bar = screen.getByRole('tablist', { name: 'Main sections' });
    expect(within(bar).getAllByRole('tab').map(tab => tab.getAttribute('aria-label'))).toEqual(['Discover', 'Wellness', 'Ayush AI', 'Lab Tests', 'Your Care']);
    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Student Kare' })).toBeInTheDocument();
    // Desktop shell pieces are gone: sidebar (until More is opened), greeting, old bottom nav.
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    expect(screen.queryByText(/good to see you/i)).toBeNull();
    expect(document.querySelector('.wf-mobile-bottom-nav')).toBeNull();
  });

  it('keeps SOS and notifications on Discover, and opens the helplines from SOS', () => {
    // jsdom has no modal dialogs.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
    render(<WorkspaceScreen route="health" />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('gives a screen opened from a tab a back button and its own title, with no tab selected', () => {
    render(<WorkspaceScreen route="notifications" />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    for (const tab of screen.getAllByRole('tab')) expect(tab).toHaveAttribute('aria-selected', 'false');
  });

  it('opens the route of the pressed tab', () => {
    render(<WorkspaceScreen route="health" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Lab Tests' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Your Care' }));
    expect(nav.calls).toEqual(['lab-tests', 'your-care']);
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
    expect(screen.queryByRole('tablist')).toBeNull();
    // Above the phone width a student gets the student web shell (S1), not the phone frame.
    expect(screen.getByRole('navigation', { name: translate('en', 'shell.sidebar.aria') })).toBeInTheDocument();
    unmount();
    phoneWidth(true);
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route="profile" />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('app bar above the frame', () => {
  it('is left out only for a student workspace page at phone width', () => {
    expect(drawsStudentPhoneFrame('/health', 'STUDENT', true)).toBe(true);
    expect(drawsStudentPhoneFrame('/health', 'STUDENT', false)).toBe(false);
    expect(drawsStudentPhoneFrame('/health', 'SUPER_ADMIN', true)).toBe(false);
    expect(drawsStudentPhoneFrame('/checkout', 'STUDENT', true)).toBe(false);
  });
});
