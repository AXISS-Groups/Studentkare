// Display formatting and display rules shared by the Super Admin screens. Pure functions, no React.

import type { IntegrationCheck, IntegrationHealth, OpsFeedEvent, OpsSeverity } from '@/data/workflowTypes';
import type { BillingPlan } from '@/data/datasets/billing';
import type { AuditPage, IndexStatus, KnowledgeSource, MetricValue, OpsFeedCounts, SourceState, StatusReading, StatusTone } from './types';

export const readable = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
export const count = (value: number) => value.toLocaleString('en-IN');
export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;
export const when = (seconds: number) => new Date(seconds * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const OUTCOME_LABEL: Record<string, string> = {
  ANSWERED: 'Answered',
  NO_SOURCE: 'No source found',
  REFUSED_SCOPE: 'Refused — out of scope',
  REFUSED_PERSONAL: 'Refused — personal',
  REFUSED_OUTPUT: 'Refused — output check',
  CRISIS: 'Routed to crisis support',
};

/** Where an Agent Ayush turn ended, in words. Unknown outcomes fall back to their readable code. */
export const outcomeLabel = (outcome: string) => OUTCOME_LABEL[outcome] ?? readable(outcome);

/** Tag tone for an OCR confidence: sure at 90% and above, attention from 70%, otherwise danger. */
export const confidenceTone = (confidence: number) => confidence >= 0.9 ? 'is-positive' : confidence >= 0.7 ? 'is-attention' : 'is-danger';

/** A knowledge source's state for Ayush: expired sources are hidden, unreviewed ones wait, approved ones need indexing. */
export function sourceState(source: KnowledgeSource, missing: Set<string>, now: number): { label: string; tone: string } {
  if (source.expiresAt !== null && source.expiresAt * 1000 < now) return { label: 'Expired · hidden', tone: 'is-neutral' };
  if (!source.reviewed) return { label: 'Awaiting review', tone: 'is-attention' };
  if (missing.has(source.id)) return { label: 'Not indexed', tone: 'is-attention' };
  return { label: 'Live', tone: 'is-positive' };
}

/** Header tone for the index: nothing indexed is neutral, unindexed approved sources need attention. */
export const indexTone = (index: IndexStatus): 'neutral' | 'attention' | 'positive' => index.chunks === 0 ? 'neutral' : index.missing.length ? 'attention' : 'positive';

/** A safety event's state: acknowledged is neutral; an open one is danger when CRITICAL, otherwise attention. */
export const safetyEventState = (event: OpsFeedEvent): { label: 'Open' | 'Acknowledged'; tone: 'is-neutral' | 'is-danger' | 'is-attention' } =>
  event.acknowledgedAt ? { label: 'Acknowledged', tone: 'is-neutral' } : { label: 'Open', tone: event.severity === 'CRITICAL' ? 'is-danger' : 'is-attention' };

// ── Overview ─────────────────────────────────────────────────────────────────
/** Hour and minute, 24-hour, for the Overview's recent-activity rows. */
export const clockTime = (seconds: number) => new Date(seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Dot tone for a feed event's severity. */
export const SEVERITY_TONE: Record<OpsSeverity, 'danger' | 'attention' | 'info'> = { CRITICAL: 'danger', ATTENTION: 'attention', INFO: 'info' };

/** One line on service health, worked out from the probes — never asserted. */
export function describeServices(checks: IntegrationCheck[]): string {
  const configured = checks.filter(check => check.configured);
  if (!configured.length) return 'no integrations configured';
  const degraded = configured.filter(check => check.status === 'degraded').length;
  if (degraded) return `${degraded} ${degraded === 1 ? 'service' : 'services'} degraded`;
  const online = configured.filter(check => check.status === 'online').length;
  if (online === configured.length) return 'all configured services online';
  return `${online} of ${configured.length} configured services verified online`;
}

/** Tone for the services line, from the same probes as describeServices. */
export function servicesTone(checks: IntegrationCheck[]): StatusTone {
  const configured = checks.filter(check => check.configured);
  if (configured.some(check => check.status === 'degraded')) return 'attention';
  return configured.length && configured.every(check => check.status === 'online') ? 'positive' : 'neutral';
}

/** The services line in the header: checking, unavailable, or worked out from the probes. */
export function servicesLine(health: SourceState<IntegrationHealth>): string {
  return health.loading ? 'checking services…' : health.error ? 'service status unavailable' : describeServices(health.data?.summary.checks ?? []);
}

/** A figure from one source: loading, an error (or nothing) is a blank, never 0. */
export function metricFrom<T>(source: SourceState<T>, pick: (data: T) => number): MetricValue {
  if (source.loading) return { state: 'loading' };
  if (source.error || !source.data) return { state: 'error' };
  return { state: 'ready', value: pick(source.data) };
}

/** A status line from one source: checking while it loads, “Couldn’t check” when it fails. */
function statusFrom<T>(source: SourceState<T>, ready: (data: T) => StatusReading): StatusReading {
  if (source.loading) return { status: 'Checking…', tone: 'neutral' };
  if (source.error || !source.data) return { status: 'Couldn’t check', tone: 'attention' };
  return ready(source.data);
}

export const auditLedgerStatus = (audit: SourceState<AuditPage>): StatusReading =>
  statusFrom(audit, data => ({ status: `${count(data.total)} events recorded`, tone: 'positive' }));

export const integrationsStatus = (health: SourceState<IntegrationHealth>): StatusReading =>
  statusFrom(health, data => ({ status: describeServices(data.summary.checks).replace(/^./, character => character.toUpperCase()), tone: servicesTone(data.summary.checks) }));

export const openSafetyStatus = (counts: SourceState<OpsFeedCounts>): StatusReading =>
  statusFrom(counts, data => {
    const open = data.domains.SAFETY ?? 0;
    return open ? { status: `${count(open)} open safety ${open === 1 ? 'event' : 'events'}`, tone: 'danger' } : { status: 'No open safety events', tone: 'positive' };
  });

// ── Plans & pricing ──────────────────────────────────────────────────────────
/** A plan's price: a number in rupees is formatted (₹1,499); a word such as “Free” is shown as given. */
export const planPrice = (plan: BillingPlan) => typeof plan.price === 'number' ? `₹${count(plan.price)}` : plan.price;

/** A plan's price with its period for a numeric price (₹1,499 per year); a word price stands alone. */
export const planPriceWithPeriod = (plan: BillingPlan) => typeof plan.price === 'number' ? `₹${count(plan.price)} ${plan.period}` : plan.price;
