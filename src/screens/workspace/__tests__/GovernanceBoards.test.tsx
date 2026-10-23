import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AuditEvent, IntegrationCheck, IntegrationHealth, OpsSummary } from '../../../data/types/workflowTypes';
import type { RoutePath } from '../../../lib/utils/workflowRouting';
import type { RuleLStatus, SettingView, SosAlertRow } from '../../../features/admin/model/governanceTypes';

/**
 * The super admin governance, safety and money boards (WP-17, Tier 1). Only the HTTP
 * layer is mocked, keyed by request path; a path with no scripted answer never settles.
 * What these prove: each board shows what the server reports and nothing else, fails
 * closed (an error is never a zero or an empty "all clear"), offers no control it cannot
 * honour, and keeps every safety element reachable by keyboard and screen reader.
 */
const apiAnswers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => apiAnswers[path]?.(init) ?? new Promise(() => undefined));
const navigate = vi.fn();

vi.mock('../../../data/services/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/services/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('../../../hooks/api/useApiResource', () => ({ useApiResource: () => ({ data: null, loading: true, error: '', reload: vi.fn() }) }));
vi.mock('../../../lib/utils/workflowRouting', async importOriginal => ({ ...(await importOriginal<typeof import('../../../lib/utils/workflowRouting')>()), navigate: (path: string) => navigate(path) }));
vi.mock('../../../theme/tokens/theme', async () => {
  const { lightTokens } = await import('../../../theme/tokens/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, tokens: lightTokens, setTheme: vi.fn(), toggleTheme: vi.fn() }) };
});

import { superAdminScreen } from '../admin/SuperAdminScreens';

const NOW = Date.now() / 1000;
const DAY = 86400;
const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const fail = (path: string, message = 'Network error') => { apiAnswers[path] = () => Promise.reject(new Error(message)); };
const callsTo = (path: string) => apiRequest.mock.calls.filter(([requested]) => requested === path).length;
const show = (route: RoutePath) => {
  const element = superAdminScreen(route);
  if (!element) throw new Error(`No screen for ${route}`);
  return render(<Suspense fallback={<p>Loading…</p>}>{element}</Suspense>);
};
const figure = (label: string) => {
  const term = screen.getAllByText(label).find(node => node.tagName === 'DT');
  if (!term) throw new Error(`No figure ${label}`);
  return term.parentElement as HTMLElement;
};

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
  navigate.mockReset();
});

// ── Operations & SOS (safety) ────────────────────────────────────────────────
const SOS = '/ops/sos?open=false';
const sos = (id: string, status: string, ageMinutes: number, extra: Partial<SosAlertRow> = {}): SosAlertRow & Record<string, unknown> => ({
  id, status, campus: 'VNR VJIET', createdAt: NOW - ageMinutes * 60, acknowledgedAt: null, resolvedAt: null, cancelledAt: null,
  deliveries: [{ status: 'SENT' }, { status: 'SENT' }, { status: 'SKIPPED' }],
  // What the endpoint also returns, and the board must never show.
  student: { name: 'Priya Natarajan', contact: '+919876543210', hostel: 'Block B 204' }, locationNote: 'fainted near the lab', resolutionNote: 'asthma attack',
  ...extra,
});

