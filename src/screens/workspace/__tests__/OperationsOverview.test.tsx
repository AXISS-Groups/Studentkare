import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AuditEvent, IntegrationCheck, IntegrationHealth, OpsFeed, OpsFeedEvent, OpsSummary } from '../../../data/workflowTypes';

// Behaviour of the Super Admin Overview (/admin). Only the HTTP layer is mocked, keyed by
// request path, so these tests hold for any implementation of the screen. A path with no
// scripted answer never settles, so its part of the page stays loading.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => apiAnswers[path]?.() ?? new Promise(() => undefined));
const navigate = vi.fn();

vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('../../../lib/workflowRouting', async importOriginal => ({ ...(await importOriginal<typeof import('../../../lib/workflowRouting')>()), navigate: (path: string) => navigate(path) }));
vi.mock('../../../theme/theme', async () => {
  const { lightTokens } = await import('../../../theme/tokens/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, tokens: lightTokens, setTheme: vi.fn(), toggleTheme: vi.fn() }) };
});

import { superAdminScreen } from '../admin/SuperAdminScreens';

const SUMMARY = '/ops/summary';
const AUDIT = '/ops/audit?limit=1&offset=0';
const HEALTH = '/ops/integration-health';
const FEED = '/ops/feed?limit=5';
const COUNTS = '/ops/feed/counts';
const STUDENTS = '/ops/accounts?limit=1&role=STUDENT';
const CLINICIANS = '/ops/accounts?limit=1&role=NMC_DOCTOR';
const PARTNERS = '/ops/accounts?limit=1&role=VENDOR';
const PLANS = '/billing/plans';
const ALL = [SUMMARY, AUDIT, HEALTH, FEED, COUNTS, STUDENTS, CLINICIANS, PARTNERS, PLANS];

const summary: OpsSummary = { accounts: 1240, catalogItems: 58, orderRequests: 312, openSupport: 4, statuses: { REQUESTED: 12 } };
const audit: AuditEvent[] = [{ id: 'a1', actorId: 'actor-1', action: 'ACCOUNT_CREATED', resourceId: 'acct-9', createdAt: 1790000000 }];
const event = (id: string, kind: string, domain: string, severity: OpsFeedEvent['severity'], summaryText: string): OpsFeedEvent => ({ id, kind, domain, severity, actorId: 'a', actorRole: 'SUPER_ADMIN', subjectId: '', providerId: '', resourceType: 'x', resourceId: id, summary: summaryText, createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '' });
const feed: OpsFeed = { items: [event('e1', 'STAFF_ACCOUNT_CREATED', 'ACCOUNT', 'INFO', 'Role: clinician'), event('e2', 'SOS_RAISED', 'SAFETY', 'CRITICAL', '1 open')], total: 2, critical: 1, scope: 'all' };
const check = (name: string, configured: boolean, status: IntegrationCheck['status']): IntegrationCheck => ({ name, configured, reachable: status === 'online' ? true : status === 'degraded' ? false : null, status, detail: configured ? 'configured' : 'not configured', checked_at: 1790000000 });
const health = (checks: IntegrationCheck[]): IntegrationHealth => ({ summary: { checked_at: 1790000000, interval_seconds: 300, checks, overall: checks.every(item => item.status === 'online') ? 'operational' : 'degraded' } });

const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const fail = (path: string, message: string) => { apiAnswers[path] = () => Promise.reject(new Error(message)); };
const hang = (path: string) => { delete apiAnswers[path]; };
const callsTo = (path: string) => apiRequest.mock.calls.filter(([requested]) => requested === path).length;

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
  navigate.mockReset();
  answer(SUMMARY, summary);
  answer(AUDIT, { items: audit, total: 1204 });
  answer(HEALTH, health([check('messaging_openwa', true, 'online')]));
  answer(FEED, feed);
  answer(COUNTS, { domains: { SAFETY: 2 } });
  answer(STUDENTS, { total: 980 });
  answer(CLINICIANS, { total: 14 });
  answer(PARTNERS, { total: 9 });
  answer(PLANS, { plans: [{ id: 'p1' }, { id: 'p2' }], checkoutAvailable: false, publicKey: '' });
});

