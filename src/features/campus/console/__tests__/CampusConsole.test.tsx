import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen, within } from '@testing-library/react';

const apiRequest = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
const auth: { user: null | { fullName: string; role: string; university: string } } = { user: null };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ ...auth, logout: vi.fn() }) }));

import { CampusConsole } from '../CampusConsole';
import { CAMPUS_PAGES } from '../campusPages';
import { isCampusConsolePath, opensInCampusConsole } from '../campusConsoleRoutes';
import type { CampusConsoleSummarySource } from '../campusConsoleSummary';
import { liveCampusConsoleSummarySource } from '../campusConsoleSummary';
import { CAMPUS_NAV_ITEMS } from '@/design-system';
import { canAccessRoute, routePaths } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';

const flush = () => act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
const quietSummary: CampusConsoleSummarySource = { load: async () => ({ counts: { verification: 4, sos: 1 }, twoFactorOn: true, unreadNotifications: 2 }) };

function renderConsole(route: RoutePath, role = 'CAMPUS_ADMIN') {
  auth.user = { fullName: 'Priya Rao', role, university: 'VNR VJIET' };
  return render(<CampusConsole route={route} summarySource={quietSummary} />);
}

afterEach(() => { apiRequest.mockReset(); auth.user = null; });

describe('campus console routes', () => {
  it('has a page for every sidebar item, and every campus route is admin-only', () => {
    for (const item of CAMPUS_NAV_ITEMS) expect(CAMPUS_PAGES[item.route], item.route).toBeDefined();
    const campusRoutes = routePaths.filter((path) => path === 'campus' || path.startsWith('campus/') || ['campus-wellness', 'campus-access-requests', 'campus-break-glass'].includes(path));
    expect(campusRoutes.length).toBeGreaterThanOrEqual(26);
    for (const route of campusRoutes) {
      expect(CAMPUS_PAGES[route], route).toBeDefined();
      expect(canAccessRoute(route, 'CAMPUS_ADMIN')).toBe(true);
      expect(canAccessRoute(route, 'SUPER_ADMIN')).toBe(true);
      for (const role of [null, 'STUDENT', 'COUNSELLOR', 'VENDOR', 'NMC_DOCTOR'] as const) expect(canAccessRoute(route, role), `${route} ${role}`).toBe(false);
    }
  });

  it('maps a board to every page-4 brief that has the campus shell', () => {
    const boards = new Set(Object.values(CAMPUS_PAGES).map((page) => page?.board));
    for (const board of ['CampusOverview', 'CampusRoster', 'CampusBlocks', 'CampusApprovals', 'CampusInsights', 'CampusCamps', 'CampusCertificates', 'CampusWellness',
      'CampusIncidents', 'CampusAmbulance', 'CampusCounsellor', 'CampusAccessRequests', 'CampusBreakGlass', 'CampusIsolation', 'CampusDischarge',
      'CampusOutbreak', 'CampusWater', 'CampusSanitary', 'CampusMess', 'CampusSla', 'CampusAdminTeam', 'CampusAnnouncements', 'CampusReports', 'CampusSettings', 'CampusAdminConsole']) {
      expect(boards, board).toContain(board);
    }
  });

  it('opens in the console only for a campus admin (and the super admin on campus paths)', () => {
    expect(isCampusConsolePath('/campus')).toBe(true);
    expect(isCampusConsolePath('/campus/water')).toBe(true);
    expect(isCampusConsolePath('/campus-break-glass')).toBe(true);
    expect(isCampusConsolePath('/campuses')).toBe(false);
    expect(opensInCampusConsole('/notifications', 'CAMPUS_ADMIN')).toBe(true);
    expect(opensInCampusConsole('/notifications', 'SUPER_ADMIN')).toBe(false);
    expect(opensInCampusConsole('/campus', 'SUPER_ADMIN')).toBe(true);
    expect(opensInCampusConsole('/campus', 'STUDENT')).toBe(false);
    expect(opensInCampusConsole('/campus', null)).toBe(false);
  });
});