describe('Operations & SOS (AdminOps)', () => {
  beforeEach(() => {
    answer('/ops/feed?domain=SAFETY&limit=25', { items: [], total: 0, critical: 0, scope: 'all' });
    answer('/ops/feed/counts', { domains: {} });
  });

  it('lists every campus’s SOS, live ones first, with the live count in the header', async () => {
    answer(SOS, { items: [sos('aaaaaa01', 'RESOLVED', 5), sos('bbbbbb02', 'ACTIVE', 30), sos('cccccc03', 'ACKNOWLEDGED', 2, { acknowledgedAt: NOW - 60 }), sos('dddddd04', 'ACTIVE', 1)] });
    show('admin/ops');
    const table = await screen.findByRole('table', { name: 'SOS alerts, live first' });
    const rows = within(table).getAllByRole('row').slice(1).map(row => row.textContent ?? '');
    expect(rows[0]).toMatch(/SOS-DDDDDD.*Live/);
    expect(rows[1]).toMatch(/SOS-BBBBBB.*Live/);
    expect(rows[2]).toMatch(/SOS-CCCCCC.*campus acknowledged.*Acknowledged/);
    expect(rows[3]).toMatch(/SOS-AAAAAA.*Resolved/);
    // Live is raised and not yet acknowledged; the acknowledged one still sorts with the open ones.
    expect(screen.getByText('2 SOS live')).toBeInTheDocument();
    expect(within(figure('SOS live now')).getByText('2')).toBeInTheDocument();
    expect(rows[0]).toContain('2 notified');
  });

  it('never shows the student, their contact, where they are in the hostel or their condition', async () => {
    answer(SOS, { items: [sos('aaaaaa01', 'ACTIVE', 1), sos('bbbbbb02', 'RESOLVED', 60)] });
    show('admin/ops');
    await screen.findByRole('table', { name: 'SOS alerts, live first' });
    expect(document.body.textContent).not.toMatch(/Priya|9876543210|Block B 204|fainted|asthma/);
    expect(callsTo('/ops/crisis-events')).toBe(0);
  });

  it('never paginates a live SOS away', async () => {
    answer(SOS, { items: Array.from({ length: 40 }, (_, index) => sos(`id${String(index).padStart(6, '0')}`, index % 2 ? 'ACTIVE' : 'RESOLVED', index)) });
    show('admin/ops');
    const table = await screen.findByRole('table', { name: 'SOS alerts, live first' });
    expect(within(table).getAllByRole('row')).toHaveLength(41);
    expect(screen.queryByRole('navigation', { name: /pag/i })).toBeNull();
  });

  it('fails closed: when the SOS list can’t load it says so, with no “0 live” and no “no SOS”', async () => {
    fail(SOS);
    show('admin/ops');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load operations & SOS');
    expect(alert).toHaveTextContent('Ref ERR-503 · AdminOps');
    expect(document.body.textContent).not.toMatch(/No SOS raised|SOS live now/);
    answer(SOS, { items: [sos('aaaaaa01', 'ACTIVE', 1)] });
    const retry = within(alert).getByRole('button', { name: 'Try again' });
    retry.focus();
    expect(retry).toHaveFocus();
    fireEvent.click(retry);
    expect(await screen.findByText('1 SOS live')).toBeInTheDocument();
    expect(callsTo(SOS)).toBe(2);
  });

  it('says plainly when no campus has raised an SOS', async () => {
    answer(SOS, { items: [] });
    show('admin/ops');
    expect(await screen.findByRole('heading', { name: 'No SOS raised on any campus.' })).toBeInTheDocument();
  });

  it('shows campuses up and API availability as “—”, and the median from real acknowledgements', async () => {
    answer(SOS, { items: [sos('a1', 'ACKNOWLEDGED', 10, { acknowledgedAt: NOW - 10 * 60 + 120 }), sos('a2', 'RESOLVED', 30, { acknowledgedAt: NOW - 30 * 60 + 240 })] });
    show('admin/ops');
    await screen.findByRole('table', { name: 'SOS alerts, live first' });
    expect(within(figure('Campuses up')).getByText('—')).toBeInTheDocument();
    expect(within(figure('API availability, 30 days')).getByText('—')).toBeInTheDocument();
    expect(within(figure('Median SOS to campus acknowledgement')).getByText('3 min')).toBeInTheDocument();
  });
});