const show = () => {
  const element = superAdminScreen('admin');
  if (!element) throw new Error('No screen for admin');
  return render(element);
};
/** Renders and waits until every part with an answer has settled. */
const showSettled = async () => {
  const view = show();
  await screen.findByRole('heading', { name: 'Platform operations' });
  await waitFor(() => expect(document.querySelectorAll('.sk-ops-section-loading, [role="status"]')).toHaveLength(0));
  await waitFor(() => expect(Array.from(document.querySelectorAll('.sk-ops-metric strong')).some(node => node.textContent === '…')).toBe(false));
  await waitFor(() => expect(document.body.textContent).not.toMatch(/Checking…|checking services…/));
  return view;
};
const group = (name: string) => screen.getByRole('region', { name });
const cards = (name: string) => within(group(name)).getAllByRole('button');

describe('requests', () => {
  it('asks for each of its nine sources exactly once, with the same paths as before', async () => {
    await showSettled();
    ALL.forEach(path => expect(callsTo(path), path).toBe(1));
    expect(apiRequest.mock.calls.map(([path]) => path).sort()).toEqual([...ALL].sort());
  });
});

describe('layout: a platform command center', () => {
  it('keeps the Platform operations heading with real counts and the services line', async () => {
    await showSettled();
    const subtitle = screen.getByRole('heading', { name: 'Platform operations' }).nextElementSibling as HTMLElement;
    expect(subtitle).toHaveTextContent('1,240 accounts · 58 catalogue entries · 312 orders · 4 open support · all configured services online');
  });

  it('leads with campuses, students and clinicians, then the care ecosystem', async () => {
    const { container } = await showSettled();
    const headings = Array.from(container.querySelectorAll('h3')).map(heading => heading.textContent);
    expect(headings).toEqual(['Campus network', 'Care ecosystem', 'Recent activity', 'Platform status', 'Security & governance']);
    expect(cards('Campus network').map(card => card.querySelector('.sk-ops-metric-label')?.textContent)).toEqual(['Campuses', 'Student accounts', 'Clinician accounts']);
    expect(cards('Care ecosystem').map(card => card.querySelector('.sk-ops-metric-label')?.textContent)).toEqual(['Partner accounts', 'Published plans', 'Catalogue entries']);
  });

  it('shows the real counts the frontend already loads', async () => {
    await showSettled();
    const values = [...cards('Campus network'), ...cards('Care ecosystem')].map(card => card.querySelector('strong')?.textContent);
    expect(values).toEqual(['—', '980', '14', '9', '2', '58']);
  });

  it('leaves campuses blank — never 0 — because nothing reports them', async () => {
    await showSettled();
    const [campuses] = cards('Campus network');
    expect(campuses).toHaveTextContent('Not reported · no data source yet');
    expect(campuses).toHaveClass('is-blank');
    expect(campuses.textContent).not.toMatch(/\b0\b/);
  });

  it('does not call clinician accounts verified, or plans subscriptions', async () => {
    await showSettled();
    expect(group('Campus network').textContent).not.toMatch(/verified clinicians|activated seats/i);
    expect(cards('Care ecosystem')[1]).toHaveTextContent('Subscriptions aren’t reported');
  });

  it('shows a blank, not a zero, when a count fails, and … while one is still loading', async () => {
    fail(STUDENTS, 'Network error');
    hang(CLINICIANS);
    show();
    await waitFor(() => expect(cards('Campus network')[1]).toHaveTextContent('Couldn’t load this figure'));
    const [, students, clinicians] = cards('Campus network');
    expect(students.querySelector('strong')?.textContent).toBe('—');
    expect(students).toHaveClass('is-blank');
    expect(clinicians.querySelector('strong')?.textContent).toBe('…');
    expect(clinicians).toHaveTextContent('Loading…');
    expect(clinicians).toHaveAccessibleName('Clinician accounts: loading. Open Clinician verification');
  });
});