describe('CampusConsole', () => {
  it('lands on the Overview inside the shell, with the campus, live badges and 2FA from the server', async () => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    renderConsole('campus');
    await flush();
    const nav = screen.getByRole('navigation', { name: 'Campus admin' });
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: /^Verification ?, 4 waiting$/ })).toBeInTheDocument();
    expect(screen.getByText('Campus admin · VNR VJIET')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /VNR VJIET.*Whole campus/ })).toBeInTheDocument();
    expect(screen.getByText('2FA on')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Loading overview' })).toBeInTheDocument();
  });

  it('shows a board with no data source as "not connected", with no sample data', async () => {
    renderConsole('campus/discharge');
    await flush();
    expect(await screen.findByRole('heading', { level: 1, name: 'Discharge certificates' })).toBeInTheDocument();
    expect(screen.getByText('Discharge certificates aren’t connected yet')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NMC-TS|Dr\. A\. Reddy|B-214/);
    expect(within(screen.getByRole('navigation', { name: 'Campus admin' })).getByRole('link', { name: 'Discharge certificates' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the counsellor queue from campus admins: it explains, and never asks for crisis events', async () => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    renderConsole('campus/counsellor');
    await flush();
    expect(await screen.findByText(/only counsellors open it/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the counsellor queue' })).toBeNull();
    expect(apiRequest.mock.calls.some(([path]) => path.startsWith('/ops/crisis-events'))).toBe(false);
  });

  it('draws boards without a top bar as sidebar and page only, as on the canvas', async () => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    renderConsole('campus/sla');
    await flush();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(await screen.findByRole('heading', { level: 1, name: 'SLA escalation' })).toBeInTheDocument();
  });

  it('labels the super admin as such, across all campuses', async () => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    renderConsole('campus/reports', 'SUPER_ADMIN');
    await flush();
    expect(screen.getByText('Super admin · all campuses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All campuses.*Whole campus/ })).toBeInTheDocument();
  });
});

describe('features the old tab hub carried keep a route', () => {
  it.each([
    ['Medical leave', 'campus/leave'],
    ['Health scorecard', 'campus/scorecard'],
  ] as const)('%s is a sidebar link to its own board, mounting the existing screen', async (label, route) => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    renderConsole('campus');
    await flush();
    const link = within(screen.getByRole('navigation', { name: 'Campus admin' })).getByRole('link', { name: label });
    expect(link).toHaveAttribute('href', `/${route}`);
    expect(canAccessRoute(route, 'CAMPUS_ADMIN')).toBe(true);
    expect(canAccessRoute(route, 'STUDENT')).toBe(false);
    expect(CAMPUS_PAGES[route]?.screen).not.toBeNull();
  });

  it('opens each one inside the shell with that item current', async () => {
    renderConsole('campus/leave');
    await flush();
    const nav = screen.getByRole('navigation', { name: 'Campus admin' });
    expect(within(nav).getByRole('link', { name: 'Medical leave' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('Not connected yet')).toBeNull();
  });
});

describe('live console summary', () => {
  it('counts what the server reports and drops parts that fail, without guessing', async () => {
    apiRequest.mockImplementation(async (path) => {
      if (path === '/ops/campus/pending') return { items: [{}, {}] };
      if (path === '/ops/sos') return { items: [{ status: 'ACTIVE' }, { status: 'ACKNOWLEDGED' }, { status: 'ACTIVE' }] };
      if (path === '/auth/2fa/status') throw new Error('down');
      if (path === '/notifications') return { items: [{ readAt: null }, { readAt: 5 }] };
      throw new Error(path);
    });
    const summary = await liveCampusConsoleSummarySource.load();
    expect(summary).toEqual({ counts: { verification: 2, sos: 2 }, twoFactorOn: undefined, unreadNotifications: 1 });
  });
});