// ── Overview ─────────────────────────────────────────────────────────────────
const summary: OpsSummary = { accounts: 1240, catalogItems: 58, orderRequests: 312, openSupport: 4, statuses: {} };
const auditItems: AuditEvent[] = [
  { id: 'e1', actorId: 'actor-1', action: 'ACCOUNT_CREATED', resourceId: 'acct-9', createdAt: NOW - 60 },
  { id: 'e2', actorId: 'vendor-2', action: 'PAYMENT_SIGNATURE_REJECTED', resourceId: 'ord-1', createdAt: NOW - 120 },
];
const check = (name: string, status: IntegrationCheck['status']): IntegrationCheck => ({ name, configured: status !== 'unavailable', reachable: status === 'online' ? true : status === 'degraded' ? false : null, status, detail: 'probe', checked_at: NOW });
const health = (checks: IntegrationCheck[]): IntegrationHealth => ({ summary: { checked_at: NOW, interval_seconds: 300, checks, overall: 'degraded' } });
const ruleL = (overrides: Partial<RuleLStatus> = {}): RuleLStatus => ({
  database: 'postgresql', enforced: true, reasons: [],
  checks: { rolesPresent: { sk_clinical: true, sk_commerce: true }, unclassifiedTables: [], loginCanAssumeCommerce: true, commerceLeaks: [], commerceMissing: [], clinicalOnCommerce: [] },
  commercePaths: { runAs: 'sk_commerce', failClosed: true, endpoints: ['GET /api/catalog', 'POST /api/orders'] },
  ...overrides,
});

describe('Platform operations (SuperAdminConsole)', () => {
  beforeEach(() => {
    answer('/ops/summary', summary);
    answer('/ops/audit?limit=6&offset=0', { items: auditItems, total: 1204 });
    answer('/ops/integration-health', health([check('messaging_openwa', 'online')]));
    answer('/ops/feed?limit=5', { items: [], total: 0, critical: 0, scope: 'all' });
    answer('/ops/feed/counts', { domains: {} });
    answer('/ops/accounts?limit=1&role=STUDENT', { total: 980 });
    answer('/ops/accounts?limit=1&role=NMC_DOCTOR', { total: 14 });
    answer('/ops/accounts?limit=1&role=VENDOR', { total: 9 });
    answer('/billing/plans', { plans: [], checkoutAvailable: false, publicKey: '' });
    answer('/ops/rule-l', ruleL());
  });

  it('heads with real counts, and leaves tenants, break-glass and the crisis gate as “—”', async () => {
    show('admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Platform operations' })).toBeInTheDocument();
    expect(screen.getByText(/1,240 accounts · 58 catalogue entries/)).toBeInTheDocument();
    expect(await screen.findByText('Audit ledger · 1,204 entries')).toBeInTheDocument();
    await waitFor(() => expect(within(figure('Student accounts')).getByText('980')).toBeInTheDocument());
    ['Tenants live', 'Break-glass opens', 'Crisis gate'].forEach(label => expect(within(figure(label)).getByText('—')).toBeInTheDocument());
  });

  it('lists the latest audit entries, marking a refusal as denied', async () => {
    show('admin');
    const ledger = await screen.findByRole('region', { name: 'Audit ledger' });
    await waitFor(() => expect(within(ledger).getAllByRole('listitem')).toHaveLength(2));
    expect(within(ledger).getAllByRole('listitem')[1]).toHaveTextContent(/Payment signature rejected.*Denied/);
  });

  it('draws the dual-custody break-glass request disabled, and says why', async () => {
    show('admin');
    const card = await screen.findByRole('region', { name: 'Break-glass access' });
    expect(within(card).getByRole('button', { name: 'Request authorised break-glass access' })).toBeDisabled();
    expect(within(card).getByText(/Not available yet: super admin break-glass needs a named second approver/)).toBeInTheDocument();
    expect(within(card).getByText('No second approver is set up.')).toBeInTheDocument();
  });

  it('computes the commerce guardrail from the live grants, and blanks it where there are none', async () => {
    show('admin');
    const guard = await screen.findByRole('region', { name: 'Guardrails — should read zero' });
    await waitFor(() => expect(within(guard).getByText('Tables commerce can read outside its allowlist').nextElementSibling).toHaveTextContent('0'));
    expect(within(guard).getByText('Ledger delete attempts').nextElementSibling).toHaveTextContent('—');
  });

  it('shows no claim nothing computes', async () => {
    answer('/ops/rule-l', ruleL({ database: 'sqlite', enforced: false, reasons: ['sqlite has no role grants'], checks: {} }));
    show('admin');
    await screen.findByRole('region', { name: 'Audit ledger' });
    expect(document.body.textContent).not.toMatch(/Section 12|compliant|all services nominal|DELETE revoked|Aris Thorne|AUD-8842|VNR VJIET, SNIST|4,940/);
    const guard = screen.getByRole('region', { name: 'Guardrails — should read zero' });
    await waitFor(() => expect(within(guard).getByText('Tables commerce can read outside its allowlist').nextElementSibling).toHaveTextContent('—'));
  });

  it('fails closed on the summary with the board’s reference, and retries', async () => {
    fail('/ops/summary');
    show('admin');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ref ERR-503 · SuperAdminConsole');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(callsTo('/ops/summary')).toBe(2);
  });
});