describe('recent activity', () => {
  it('lists the latest platform events with their area', async () => {
    await showSettled();
    const rows = within(group('Recent activity')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Staff account created');
    expect(rows[0]).toHaveTextContent('Account');
    expect(rows[0].querySelector('.sk-ops-dot')).toHaveClass('sk-ops-tone-info');
    expect(rows[1]).toHaveTextContent('Safety');
    expect(rows[1].querySelector('.sk-ops-dot')).toHaveClass('sk-ops-tone-danger');
  });

  it('is blank when nothing has happened', async () => {
    answer(FEED, { items: [], total: 0, critical: 0, scope: 'all' });
    await showSettled();
    expect(group('Recent activity')).toHaveTextContent('No recent platform activity');
    expect(group('Recent activity')).toHaveTextContent('Platform events will appear here as they happen.');
  });

  it('shows its own error and keeps the rest of the page; Try again reloads the feed', async () => {
    fail(FEED, 'Network error');
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load recent activity');
    expect(alert).toHaveTextContent('Network error');
    expect(cards('Campus network')).toHaveLength(3);
    answer(FEED, feed);
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(within(group('Recent activity')).getAllByRole('listitem')).toHaveLength(2));
    expect(callsTo(FEED)).toBe(2);
    expect(callsTo(SUMMARY)).toBe(1);
  });
});

describe('platform status', () => {
  it('summarises the ledger, integrations, operations and crisis gate from real data', async () => {
    await showSettled();
    const rows = within(group('Platform status')).getAllByRole('button');
    expect(rows.map(row => row.textContent)).toEqual(['Audit ledger1,204 events recorded', 'IntegrationsAll configured services online', 'Operations & SOS2 open safety events', 'Crisis gateNot reported']);
    expect(rows.map(row => row.querySelector('.sk-ops-status-value')?.className)).toEqual([
      'sk-ops-status-value sk-ops-tone-positive', 'sk-ops-status-value sk-ops-tone-positive', 'sk-ops-status-value sk-ops-tone-danger', 'sk-ops-status-value sk-ops-tone-neutral',
    ]);
  });

  it('says “No open safety events” and degraded services with their tones', async () => {
    answer(COUNTS, { domains: {} });
    answer(HEALTH, health([check('a', true, 'online'), check('b', true, 'degraded')]));
    await showSettled();
    const status = group('Platform status');
    expect(within(status).getByRole('button', { name: /operations/i })).toHaveTextContent('No open safety events');
    expect(within(status).getByRole('button', { name: /operations/i }).querySelector('.sk-ops-status-value')).toHaveClass('sk-ops-tone-positive');
    expect(within(status).getByRole('button', { name: /integrations/i })).toHaveTextContent('1 service degraded');
    expect(within(status).getByRole('button', { name: /integrations/i }).querySelector('.sk-ops-status-value')).toHaveClass('sk-ops-tone-attention');
  });

  it('says “Checking…” while a check loads', async () => {
    hang(AUDIT);
    hang(HEALTH);
    hang(COUNTS);
    show();
    const status = await screen.findByRole('region', { name: 'Platform status' });
    ['audit ledger', 'integrations', 'operations'].forEach(name => {
      const row = within(status).getByRole('button', { name: new RegExp(name, 'i') });
      expect(row).toHaveTextContent('Checking…');
      expect(row.querySelector('.sk-ops-status-value')).toHaveClass('sk-ops-tone-neutral');
    });
    expect(screen.getByRole('heading', { name: 'Platform operations' }).nextElementSibling).toHaveTextContent('checking services…');
  });

  it('says a check failed, rather than guessing, when a request errors', async () => {
    fail(AUDIT, 'Timed out');
    fail(HEALTH, 'Timed out');
    fail(COUNTS, 'Timed out');
    show();
    const status = await screen.findByRole('region', { name: 'Platform status' });
    await waitFor(() => expect(within(status).getByRole('button', { name: /audit ledger/i })).toHaveTextContent('Couldn’t check'));
    expect(within(status).getByRole('button', { name: /integrations/i })).toHaveTextContent('Couldn’t check');
    expect(within(status).getByRole('button', { name: /operations/i })).toHaveTextContent('Couldn’t check');
    expect(within(status).getByRole('button', { name: /operations/i }).querySelector('.sk-ops-status-value')).toHaveClass('sk-ops-tone-attention');
    // Not reported stays not reported; it is never shown as healthy or as an error.
    expect(within(status).getByRole('button', { name: /crisis gate/i })).toHaveTextContent('Not reported');
    expect(screen.getByRole('heading', { name: 'Platform operations' }).nextElementSibling).toHaveTextContent('service status unavailable');
  });
});

