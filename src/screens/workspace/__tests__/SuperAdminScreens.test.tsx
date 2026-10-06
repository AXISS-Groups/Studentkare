import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AuditEvent, LiveCatalogItem, OpsFeed } from '../../../data/workflowTypes';
import { canAccessRoute, isRoutePath, routePaths, RoutePath } from '../../../lib/workflowRouting';

interface Resource { data: unknown; loading: boolean; error: string; reload: () => void }

const resources: Record<string, Resource> = {};
const requested: string[] = [];
// apiRequest answers, keyed by request path. Screens on the MVVM pattern load through a repository, so
// their requests are scripted here rather than through useApiResource.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequested: string[] = [];
const navigate = vi.fn();

vi.mock('../../../hooks/useApiResource', () => ({
  useApiResource: (path: string) => { requested.push(path); return resources[path] ?? { data: null, loading: true, error: '', reload: vi.fn() }; },
}));
// A path with no scripted answer never settles, so legacy panels that call the API directly stay loading;
// the screen is what is under test.
vi.mock('../../../data/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/http')>()),
  apiRequest: (path: string) => { apiRequested.push(path); return apiAnswers[path]?.() ?? new Promise(() => undefined); },
}));
vi.mock('../../../theme/theme', async () => {
  const { lightTokens } = await import('../../../theme/tokens/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, tokens: lightTokens, setTheme: vi.fn(), toggleTheme: vi.fn() }) };
});
vi.mock('../../../lib/workflowRouting', async importOriginal => ({ ...(await importOriginal<typeof import('../../../lib/workflowRouting')>()), navigate: (path: string) => navigate(path) }));

import { superAdminScreen } from '../admin/SuperAdminScreens';
import { skTokens } from '../../../theme/tokens/generated/skTokens';


const show = (route: RoutePath) => {
  const element = superAdminScreen(route);
  if (!element) throw new Error(`No screen for ${route}`);
  return render(<Suspense fallback={<p>Loading…</p>}>{element}</Suspense>);
};

const ADMIN_ROUTES = routePaths.filter(route => route === 'admin' || route.startsWith('admin/'));
const NOT_CONNECTED: RoutePath[] = ['admin/sentinel', 'admin/verification', 'admin/rule-l', 'admin/checkins', 'admin/erasure'];
const READ_ONLY: RoutePath[] = ['admin/consent-policy', 'admin/handover'];

beforeEach(() => {
  Object.keys(resources).forEach(key => delete resources[key]);
  requested.length = 0;
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequested.length = 0;
  navigate.mockReset();
});

describe('routes', () => {
  it('gives every admin route a canonical screen, reachable only by a super admin', () => {
    expect(ADMIN_ROUTES.length).toBe(34);
    ADMIN_ROUTES.forEach(route => {
      expect(isRoutePath(route)).toBe(true);
      expect(superAdminScreen(route), route).not.toBeNull();
      expect(canAccessRoute(route, 'SUPER_ADMIN')).toBe(true);
      (['STUDENT', 'CAMPUS_ADMIN', 'VENDOR', 'NMC_DOCTOR'] as const).forEach(role => expect(canAccessRoute(route, role)).toBe(false));
    });
  });

  it('leaves non-admin routes to the member workspace', () => {
    (['health', 'profile', 'support', 'billing'] as RoutePath[]).forEach(route => expect(superAdminScreen(route)).toBeNull());
  });

  it('never shows a "not available yet" page', () => {
    ADMIN_ROUTES.filter(route => route !== 'admin').forEach(route => {
      const { unmount } = show(route);
      expect(document.body.textContent, route).not.toMatch(/not available yet|awaiting design review|coming soon/i);
      unmount();
    });
  });
});

describe('tabbed screens', () => {
  it.each(['admin/ops', 'admin/activity', 'admin/support', 'admin/requests'] as RoutePath[])('%s opens Operations & SOS with no tab strip', route => {
    show(route);
    expect(screen.getByRole('heading', { level: 2, name: 'Operations & SOS' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it.each([
    ['admin/organisations', 'Organisations', 'Tenants'],
    ['admin/billing', 'Organisations', 'Inquiries & contracts'],
    ['admin/partners', 'Partner applications', 'Applications'],
    ['admin/preventive', 'Partner applications', 'Providers & preventive care'],
  ] as [RoutePath, string, string][])('%s opens %s on the %s tab', (route, title, tab) => {
    show(route);
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
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
    (['admin/activity', 'admin/support', 'admin/requests', 'admin/billing', 'admin/accounts', 'admin/catalog'] as RoutePath[]).forEach(route => {
      const { container, unmount } = show(route);
      expect(container.querySelector('.sk-admin-legacy'), route).not.toBeNull();
      unmount();
    });
  });
});

describe('screens with no data source', () => {
  it.each(NOT_CONNECTED)('%s shows the designed columns and an intentional empty state', route => {
    show(route);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(4);
    expect(table).toHaveTextContent(/No .+ yet\./);
    expect(table).toHaveTextContent('once the data source is connected');
    expect((table.querySelector('tbody') as HTMLElement).textContent).not.toMatch(/\d/);
    expect(requested).toHaveLength(0);
  });

  it('keeps the tenants and applications tabs empty rather than inventing rows', () => {
    show('admin/organisations');
    expect(screen.getByRole('table')).toHaveTextContent('No tenants yet.');
  });

  it('does not show the sentinel’s hard-coded compliance result', () => {
    show('admin/sentinel');
    expect(document.body.textContent).not.toMatch(/passed|compliant/i);
  });

  it('builds the surveillance map as the design’s cluster table, with no clusters or locations', () => {
    show('admin/surveillance');
    const table = screen.getByRole('table', { name: 'Surveillance clusters' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Cluster', 'Campuses', 'Signal', 'Cohort', 'State']);
    expect(table).toHaveTextContent('No surveillance sources connected.');
    expect(screen.getByText(/never tells one campus about another’s numbers, and mental health signals are excluded entirely/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(requested).toHaveLength(0);
  });
});

describe('design summary tiles', () => {
  it('shows the design’s tiles with unknown values as “—”, never 0', () => {
    (['admin/sentinel', 'admin/verification', 'admin/rule-l', 'admin/checkins', 'admin/surveillance', 'admin/consent-policy', 'admin/handover'] as RoutePath[]).forEach(route => {
      const { unmount } = show(route);
      const tiles = within(screen.getByRole('group', { name: /summary$/ })).getAllByRole('article');
      expect(tiles.length, route).toBeGreaterThanOrEqual(4);
      tiles.forEach(tile => {
        expect(within(tile).getByText('—')).toBeInTheDocument();
        expect(tile).toHaveTextContent('Not reported');
        expect(tile.querySelector('strong')?.textContent).not.toBe('0');
      });
      unmount();
    });
  });

  it('fills the one Operations tile it has data for, and shows open events in the header', async () => {
    apiAnswers['/ops/feed?domain=SAFETY&limit=25'] = () => Promise.resolve({ items: [], total: 0, critical: 0, scope: 'all' });
    apiAnswers['/ops/feed/counts'] = () => Promise.resolve({ domains: { SAFETY: 2 } });
    show('admin/ops');
    expect(await screen.findByText('2 open safety events')).toBeInTheDocument();
    const tiles = within(screen.getByRole('group', { name: 'Operations summary' })).getAllByRole('article');
    expect(tiles[0]).toHaveTextContent('2');
    expect(tiles[1]).toHaveTextContent('Not reported');
    expect(screen.getByText('2 open safety events')).toBeInTheDocument();
  });

  it('shows no header status when nothing is open', async () => {
    apiAnswers['/ops/feed?domain=SAFETY&limit=25'] = () => Promise.resolve({ items: [], total: 0, critical: 0, scope: 'all' });
    apiAnswers['/ops/feed/counts'] = () => Promise.resolve({ domains: {} });
    show('admin/ops');
    expect(await screen.findByRole('group', { name: 'Operations summary' })).toBeInTheDocument();
    expect(screen.queryByText(/open safety event/)).toBeNull();
  });
});

describe('real data on the older screens', () => {
  it('shows Accounts & roles: real counts per role, app access from each role’s home, and the account list', async () => {
    [['STUDENT', 900], ['NMC_DOCTOR', 40], ['VENDOR', 12], ['CAMPUS_ADMIN', 6], ['SUPER_ADMIN', 2]].forEach(([role, total]) => { apiAnswers[`/ops/accounts?limit=1&role=${role}`] = () => Promise.resolve({ items: [], total }); });
    show('admin/accounts');
    expect(screen.getByRole('heading', { level: 2, name: 'Accounts & roles' })).toBeInTheDocument();
    const tiles = within(await screen.findByRole('group', { name: 'Accounts summary' })).getAllByRole('article');
    expect(tiles[0]).toHaveTextContent('960');
    expect(tiles[1]).toHaveTextContent('5');
    expect(tiles[2]).toHaveTextContent('Not reported');
    expect(tiles[3]).toHaveTextContent('Break-glass · 30 days');
    expect(tiles[3]).toHaveTextContent('Not reported');
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['By role', 'Pending grants', 'Recently changed']);
    expect(screen.getByRole('tab', { name: 'By role' })).toHaveAttribute('aria-selected', 'true');
    const table = screen.getByRole('table', { name: 'Accounts by role' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Role', 'Accounts', 'Clinical access', 'App access']);
    const studentRow = within(table).getByText('STUDENT').closest('tr') as HTMLElement;
    const adminRow = within(table).getByText('SUPER_ADMIN').closest('tr') as HTMLElement;
    expect(studentRow).toHaveTextContent('900');
    expect(adminRow).toHaveTextContent('2');
    // App access is the workspace each role is sent to after sign-in.
    expect(studentRow.querySelectorAll('td')[3]).toHaveTextContent('Student portal');
    expect(adminRow.querySelectorAll('td')[3]).toHaveTextContent('Platform administration');
    // Clinical data comes from the app's permission table (src/core/auth/rbac.ts).
    expect(studentRow).toHaveTextContent('Own record only');
    expect(within(table).getByText('NMC_DOCTOR').closest('tr')).toHaveTextContent('Consented records only');
    expect(within(table).getByText('VENDOR').closest('tr')).toHaveTextContent('Permission policy unavailable');
    expect(adminRow).toHaveTextContent('No clinical access');
    expect(screen.getByText(/Manage accounts/).closest('details')).not.toHaveAttribute('open');
    expect(document.body.textContent).not.toMatch(/two role models disagree|grant role|enforced in the client only|NMC register/i);
  });

  it('switches Accounts & roles between its tabs: pending grants empty, recent changes from the account feed', async () => {
    [['STUDENT', 1], ['NMC_DOCTOR', 0], ['VENDOR', 0], ['CAMPUS_ADMIN', 0], ['SUPER_ADMIN', 1]].forEach(([role, total]) => { apiAnswers[`/ops/accounts?limit=1&role=${role}`] = () => Promise.resolve({ items: [], total }); });
    const event = (id: string, kind: string, summary: string): OpsFeed['items'][number] => ({ id, kind, domain: 'ACCOUNT', severity: 'ATTENTION', actorId: 'a', actorRole: 'SUPER_ADMIN', subjectId: 's', providerId: '', resourceType: '', resourceId: '', summary, createdAt: 1_700_000_000, acknowledgedAt: null, acknowledgedBy: '' });
    apiAnswers['/ops/feed?domain=ACCOUNT&limit=200'] = () => Promise.resolve({ items: [event('1', 'STAFF_ACCOUNT_CREATED', 'Staff account created with the vendor role'), event('2', 'SUBSCRIPTION_STARTED', 'Plan started')], total: 2, critical: 0, scope: 'all' });
    show('admin/accounts');
    await screen.findByRole('tab', { name: 'Pending grants' });
    expect(apiRequested).not.toContain('/ops/feed?domain=ACCOUNT&limit=200');

    fireEvent.click(screen.getByRole('tab', { name: 'Pending grants' }));
    expect(screen.getByRole('tab', { name: 'Pending grants' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No pending access grants')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Accounts by role' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Recently changed' }));
    const table = await screen.findByRole('table', { name: 'Recently changed accounts' });
    expect(within(table).getByText('Staff account created with the vendor role')).toBeInTheDocument();
    expect(within(table).queryByText('Plan started')).toBeNull();
    expect(document.body.textContent).not.toMatch(/grant role|NMC register|18,420/i);
  });

  it('summarises the catalogue', async () => {
    const item = (id: string, kind: LiveCatalogItem['kind'], stock: number): LiveCatalogItem => ({ id, providerId: 'p', kind, name: id, brand: '', category: 'c', description: '', pack: '', pricePaise: 1, mrpPaise: 1, stock, active: true, requiresPrescription: false, preparation: '' });
    apiAnswers['/ops/catalog?limit=200'] = () => Promise.resolve({ items: [item('a', 'product', 3), item('b', 'product', 0), item('c', 'lab', 0)], total: 3 });
    const { unmount } = show('admin/catalog');
    const tiles = within(await screen.findByRole('group', { name: 'Catalogue summary' })).getAllByRole('article');
    expect(tiles.map(tile => tile.querySelector('strong')?.textContent)).toEqual(['3', '2', '1', '1']);
    unmount();
  });

  it('shows the shipped colour tokens on Token sync', () => {
    show('admin/tokens');
    const table = screen.getByRole('table', { name: 'Colour tokens' });
    expect(within(table).getByText('--sk-color-sidebar')).toBeInTheDocument();
    expect(within(table).getByText('--sk-color-sidebar').closest('tr')).toHaveTextContent(skTokens.color.light.sidebar);
    expect(requested).toHaveLength(0);
  });

  it('shows Audit Explorer’s integrity panels as not reported', async () => {
    apiAnswers['/ops/audit?limit=50&offset=0'] = () => Promise.resolve({ items: [], total: 0 });
    show('admin/audit');
    await screen.findByText('No audit activity yet.');
    ['Chain integrity', 'Signing key', 'Guardrails'].forEach(name => expect(screen.getByRole('region', { name })).toHaveTextContent('Not reported.'));
    expect(document.body.textContent).not.toMatch(/verified to tip|no break found/i);
  });
});

describe('Integrations', () => {
  it.each([
    ['admin/integrations', 'Providers'],
    ['admin/telemetry', 'Health & jobs'],
    ['admin/api-keys', 'API access & keys'],
  ] as [RoutePath, string][])('%s opens Integrations on the %s tab', (route, tab) => {
    show(route);
    expect(screen.getByRole('heading', { level: 2, name: 'Integrations' })).toBeInTheDocument();
    expect(within(screen.getByRole('tablist')).getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the provider settings and the health & jobs console', () => {
    (['admin/integrations', 'admin/telemetry'] as RoutePath[]).forEach(route => {
      const { container, unmount } = show(route);
      expect(container.querySelector('.sk-admin-legacy'), route).not.toBeNull();
      unmount();
    });
  });

  it('follows the design’s columns with an empty state and no key actions', () => {
    show('admin/api-keys');
    const table = screen.getByRole('table', { name: 'API routes' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Route', 'Used for', 'Auth', 'Key age', 'Calls · 24 h', 'Blocked']);
    expect(table).toHaveTextContent('No API routes yet.');
    expect(screen.queryByRole('button', { name: /rotate key|remove route/i })).toBeNull();
    expect(screen.queryByRole('group', { name: 'API access summary' })).toBeNull();
    expect(requested).toHaveLength(0);
  });
});

describe('Break-glass log (Tier 1)', () => {
  it('follows the design read-only: tiles, filters and columns, with no action beyond filtering', () => {
    show('admin/break-glass-log');
    expect(screen.getByRole('note')).toHaveTextContent('read-only');
    within(screen.getByRole('group', { name: 'Break-glass summary' })).getAllByRole('article').forEach(tile => expect(tile).toHaveTextContent('Not reported'));
    const table = screen.getByRole('table', { name: 'Emergency-card openings' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Audit ID', 'When', 'Campus · opened by', 'Student', 'Reason', 'Open', 'Review']);
    const chips = within(screen.getByRole('group', { name: 'Filter openings' })).getAllByRole('button');
    expect(chips.map(chip => chip.textContent)).toEqual(['All', 'Needs review', 'Pattern alerts', 'Reviewed']);
    expect(screen.getAllByRole('button')).toHaveLength(chips.length);
    expect(document.querySelector('form, input, select, textarea')).toBeNull();
    expect(screen.queryByRole('button', { name: /export|record decision/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(table).toHaveTextContent('No emergency-card openings recorded.');
    fireEvent.click(screen.getByRole('button', { name: 'Needs review' }));
    expect(table).toHaveTextContent('No openings waiting for review.');
    expect(screen.getByRole('button', { name: 'Needs review' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(requested).toHaveLength(0);
  });
});

describe('Check-in audit → Case', () => {
  it('has no View cases button: a case opens from its check-in row once check-ins exist', () => {
    show('admin/checkins');
    expect(screen.queryByRole('button', { name: 'View cases' })).toBeNull();
  });

  it('shows the case sections empty, with a way back and no case actions', () => {
    show('admin/case');
    expect(screen.getByText('No case selected.')).toBeInTheDocument();
    ['Timeline', 'Evidence', 'Outcome'].forEach(name => expect(screen.getByRole('region', { name })).toBeInTheDocument());
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['← Check-in audit']);
    fireEvent.click(screen.getByRole('button', { name: '← Check-in audit' }));
    expect(navigate).toHaveBeenCalledWith('admin/checkins');
    expect(document.body.textContent).not.toMatch(/\+91|log call|close case/i);
    expect(requested).toHaveLength(0);
  });
});

describe('Consent policy (Tier 1)', () => {
  it('uses the design’s columns and tiles, read-only, with no rule values or states', () => {
    show('admin/consent-policy');
    const table = screen.getByRole('table', { name: 'Consent policy' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Rule', 'Set to', 'Changeable by', 'State']);
    expect(table).toHaveTextContent('No consent rules reported.');
    expect(within(screen.getByRole('group', { name: 'Consent policy summary' })).getAllByRole('article').map(tile => within(tile).getByRole('heading').textContent))
      .toEqual(['Rules in force', 'Locked by statute or design', 'Open question', 'Loosened since launch']);
    expect(document.body.textContent).not.toMatch(/enforced|locked\b(?! by)|90 days|k = 5/i);
    expect(screen.queryByRole('button')).toBeNull();
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

describe('Plans & pricing → Change a plan price', () => {
  it('opens from Plans & pricing', () => {
    apiAnswers['/billing/plans'] = () => Promise.resolve({ checkoutAvailable: false, publicKey: '', plans: [] });
    show('admin/plans');
    fireEvent.click(screen.getByRole('button', { name: 'Change a price' }));
    expect(navigate).toHaveBeenCalledWith('admin/price-fix');
  });

  it('shows the three steps read-only, with current prices and no way to change them', async () => {
    apiAnswers['/billing/plans'] = () => Promise.resolve({ checkoutAvailable: false, publicKey: '', plans: [{ id: 'STUDENT_PLUS', name: 'Student Plus', price: 99, period: 'per month', audience: 'student', benefits: [], description: '' }] });
    show('admin/price-fix');
    expect(screen.getByRole('note')).toHaveTextContent('Read-only');
    ['1 · Where the price appears', '2 · Current prices', '3 · Approval'].forEach(name => expect(screen.getByRole('region', { name })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('region', { name: '2 · Current prices' })).toHaveTextContent('₹99 per month'));
    expect(document.querySelector('input, select, textarea, form')).toBeNull();
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['← Plans & pricing']);
    expect(document.body.textContent).not.toMatch(/SK-006|412 students|Checkout\.tsx/i);
  });
});

describe('Message templates', () => {
  it('follows the design’s three panes, empty, with no template actions', () => {
    show('admin/templates');
    ['Templates', 'Editor', 'Preview with sample values'].forEach(name => expect(screen.getByRole('region', { name })).toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Templates' })).toHaveTextContent('No templates yet.');
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.body.textContent).not.toMatch(/refill_due|Metformin|HbA1c|approved/i);
    expect(requested).toHaveLength(0);
  });
});

describe('Organisations', () => {
  it('uses the design’s tile labels, blank until tenants are connected', () => {
    show('admin/organisations');
    const tiles = within(screen.getByRole('group', { name: 'Tenant summary' })).getAllByRole('article');
    expect(tiles.map(tile => within(tile).getByRole('heading').textContent)).toEqual(['Campuses live', 'Verified students', 'Expired, read-only', 'Data deleted on expiry']);
    tiles.forEach(tile => expect(tile).toHaveTextContent('—'));
  });
});

describe('Billing ledger', () => {
  it('follows the design: five tiles, filter chips and the ledger columns, with no invented money', () => {
    show('admin/ledger');
    const tiles = within(screen.getByRole('group', { name: 'Billing summary' })).getAllByRole('article');
    expect(tiles.map(tile => within(tile).getByRole('heading').textContent)).toEqual(['Revenue · this month', 'Campus contracts', 'Plans', 'Payouts due', 'Refunds']);
    tiles.forEach(tile => expect(tile).toHaveTextContent('Not reported'));
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
});

describe('Tier 1 screens', () => {
  it.each(READ_ONLY)('%s is a read-only empty layout with no forms or actions', route => {
    show(route);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('read-only');
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.querySelector('form, input, select, textarea')).toBeNull();
    expect((screen.getByRole('table').querySelector('tbody') as HTMLElement).textContent).not.toMatch(/\d/);
    expect(requested).toHaveLength(0);
  });
});

describe('Audit explorer', () => {
  const event = (id: string, action: string, actorId: string, createdAt: number): AuditEvent => ({ id, action, actorId, resourceId: `res-${id}`, createdAt });
  const page = [event('a1', 'ACCOUNT_CREATED', 'actor-1', 1790000000), event('a2', 'CATALOG_UPDATED', 'actor-2', 1790086400), event('a3', 'ACCOUNT_CREATED', 'actor-2', 1790172800)];
  const FIRST_PAGE = '/ops/audit?limit=50&offset=0';

  it('lists the loaded page and filters it by search, actor and event type', async () => {
    apiAnswers[FIRST_PAGE] = () => Promise.resolve({ items: page, total: 3 });
    show('admin/audit');
    const table = await screen.findByRole('table');
    expect(apiRequested).toEqual([FIRST_PAGE]);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'ACCOUNT_CREATED' } });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Actor'), { target: { value: 'actor-2' } });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Actor'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Event type'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'res-a2' } });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
  });

  it('says the filters cover only the loaded page', async () => {
    apiAnswers[FIRST_PAGE] = () => Promise.resolve({ items: page, total: 120 });
    show('admin/audit');
    expect(await screen.findByText(/Filters apply to the 3 events on this page only, not the whole audit history\./)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3 · 120 events/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(apiRequested).toContain('/ops/audit?limit=50&offset=50');
    // The old page is cleared while the next one loads.
    expect(screen.getByText('Loading audit events…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows an event’s details when chosen', async () => {
    apiAnswers[FIRST_PAGE] = () => Promise.resolve({ items: page, total: 3 });
    show('admin/audit');
    fireEvent.click((await screen.findAllByRole('button', { name: 'Catalog updated' }))[0]);
    expect(screen.getByRole('complementary', { name: 'Event detail' })).toHaveTextContent('res-a2');
  });

  it('shows the empty and error states', async () => {
    apiAnswers[FIRST_PAGE] = () => Promise.resolve({ items: [], total: 0 });
    const { unmount } = show('admin/audit');
    expect(screen.getByText('Loading audit events…')).toBeInTheDocument();
    expect(await screen.findByText('No audit activity yet.')).toBeInTheDocument();
    unmount();
    apiRequested.length = 0;
    apiAnswers[FIRST_PAGE] = () => Promise.reject(new Error('Network error'));
    show('admin/audit');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load audit events');
    expect(alert).toHaveTextContent('Network error');
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(apiRequested).toEqual([FIRST_PAGE, FIRST_PAGE]));
  });

  it('never loads through useApiResource', async () => {
    apiAnswers[FIRST_PAGE] = () => Promise.resolve({ items: page, total: 3 });
    show('admin/audit');
    await screen.findByRole('table');
    expect(requested.filter(path => path.startsWith('/ops/audit'))).toEqual([]);
  });
});

describe('Operations & SOS safety events', () => {
  const feed: OpsFeed = {
    total: 2, critical: 1, scope: 'all',
    items: [
      { id: 'e1', kind: 'CRISIS_SIGNAL', domain: 'SAFETY', severity: 'CRITICAL', actorId: 'a1', actorRole: 'STUDENT', subjectId: 's1', providerId: '', resourceType: 'crisis_event', resourceId: 'c1', summary: 'Crisis support opened', createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '' },
      { id: 'e2', kind: 'SOS_RAISED', domain: 'SAFETY', severity: 'ATTENTION', actorId: 'a2', actorRole: 'STUDENT', subjectId: 's2', providerId: '', resourceType: 'sos', resourceId: 'x2', summary: '', createdAt: 1790000100, acknowledgedAt: 1790000200, acknowledgedBy: 'staff' },
    ],
  };

  it('lists safety events with their acknowledgement state', async () => {
    apiAnswers['/ops/feed?domain=SAFETY&limit=25'] = () => Promise.resolve(feed);
    apiAnswers['/ops/feed/counts'] = () => Promise.resolve({ domains: { SAFETY: 1 } });
    show('admin/ops');
    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Open');
    expect(rows[1]).toHaveTextContent('Acknowledged');
  });

  it('never asks for crisis events, which carry student names and the crisis kind', async () => {
    apiAnswers['/ops/feed?domain=SAFETY&limit=25'] = () => Promise.resolve(feed);
    apiAnswers['/ops/feed/counts'] = () => Promise.resolve({ domains: {} });
    show('admin/ops');
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(apiRequested).toContain('/ops/feed?domain=SAFETY&limit=25');
    expect([...requested, ...apiRequested].some(path => path.includes('crisis-events'))).toBe(false);
  });

  it('shows an empty state and a calm error', async () => {
    apiAnswers['/ops/feed?domain=SAFETY&limit=25'] = () => Promise.resolve({ items: [], total: 0, critical: 0, scope: 'all' });
    apiAnswers['/ops/feed/counts'] = () => Promise.reject(new Error('Timed out'));
    show('admin/ops');
    expect(await screen.findByText('No safety events yet.')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load safety counts');
  });
});

describe('Plans & pricing', () => {
  it('shows the published plans from /billing/plans', async () => {
    apiAnswers['/billing/plans'] = () => Promise.resolve({ checkoutAvailable: false, publicKey: '', plans: [{ id: 'STUDENT_PLUS', name: 'Student Plus', price: 99, period: 'per month', audience: 'student', benefits: ['Priority support'], description: 'Monthly optional benefits pass.' }] });
    show('admin/plans');
    expect((await screen.findByRole('heading', { name: 'Student Plus' })).closest('article')).toHaveTextContent('₹99');
    expect(screen.getByRole('heading', { name: 'Student Plus' }).closest('article')).toHaveTextContent('Published');
    expect(screen.getByRole('region', { name: 'Where prices appear' })).toHaveTextContent('No surface checks reported.');
    expect(screen.getByRole('region', { name: 'Change history' })).toHaveTextContent('No price changes recorded.');
    expect(screen.queryByRole('button', { name: /new plan|edit plan|point all surfaces|open the fix/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/mismatch|SK-006|hard-coded/i);
  });
});

describe('AI governance', () => {
  const QUALITY = '/ops/agents/ayush/quality';
  const usage = { turns: 120, groundedRate: 0.82, answerRate: 0.64, refusalBreakdown: { ANSWERED: 77, CRISIS: 3 }, avgLatencyMs: 842.4, avgTopScore: 0.41 };

  it('shows usage from real data and empty Policies, Models and Approvals sections', async () => {
    apiAnswers[QUALITY] = () => Promise.resolve(usage);
    show('admin/ai-governance');
    expect(screen.getByText('Loading Agent Ayush usage…')).toBeInTheDocument();
    expect((await screen.findByRole('heading', { name: 'Grounded rate' })).closest('article')).toHaveTextContent('82%');
    expect(apiRequested).toEqual([QUALITY]);
    expect(screen.getByRole('heading', { name: 'Average latency' }).closest('article')).toHaveTextContent('842 ms');
    const outcomes = screen.getByRole('region', { name: 'Where the pipeline stops' });
    expect(within(outcomes).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Answered77', 'Routed to crisis support3']);
    ['Policies', 'Models', 'Approvals'].forEach(name => expect(screen.getByRole('region', { name })).toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Models' })).toHaveTextContent('No model register connected.');
  });

  it('shows an empty usage state, not 0% rates, when no turns are recorded', async () => {
    apiAnswers[QUALITY] = () => Promise.resolve({ turns: 0, groundedRate: 0, answerRate: 0, refusalBreakdown: {}, avgLatencyMs: 0, avgTopScore: 0 });
    show('admin/ai-governance');
    expect(await screen.findByText('No AI usage recorded yet.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/0%/);
  });

  it('shows the error with its message, and Retry requests the usage again', async () => {
    apiAnswers[QUALITY] = () => Promise.reject(new Error('Network error'));
    show('admin/ai-governance');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load AI usage');
    expect(alert).toHaveTextContent('Network error');
    apiAnswers[QUALITY] = () => Promise.resolve(usage);
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Grounded rate' })).toBeInTheDocument();
    expect(apiRequested).toEqual([QUALITY, QUALITY]);
    expect(requested).not.toContain(QUALITY);
  });
});
