import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { LiveCatalogItem, OpsFeed } from '../../../data/types/workflowTypes';
import { canAccessRoute, isRoutePath, routePaths, RoutePath } from '../../../lib/utils/workflowRouting';

interface Resource { data: unknown; loading: boolean; error: string; reload: () => void }

const resources: Record<string, Resource> = {};
const requested: string[] = [];
// apiRequest answers, keyed by request path. Screens on the MVVM pattern load through a repository, so
// their requests are scripted here rather than through useApiResource.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequested: string[] = [];
const navigate = vi.fn();

vi.mock('../../../hooks/api/useApiResource', () => ({
  useApiResource: (path: string) => { requested.push(path); return resources[path] ?? { data: null, loading: true, error: '', reload: vi.fn() }; },
}));
// A path with no scripted answer never settles, so legacy panels that call the API directly stay loading;
// the screen is what is under test.
vi.mock('../../../data/services/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/services/http')>()),
  apiRequest: (path: string) => { apiRequested.push(path); return apiAnswers[path]?.() ?? new Promise(() => undefined); },
}));
vi.mock('../../../theme/tokens/theme', async () => {
  const { lightTokens } = await import('../../../theme/tokens/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, tokens: lightTokens, setTheme: vi.fn(), toggleTheme: vi.fn() }) };
});
vi.mock('../../../lib/utils/workflowRouting', async importOriginal => ({ ...(await importOriginal<typeof import('../../../lib/utils/workflowRouting')>()), navigate: (path: string) => navigate(path) }));

import { superAdminScreen } from '../admin/SuperAdminScreens';
import { skTokens } from '../../../theme/tokens/generated/skTokens';


const show = (route: RoutePath) => {
  const element = superAdminScreen(route);
  if (!element) throw new Error(`No screen for ${route}`);
  return render(<Suspense fallback={<p>Loading…</p>}>{element}</Suspense>);
};

const ADMIN_ROUTES = routePaths.filter(route => route === 'admin' || route.startsWith('admin/'));
// WP-16 boards on the console table page with nothing behind them yet.
const UNCONNECTED_BOARDS: RoutePath[] = ['admin/sentinel', 'admin/verification', 'admin/partners', 'admin/organisations', 'admin/flags', 'admin/ledger'];

beforeEach(() => {
  Object.keys(resources).forEach(key => delete resources[key]);
  requested.length = 0;
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequested.length = 0;
  navigate.mockReset();
});

describe('routes', () => {
  it('gives every admin route a canonical screen, reachable only by a super admin', () => {
    expect(ADMIN_ROUTES.length).toBe(39);
    ADMIN_ROUTES.forEach(route => {
      expect(isRoutePath(route)).toBe(true);
      expect(superAdminScreen(route), route).not.toBeNull();
      expect(canAccessRoute(route, 'SUPER_ADMIN')).toBe(true);
      (['STUDENT', 'CAMPUS_ADMIN', 'COUNSELLOR', 'VENDOR', 'NMC_DOCTOR'] as const).forEach(role => expect(canAccessRoute(route, role)).toBe(false));
    });
  });

  it('leaves non-admin routes to the member workspace', () => {
    (['health', 'profile', 'support', 'billing'] as RoutePath[]).forEach(route => expect(superAdminScreen(route)).toBeNull());
  });

  it('never shows a "not available yet" page', () => {
    ADMIN_ROUTES.filter(route => route !== 'admin').forEach(route => {
      const { unmount } = show(route);
      // A control the board draws but can't use may say "Not available yet" next to it (Tier 1 rule); a whole placeholder page may not.
      expect(document.body.textContent, route).not.toMatch(/awaiting design review|coming soon/i);
      unmount();
    });
  });
});

describe('tabbed screens', () => {
  it.each(['admin/activity', 'admin/support', 'admin/requests'] as RoutePath[])('%s opens Operations & SOS with no tab strip', route => {
    show(route);
    expect(screen.getByRole('heading', { level: 1, name: 'Operations & SOS' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it.each([
    ['admin/organisations', 'Organisations', 'Tenants'],
    ['admin/billing', 'Organisations', 'Inquiries & contracts'],
    ['admin/partners', 'Partner applications', 'Applications'],
    ['admin/preventive', 'Partner applications', 'Providers & preventive care'],
  ] as [RoutePath, string, string][])('%s opens %s on the %s tab', (route, title, tab) => {
    show(route);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getAllByRole('tab').filter(item => item.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('moves between tabs through the router, by click and by arrow key', () => {
    show('admin/organisations');
    fireEvent.click(screen.getByRole('tab', { name: 'Inquiries & contracts' }));
    expect(navigate).toHaveBeenCalledWith('admin/billing');
    navigate.mockClear();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Tenants' }), { key: 'ArrowRight' });
    expect(navigate).toHaveBeenCalledWith('admin/billing');
  });

  it('puts the older panels inside the legacy style bridge', () => {
    (['admin/activity', 'admin/support', 'admin/requests', 'admin/accounts', 'admin/preventive'] as RoutePath[]).forEach(route => {
      const { container, unmount } = show(route);
      expect(container.querySelector('.sk-admin-legacy'), route).not.toBeNull();
      unmount();
    });
  });
});

describe('screens with no data source', () => {
  it.each(UNCONNECTED_BOARDS)('%s keeps the board’s columns, says nothing is connected, and lists no rows', route => {
    show(route);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(4);
    expect(table).toHaveTextContent(/No .+ yet\./);
    expect((table.querySelector('tbody') as HTMLElement).textContent).not.toMatch(/\d/);
    expect(document.body.textContent).not.toMatch(/\bApprove\b|Grant role|Run payouts|Export decisions/);
    expect(requested).toHaveLength(0);
  });

  it.each(['admin/sentinel', 'admin/verification', 'admin/partners', 'admin/organisations', 'admin/ledger'] as RoutePath[])('%s shows the board’s figures as “—”, never 0', route => {
    show(route);
    const values = Array.from(screen.getByRole('group', { name: /summary$/ }).querySelectorAll('.sk-stat__value')).map(value => value.textContent);
    expect(values.length).toBeGreaterThanOrEqual(4);
    values.forEach(value => expect(value).toBe('—'));
  });

  it('says why clinician verification is empty and points to where clinician accounts are made', () => {
    show('admin/verification');
    expect(screen.getByText(/No endpoint lists clinician applications/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Accounts' }));
    expect(navigate).toHaveBeenCalledWith('admin/accounts');
  });

  it('keeps the claims adjudication layout with nothing to approve and no claim, amount or document', () => {
    show('admin/claims');
    expect(screen.getByRole('heading', { level: 1, name: 'Claims adjudication' })).toBeInTheDocument();
    ['Adjudication checks', 'Amount', 'Documents the student attached', 'Decision package · M24'].forEach(name => expect(screen.getByRole('region', { name })).toBeInTheDocument());
    expect(screen.getByText(/Claims adjudication is not connected/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.body.textContent).not.toMatch(/₹\s?\d|CLM-|Apollo|Dengue/);
    expect(requested).toHaveLength(0);
    expect(apiRequested).toHaveLength(0);
  });

  it('keeps the tenants and applications tabs empty rather than inventing rows', () => {
    show('admin/organisations');
    expect(screen.getByRole('table')).toHaveTextContent('No tenants yet.');
  });

  it('does not show the sentinel’s hard-coded compliance result', () => {
    show('admin/sentinel');
    expect(document.body.textContent).not.toMatch(/passed|compliant/i);
  });

});

describe('real data on the older screens', () => {
  it('shows Accounts & roles: real counts per role, app access from each role’s home, and the account list', async () => {
    [['STUDENT', 900], ['NMC_DOCTOR', 40], ['VENDOR', 12], ['CAMPUS_ADMIN', 6], ['COUNSELLOR', 0], ['SUPER_ADMIN', 2]].forEach(([role, total]) => { apiAnswers[`/ops/accounts?limit=1&role=${role}`] = () => Promise.resolve({ items: [], total }); });
    show('admin/accounts');
    expect(await screen.findByRole('heading', { level: 1, name: 'Accounts & roles' })).toBeInTheDocument();
    // Figures: label (dt), value and meta (dd). Pending grants and break-glass have no source: "—", never 0.
    const figures = Array.from(screen.getByRole('group', { name: 'Accounts summary' }).querySelectorAll('.sk-stat'));
    expect(figures[0]).toHaveTextContent('960');
    expect(figures[1]).toHaveTextContent('6');
    expect(figures[2]).toHaveTextContent('—');
    expect(figures[2]).toHaveTextContent('Not reported');
    expect(figures[3]).toHaveTextContent('Break-glass · 30 days');
    expect(figures[3]).toHaveTextContent('Not reported');
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['By role', 'Pending grants', 'Recently changed']);
    expect(screen.getByRole('tab', { name: 'By role' })).toHaveAttribute('aria-selected', 'true');
    const table = screen.getByRole('table', { name: 'Accounts by role' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Role', 'Accounts', 'Clinical access', 'App access']);
    const studentRow = within(table).getByText('STUDENT').closest('tr') as HTMLElement;
    const adminRow = within(table).getByText('SUPER_ADMIN').closest('tr') as HTMLElement;
    expect(studentRow).toHaveTextContent('900');
    expect(adminRow).toHaveTextContent('2');
    // App access is the workspace each role is sent to after sign-in.
    // The role is the row header (th); the account count, clinical data and app access follow.
    expect(studentRow.querySelectorAll('td')[2]).toHaveTextContent('Student portal');
    expect(adminRow.querySelectorAll('td')[2]).toHaveTextContent('Platform administration');
    // Clinical data comes from the app's permission table (src/core/auth/rbac.ts).
    expect(studentRow).toHaveTextContent('Own record only');
    expect(within(table).getByText('NMC_DOCTOR').closest('tr')).toHaveTextContent('Consented records only');
    expect(within(table).getByText('VENDOR').closest('tr')).toHaveTextContent('Permission policy unavailable');
    expect(adminRow).toHaveTextContent('No clinical access');
    expect(screen.getByText(/Manage accounts/).closest('details')).not.toHaveAttribute('open');
    expect(document.body.textContent).not.toMatch(/two role models disagree|grant role|enforced in the client only|NMC register/i);
  });

  it('switches Accounts & roles between its tabs: pending grants empty, recent changes from the account feed', async () => {
    [['STUDENT', 1], ['NMC_DOCTOR', 0], ['VENDOR', 0], ['CAMPUS_ADMIN', 0], ['COUNSELLOR', 0], ['SUPER_ADMIN', 1]].forEach(([role, total]) => { apiAnswers[`/ops/accounts?limit=1&role=${role}`] = () => Promise.resolve({ items: [], total }); });
    const event = (id: string, kind: string, summary: string): OpsFeed['items'][number] => ({ id, kind, domain: 'ACCOUNT', severity: 'ATTENTION', actorId: 'a', actorRole: 'SUPER_ADMIN', subjectId: 's', providerId: '', resourceType: '', resourceId: '', summary, createdAt: 1_700_000_000, acknowledgedAt: null, acknowledgedBy: '' });
    apiAnswers['/ops/feed?domain=ACCOUNT&limit=200'] = () => Promise.resolve({ items: [event('1', 'STAFF_ACCOUNT_CREATED', 'Staff account created with the vendor role'), event('2', 'SUBSCRIPTION_STARTED', 'Plan started')], total: 2, critical: 0, scope: 'all' });
    show('admin/accounts');
    await screen.findByRole('tab', { name: 'Pending grants' });
    expect(apiRequested).not.toContain('/ops/feed?domain=ACCOUNT&limit=200');

    fireEvent.click(screen.getByRole('tab', { name: 'Pending grants' }));
    expect(screen.getByRole('tab', { name: 'Pending grants' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No pending access grants')).toBeInTheDocument();
    expect(screen.getByText(/Role grants are not connected/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Accounts by role' })).toBeNull();
    expect(screen.queryByRole('button', { name: /grant/i })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Recently changed' }));
    const table = await screen.findByRole('table', { name: 'Recently changed accounts' });
    expect(within(table).getByText('Staff account created with the vendor role')).toBeInTheDocument();
    expect(within(table).queryByText('Plan started')).toBeNull();
    expect(document.body.textContent).not.toMatch(/grant role|18,420/i);
  });

  it('summarises the catalogue', async () => {
    const item = (id: string, kind: LiveCatalogItem['kind'], stock: number): LiveCatalogItem => ({ id, providerId: 'p', kind, name: id, brand: '', category: 'c', description: '', pack: '', pricePaise: 1, mrpPaise: 1, stock, active: true, requiresPrescription: false, preparation: '' });
    apiAnswers['/ops/catalog?limit=200'] = () => Promise.resolve({ items: [item('a', 'product', 3), item('b', 'product', 0), item('c', 'lab', 0)], total: 3 });
    apiAnswers['/ops/catalog?limit=15&offset=0'] = () => Promise.resolve({ items: [item('a', 'product', 3)], total: 1 });
    const { unmount } = show('admin/catalog');
    const group = await screen.findByRole('group', { name: 'Catalogue summary' });
    await waitFor(() => expect(Array.from(group.querySelectorAll('.sk-stat__value')).map(value => value.textContent)).toEqual(['3', '2', '1', '1']));
    unmount();
  });

  it('shows the shipped colour tokens on Design tokens, with light and dark values', () => {
    show('admin/tokens');
    expect(screen.getByRole('heading', { level: 1, name: 'Design tokens' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Colour tokens' });
    expect(within(table).getByText('--sk-color-sidebar').closest('tr')).toHaveTextContent(skTokens.color.dark.sidebar);
    const values = Array.from(screen.getByRole('group', { name: 'Token summary' }).querySelectorAll('.sk-stat__value')).map(value => value.textContent);
    expect(values[0]).toBe(String(Object.keys(skTokens.color.light).length));
    expect(values.slice(2)).toEqual(['—', '—']);
    expect(within(table).getByText('--sk-color-sidebar')).toBeInTheDocument();
    expect(within(table).getByText('--sk-color-sidebar').closest('tr')).toHaveTextContent(skTokens.color.light.sidebar);
    expect(requested).toHaveLength(0);
  });

});

describe('Feature flags', () => {
  it('follows the design with filter chips and an empty flag table, and no toggles', () => {
    show('admin/flags');
    const chips = within(screen.getByRole('group', { name: 'Filter flags' })).getAllByRole('button');
    expect(chips.map(chip => chip.textContent)).toEqual(['All', 'AI & safety', 'Product', 'On hold']);
    const table = screen.getByRole('table', { name: 'Feature flags' });
    expect(table).toHaveTextContent('No feature flags yet.');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'On hold' }));
    expect(table).toHaveTextContent('No flags on hold.');
    expect(screen.getByRole('button', { name: 'On hold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(document.body.textContent).not.toMatch(/ayush\.chat|kill_switch|VNR|SNIST/i);
    expect(requested).toHaveLength(0);
  });
});

describe('Organisations', () => {
  it('uses the design’s tile labels, blank until tenants are connected', () => {
    show('admin/organisations');
    const group = screen.getByRole('group', { name: 'Tenant summary' });
    expect(Array.from(group.querySelectorAll('dt')).map(label => label.textContent)).toEqual(['Campuses live', 'Verified students', 'Expired, read-only', 'Data deleted on expiry']);
    group.querySelectorAll('.sk-stat__value').forEach(value => expect(value).toHaveTextContent('—'));
  });
});

describe('Billing ledger', () => {
  it('follows the design: five tiles, filter chips and the ledger columns, with no invented money', () => {
    show('admin/ledger');
    const group = screen.getByRole('group', { name: 'Billing summary' });
    expect(Array.from(group.querySelectorAll('dt')).map(label => label.textContent)).toEqual(['Revenue · this month', 'Campus contracts', 'Plans', 'Payouts due', 'Refunds']);
    group.querySelectorAll('.sk-stat__value').forEach(value => expect(value).toHaveTextContent('—'));
    const table = screen.getByRole('table', { name: 'Ledger entries' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Ref', 'Date', 'What', 'Party', 'Amount', 'Status']);
    expect(document.body.textContent).not.toMatch(/₹\s?\d/);
    expect(requested).toHaveLength(0);
  });

  it('filters by kind, with an empty state for each', () => {
    show('admin/ledger');
    const chips = within(screen.getByRole('group', { name: 'Filter ledger entries' })).getAllByRole('button');
    expect(chips.map(chip => chip.textContent)).toEqual(['All', 'Campus', 'Plans', 'Commission', 'Payouts', 'Refunds']);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No ledger entries yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Payouts' }));
    expect(screen.getByRole('button', { name: 'Payouts' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No payouts yet.')).toBeInTheDocument();
  });

  it('has no payout action, and export is disabled until there is something to export', () => {
    show('admin/ledger');
    expect(screen.queryByRole('button', { name: /run payouts/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Export for accounts' })).toBeDisabled();
  });

  it('reads the plan prices in force from the billing catalogue, not from the screen', async () => {
    apiAnswers['/billing/plans'] = () => Promise.resolve({ checkoutAvailable: false, publicKey: '', plans: [{ id: 'STUDENT_PLUS', name: 'Student Plus', price: 149, period: 'per month', audience: 'student', benefits: [], description: '' }] });
    show('admin/ledger');
    expect(await screen.findByText('Plan prices in force, from the billing catalogue: Student Plus ₹149 per month')).toBeInTheDocument();
    expect(apiRequested).toContain('/billing/plans');
  });
});