// ── Rule L ───────────────────────────────────────────────────────────────────
describe('Rule L firewall (AdminRuleL)', () => {
  it('shows each check the server ran, and “holding” only when the server says enforced', async () => {
    answer('/ops/rule-l', ruleL());
    show('admin/rule-l');
    expect(await screen.findByText('7 of 7 holding')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Rule L firewall' });
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(within(table).getAllByText('Holding')).toHaveLength(7);
    expect(document.body.textContent).not.toMatch(/reco-worker|warehouse|growth|4 min/);
    fireEvent.click(screen.getByText('Show the endpoints'));
    expect(screen.getByText('POST /api/orders')).toBeInTheDocument();
  });

  it('marks a leak red and the badge “Not enforced”', async () => {
    answer('/ops/rule-l', ruleL({ enforced: false, reasons: ['sk_commerce holds privileges outside its allowlist on: lab_results'], checks: { ...ruleL().checks, commerceLeaks: ['lab_results'] } }));
    show('admin/rule-l');
    expect(await screen.findByText('Not enforced')).toBeInTheDocument();
    const row = screen.getByText('Commerce reads nothing outside its allowlist').closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('lab_results');
    expect(row).toHaveTextContent('1 tables');
    expect(within(figure('Failing now')).getByText('1')).toBeInTheDocument();
  });

  it('says Rule L is not enforced in this environment when the database has no grants', async () => {
    answer('/ops/rule-l', { database: 'sqlite', enforced: false, reasons: ['sqlite has no role grants; Rule L is not enforced at the database'], checks: {} });
    show('admin/rule-l');
    expect(await screen.findByText(/Rule L is not enforced at the database in this environment \(sqlite\)/)).toBeInTheDocument();
    expect(screen.queryByText(/holding/)).toBeNull();
  });

  it('fails closed with its reference when the check can’t run', async () => {
    fail('/ops/rule-l');
    show('admin/rule-l');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ref ERR-503 · AdminRuleL');
    expect(screen.queryByText(/holding/)).toBeNull();
  });
});

// ── Erasure ──────────────────────────────────────────────────────────────────
describe('Erasure requests (DpdpQueue)', () => {
  const queue = {
    blocked: null, retentionDays: 30,
    pending: [
      { accountId: 'aaaa1111bbbb', requestedAt: NOW - 3 * DAY, scheduledFor: NOW + 4 * DAY + 3600 },
      { accountId: 'cccc2222dddd', requestedAt: NOW - 10 * DAY, scheduledFor: NOW - 3 * DAY },
    ],
    archives: [{ id: 'arch0001xyz', formerAccountId: 'eeee3333', rowCount: 41, archivedAt: NOW - DAY, destroyAfter: NOW + 29 * DAY, destroyed: false }],
  };

  it('runs each clock to the server’s scheduled date, and marks an overdue request red', async () => {
    answer('/ops/erasure', queue);
    show('admin/erasure');
    expect(await screen.findByText('1 past the scheduled date')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Pending erasure requests' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent(/acct_cccc••.*3 days over the scheduled date.*Overdue/);
    expect(rows[1]).toHaveTextContent(/acct_aaaa••.*4 days left.*Scheduled/);
    expect(document.body.textContent).not.toMatch(/cccc2222dddd|Act now|statutory/i);
  });

  it('opens a sealed archive only with a written reason, which it sends to the server', async () => {
    answer('/ops/erasure', queue);
    let sent: unknown = null;
    apiAnswers['/ops/erasure/archives/arch0001xyz/open'] = init => { sent = JSON.parse(String(init?.body)); return Promise.resolve({ archive: { rows: [] } }); };
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    show('admin/erasure');
    fireEvent.click(await screen.findByRole('button', { name: 'Open the archive of acct_eeee•• with a reason' }));
    const submit = await screen.findByRole('button', { name: 'Open and download' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DPO request 12/2026 re dispute' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(sent).toEqual({ reason: 'DPO request 12/2026 re dispute' }));
    expect(await screen.findByText(/Archive opened and downloaded/)).toBeInTheDocument();
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('says why nothing is erased when the archive key is missing', async () => {
    answer('/ops/erasure', { ...queue, blocked: 'DPDP_ARCHIVE_KEY is not set to a valid Fernet key.' });
    show('admin/erasure');
    expect(await screen.findByText(/DPDP_ARCHIVE_KEY is not set/)).toBeInTheDocument();
  });

  it('fails closed with its reference', async () => {
    fail('/ops/erasure');
    show('admin/erasure');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ref ERR-503 · DpdpQueue');
  });
});

// ── Integrations and API keys ────────────────────────────────────────────────
describe('Integrations', () => {
  beforeEach(() => {
    answer('/ops/integration-health', health([check('messaging_openwa', 'online'), check('rule_l_firewall', 'degraded'), check('email_postal', 'unavailable')]));
    answer('/ops/knowledge/index-status', { approvedSources: 12, indexedSources: 10, chunks: 420, embedder: 'hashing-ngram', semantic: false, missing: ['k1', 'k2'], mismatchedEmbedder: 0 });
    answer('/billing/plans', { plans: [], checkoutAvailable: true, publicKey: 'rzp' });
    answer('/apilayer/status', { status: 'active', apilayer_enabled: true, has_api_key: true, supported_features: ['numverify', 'bad_words', 'fixer'] });
  });

  it('lists the probed dependencies with what breaks, a broken Rule L in red', async () => {
    show('admin/integrations');
    const table = await screen.findByRole('table', { name: 'Dependencies and what breaks if each stops' });
    const ruleRow = within(table).getByText('Rule L firewall (database)').closest('tr') as HTMLElement;
    expect(within(ruleRow).getByText('Degraded').className).toMatch(/danger/);
    await waitFor(() => expect(within(table).getByText('3 legacy proxies')).toBeInTheDocument());
    expect(within(table).getByText('Razorpay').closest('tr')).toHaveTextContent('Configured');
    expect(document.body.textContent).not.toMatch(/ABDM|LDAP|Alembic|Ollama/);
  });

  it('warns that the index needs a rebuild only because sources really are missing', async () => {
    show('admin/integrations');
    expect(await screen.findByText(/2 approved sources are not indexed yet/)).toBeInTheDocument();
  });

  it('keeps the provider settings reachable as a second tab', () => {
    show('admin/telemetry');
    expect(screen.getByRole('tab', { name: 'Provider settings & probes' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Dependencies' }));
    expect(navigate).toHaveBeenCalledWith('admin/integrations');
  });
});

describe('API access & keys (AdminApiKeys)', () => {
  it('lists the mounted proxy routes with their real auth, and offers no rotation or removal', async () => {
    answer('/apilayer/status', { status: 'active', apilayer_enabled: true, has_api_key: false, supported_features: ['numverify', 'bad_words', 'resume_parser'] });
    show('admin/api-keys');
    const table = await screen.findByRole('table', { name: 'API routes' });
    expect(within(table).getByText('/api/apilayer/badwords')).toBeInTheDocument();
    expect(within(table).getByText('/api/apilayer/resume-parser')).toBeInTheDocument();
    expect(within(table).getAllByText('Super admin session')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Rotate|Remove/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/signed service token from|312/);
    fireEvent.click(screen.getByRole('button', { name: 'Integrations' }));
    expect(navigate).toHaveBeenCalledWith('admin/integrations');
  });
});

// ── Audit explorer and AI governance ─────────────────────────────────────────
describe('Audit explorer', () => {
  it('lists the page, narrows it to denials, and never claims chain integrity', async () => {
    answer('/ops/audit?limit=50&offset=0', { items: auditItems, total: 2 });
    show('admin/audit');
    const list = await screen.findByRole('list', { name: 'Audit events' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Denied' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Break-glass' }));
    expect(screen.getByText('No events on this page match these filters.')).toBeInTheDocument();
    expect(screen.getByText('Not verified')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Verified to tip|recomputed from genesis|AUDIT_HMAC/);
  });

  it('fails closed with its reference', async () => {
    fail('/ops/audit?limit=50&offset=0');
    show('admin/audit');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ref ERR-503 · AuditExplorer');
  });
});

describe('AI governance', () => {
  const quality = { turns: 200, groundedRate: 0.97, answerRate: 0.8, refusalBreakdown: { ANSWERED: 160, NO_SOURCE: 10, REFUSED_SCOPE: 20, REFUSED_PERSONAL: 4, REFUSED_OUTPUT: 1, CRISIS: 5 }, avgLatencyMs: 120, avgTopScore: 0.381 };

  it('shows where turns stop, with no count for stages that cannot refuse', async () => {
    answer('/ops/agents/ayush/quality', quality);
    answer('/ops/knowledge/index-status', { approvedSources: 4, indexedSources: 4, chunks: 40, embedder: 'hashing-ngram', semantic: false, missing: [], mismatchedEmbedder: 0 });
    show('admin/ai-governance');
    const crisis = (await screen.findByText('Crisis gate')).closest('li') as HTMLElement;
    expect(crisis).toHaveTextContent('5');
    expect((screen.getByText('Retrieval').closest('li') as HTMLElement)).toHaveTextContent('—');
    expect(screen.getByLabelText('Retrieval cannot refuse, so it has no count')).toBeInTheDocument();
    expect(within(figure('Refusal rate')).getByText('20%')).toBeInTheDocument();
    expect(await screen.findByText(/Retrieval is character n-gram hashing/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/riskSignals|allergyCrossCheck|last 7 days/i);
  });

  it('does not describe n-gram hashing when retrieval is semantic', async () => {
    answer('/ops/agents/ayush/quality', quality);
    answer('/ops/knowledge/index-status', { approvedSources: 4, indexedSources: 4, chunks: 40, embedder: 'bge', semantic: true, missing: [], mismatchedEmbedder: 0 });
    show('admin/ai-governance');
    await screen.findByText('Crisis gate');
    await waitFor(() => expect(screen.getByText('Approved sources indexed').nextElementSibling).toHaveTextContent('4 of 4'));
    expect(screen.queryByText(/n-gram hashing/)).toBeNull();
  });

  it('fails closed with its reference', async () => {
    fail('/ops/agents/ayush/quality');
    show('admin/ai-governance');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ref ERR-503 · AiGovernance');
  });
});

// ── Plans & pricing and the retired price fix ────────────────────────────────
const setting = (key: string, effective: number, description = key): SettingView => ({ key, type: 'int', default: effective, description, area: 'billing', unit: '₹', min: 1, max: 100000, public: true, override: null, effective });
const SETTINGS = [setting('billing.student_plus.monthly_inr', 149), setting('billing.student_plus.quarter_package_inr', 2199), setting('billing.premium.from_monthly_inr', 499)];
const PLANS = {
  plans: [
    { id: 'FREE', name: 'Free Student Account', price: 'Free', priceFrom: false, period: 'forever', packages: [], audience: 'student', benefits: [], description: 'Every account starts free.' },
    { id: 'STUDENT_PLUS', name: 'Student Plus', price: 149, priceFrom: false, period: 'per month', packages: [{ id: 'QUARTER', months: 3, price: 2199 }], audience: 'student', benefits: [], description: 'Monthly optional benefits pass.' },
    { id: 'PREMIUM', name: 'Premium', price: 499, priceFrom: true, period: 'per month', packages: [], audience: 'student', benefits: [], description: 'Premium starts at this price.' },
  ],
  checkoutAvailable: false, publicKey: '',
};

describe('Plans & pricing (AdminPlansPricing)', () => {
  beforeEach(() => {
    answer('/billing/plans', PLANS);
    answer('/ops/settings', { items: SETTINGS });
    SETTINGS.forEach(item => answer(`/ops/settings/${item.key}/history`, { items: item.key.endsWith('monthly_inr') && item.key.includes('student_plus') ? [{ oldValue: 99, newValue: 149, reason: 'Founder price 2026-10-20', changedBy: 'admin-1', changedAt: NOW - DAY }] : [] }));
  });

  it('shows the server’s plans and prices — ₹149, ₹2,199 for 3 months, from ₹499 — and the commission as not set', async () => {
    show('admin/plans');
    const plus = (await screen.findByRole('region', { name: 'Student Plus' }));
    expect(plus).toHaveTextContent('₹149');
    expect(plus).toHaveTextContent('₹2,199');
    expect(screen.getByRole('region', { name: 'Premium' })).toHaveTextContent('from ₹499');
    expect(screen.getByText('Doctors’ commission share').nextElementSibling).toHaveTextContent('Not set');
    expect(document.body.textContent).not.toMatch(/Price mismatch|Point all surfaces|Where prices appear|₹199|Care Circle/);
    expect(screen.getByRole('button', { name: 'New plan' })).toBeDisabled();
  });

  it('lists the change history from the settings history', async () => {
    show('admin/plans');
    expect(await screen.findByText(/Student Plus, per month: ₹99 to ₹149/)).toBeInTheDocument();
    expect(screen.getByText(/Founder price 2026-10-20/)).toBeInTheDocument();
  });

  it('changes a price only with a valid amount and a reason, through the settings API', async () => {
    let sent: unknown = null;
    apiAnswers['/ops/settings/billing.premium.from_monthly_inr'] = init => { sent = { method: init?.method, body: JSON.parse(String(init?.body)) }; return Promise.resolve(setting('billing.premium.from_monthly_inr', 549)); };
    show('admin/plans');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit price of Premium' }));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'Save price' });
    const amount = within(dialog).getByRole('spinbutton');
    fireEvent.change(amount, { target: { value: '0' } });
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(amount, { target: { value: '549' } });
    expect(save).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Premium launch pricing' } });
    expect(within(dialog).getByText('₹549')).toBeInTheDocument();
    fireEvent.click(save);
    await waitFor(() => expect(sent).toEqual({ method: 'PATCH', body: { value: 549, reason: 'Premium launch pricing' } }));
    expect(await screen.findByText(/is now ₹549/)).toBeInTheDocument();
  });

  it('keeps the drawer open and says what the server said when a change is refused', async () => {
    apiAnswers['/ops/settings/billing.premium.from_monthly_inr'] = () => Promise.reject(new Error('Value above the maximum.'));
    show('admin/plans');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit price of Premium' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '600' } });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Test' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Value above the maximum.');
  });

  it('fails closed when the plans can’t load', async () => {
    fail('/billing/plans');
    show('admin/plans');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ref ERR-503 · AdminPlansPricing');
  });
});

describe('Fix the Premium price (AdminPriceFix), retired', () => {
  it('shows the price settings in force and sends price changes to Plans & pricing', async () => {
    answer('/ops/settings', { items: SETTINGS });
    show('admin/price-fix');
    expect(await screen.findByText('Student Plus, 3-month package')).toBeInTheDocument();
    expect(screen.getByText('₹2,199')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Demo|second admin approves|412 students/);
    fireEvent.click(screen.getByRole('button', { name: 'Open Plans & pricing' }));
    expect(navigate).toHaveBeenCalledWith('admin/plans');
  });
});

// ── Knowledge base ───────────────────────────────────────────────────────────
describe('Knowledge base (AdminKnowledge)', () => {
  beforeEach(() => {
    // jsdom has no <dialog> modal API; the publish dialog only needs it to open.
    Object.assign(HTMLDialogElement.prototype, { showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); }, close(this: HTMLDialogElement) { this.removeAttribute('open'); } });
  });

  it('lists the sources, keeps publishing, and offers no retrieval preview it can’t run', async () => {
    answer('/knowledge/sources', { items: [{ id: 'k1', title: 'Understanding your CBC report', category: 'records', version: 3, author: 'Dr. A. Reddy', reviewed: true, expiresAt: null }] });
    answer('/ops/knowledge/index-status', { approvedSources: 1, indexedSources: 1, chunks: 48, embedder: 'hashing-ngram', semantic: false, missing: [], mismatchedEmbedder: 0 });
    show('admin/knowledge');
    expect(await screen.findByText('Understanding your CBC report')).toBeInTheDocument();
    expect(await screen.findByText('48 chunks indexed')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'A question to test retrieval with' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Retire|Sign off|Restore/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/reviewed by a clinician|Vitamin D|match 0\./);
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

// ── Boards with no data source ───────────────────────────────────────────────
describe('Tier 1 boards with nothing behind them', () => {
  it.each([
    ['admin/surveillance', 'Surveillance map'],
    ['admin/consent-policy', 'Consent policy'],
    ['admin/handover', 'Casualty handover'],
    ['admin/checkins', 'Check-in audit'],
    ['admin/break-glass-log', 'Break-glass log'],
  ] as [RoutePath, string][])('%s keeps the board’s figures as “—”, its columns, no rows and no sample', (route, title) => {
    show(route);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    const values = Array.from(document.querySelectorAll('.sk-stat__value')).map(value => value.textContent);
    expect(values.length).toBeGreaterThanOrEqual(4);
    values.forEach(value => expect(value).toBe('—'));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(4);
    expect((table.querySelector('tbody') as HTMLElement).textContent).not.toMatch(/\d/);
    expect(document.body.textContent).not.toMatch(/Hyderabad|CAS-11|VNR|SNIST|MedPlus|BG-2026|k = 5|90 days|7 years|Fever rate/);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('break-glass log: export is disabled, the filters still work, and the review decisions are described, not offered', () => {
    show('admin/break-glass-log');
    expect(screen.getByRole('button', { name: 'Export for DPO' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Needs review' }));
    expect(screen.getByRole('button', { name: 'Needs review' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('table')).toHaveTextContent('No openings waiting for review.');
    expect(screen.getByText(/Misuse — their emergency-card access is suspended/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('message templates: no template actions, and no medicine or value in the preview', () => {
    show('admin/templates');
    expect(screen.getByRole('button', { name: 'New template' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save draft|Submit to Meta/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Metformin|HbA1c|Rohan|refill_due/);
    fireEvent.click(screen.getByRole('button', { name: 'Open message outbox' }));
    expect(navigate).toHaveBeenCalledWith('admin/outbox');
  });

  it('case: a way back, the outcome choices disabled, and no phone number or photo', () => {
    show('admin/case');
    fireEvent.click(screen.getByRole('button', { name: 'Check-in audit' }));
    expect(navigate).toHaveBeenCalledWith('admin/checkins');
    screen.getAllByRole('radio').forEach(option => expect(option).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByRole('button', { name: 'Close case and tell the student' })).toBeDisabled();
    expect(document.body.textContent).not.toMatch(/\+91|SR-2026|Krishna|Ravi/);
  });

  it('consent policy: says no rule is a setting yet, and that the 18+ gate cannot be lowered', () => {
    show('admin/consent-policy');
    expect(screen.getByText(/The 18\+ gate is enforced at sign-up and on profile edits, and no screen can lower it\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit|Change|Save/ })).toBeNull();
  });
});