describe('security & governance', () => {
  it('summarises break-glass with a link to its log, and no request form', async () => {
    await showSettled();
    const panel = group('Security & governance');
    expect(within(panel).getByLabelText('Break-glass events: not reported')).toHaveTextContent('—');
    expect(within(panel).queryByRole('textbox')).toBeNull();
    expect(within(panel).queryByRole('combobox')).toBeNull();
    expect(panel.textContent).not.toMatch(/request authorised|justification|dual approver|max 4h/i);
  });

  it('lists the guardrails with blank values, never zeros', async () => {
    await showSettled();
    const rows = within(group('Security & governance')).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    rows.forEach(row => expect(row.querySelector('strong')?.textContent).toBe('—'));
  });
});

describe('no sample data, claims or development controls', () => {
  it('shows no design sample values, compliance claims or state switcher', async () => {
    await showSettled();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/compliant|all services nominal|audit ledger writing|append-only|sample data|4,940|3 tenants|VNR|VJIET|SNIST|Sreenidhi|Organisations/i);
    ['Preview', 'Data', 'Loading', 'Empty', 'Error'].forEach(label => expect(screen.queryByRole('button', { name: label })).toBeNull());
  });
});

describe('links to the canonical screens', () => {
  it('opens the matching screen from each card, status row and link', async () => {
    await showSettled();
    const expected: [RegExp, string][] = [
      [/^Campuses: not reported/, 'admin/organisations'],
      [/^Student accounts: 980/, 'admin/accounts'],
      [/^Clinician accounts: 14/, 'admin/verification'],
      [/^Partner accounts: 9/, 'admin/partners'],
      [/^Published plans: 2/, 'admin/plans'],
      [/^Catalogue entries: 58/, 'admin/catalog'],
      [/^All activity$/, 'admin/activity'],
      [/^Audit explorer$/, 'admin/audit'],
      [/^Audit ledger/, 'admin/audit'],
      [/^Integrations/, 'admin/integrations'],
      [/^Operations & SOS/, 'admin/ops'],
      [/^Crisis gate/, 'admin/ops'],
      [/^View Rule L firewall$/, 'admin/rule-l'],
      [/^View break-glass log$/, 'admin/break-glass-log'],
    ];
    expected.forEach(([name, route]) => {
      navigate.mockReset();
      fireEvent.click(screen.getByRole('button', { name }));
      expect(navigate).toHaveBeenCalledWith(route);
    });
  });

  it('navigates from a card arrow, because the arrow is part of the card link', async () => {
    await showSettled();
    cards('Care ecosystem').forEach(card => {
      navigate.mockReset();
      fireEvent.click(card.querySelector('svg') as SVGElement);
      expect(navigate).toHaveBeenCalledTimes(1);
    });
  });
});

describe('loading and page error', () => {
  it('shows a skeleton while the summary loads', () => {
    hang(SUMMARY);
    const { container } = show();
    expect(screen.getByRole('status')).toHaveTextContent(/loading platform operations/i);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Platform operations' })).toBeNull();
  });

  it('shows a calm page error and Try again asks for every source again', async () => {
    fail(SUMMARY, 'Super-admin access is required.');
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load platform operations');
    expect(alert).toHaveTextContent('Super-admin access is required.');
    answer(SUMMARY, summary);
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Platform operations' })).toBeInTheDocument();
    ALL.forEach(path => expect(callsTo(path), path).toBe(2));
  });
});

describe('lifecycle', () => {
  it('cancels every request in flight when the screen goes, and changes nothing afterwards', async () => {
    const settlers: ((value: unknown) => void)[] = [];
    ALL.forEach(path => { apiAnswers[path] = () => new Promise(resolve => { settlers.push(resolve); }); });
    const consoleError = vi.spyOn(console, 'error');
    const { unmount } = show();
    const signals = apiRequest.mock.calls.map(([, init]) => init?.signal);
    expect(signals).toHaveLength(ALL.length);
    expect(signals.every(signal => signal && !signal.aborted)).toBe(true);
    unmount();
    expect(signals.every(signal => signal?.aborted)).toBe(true);
    settlers.forEach(settle => settle(summary));
    await Promise.resolve();
    await Promise.resolve();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('accessibility', () => {
  it('names every control and hides every decorative icon', async () => {
    const { container } = await showSettled();
    screen.getAllByRole('button').forEach(button => expect(button).toHaveAccessibleName());
    container.querySelectorAll('svg').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});
