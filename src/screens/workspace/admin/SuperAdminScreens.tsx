import React, { lazy, ReactElement, Suspense } from 'react';
import type { RoutePath } from '../../../lib/workflowRouting';
import { skTokens } from '../../../theme/tokens/generated/skTokens';
import { SupportPanel } from '../MemberPanels';
import { TelemetryConsole } from '../TelemetryConsole';
import { IntegrationsSettingsModule } from '../../admin/IntegrationsSettingsModule';
import { ErasurePanel } from '../ErasurePanel';
import { AccountsView } from '../../../features/admin/views/AccountsView';
import { AuditExplorerView } from '../../../features/admin/views/AuditExplorerView';
import { CatalogueView } from '../../../features/admin/views/CatalogueView';
import { ContractsView } from '../../../features/admin/views/ContractsView';
import { ActivityFeedView } from '../../../features/admin/views/ActivityFeedView';
import { AiGovernanceView } from '../../../features/admin/views/AiGovernanceView';
import { IntakeView } from '../../../features/admin/views/IntakeView';
import { KnowledgeView } from '../../../features/admin/views/KnowledgeView';
import { WorkRequestsView } from '../../../features/admin/views/WorkRequestsView';
import { OperationsOverviewView } from '../../../features/admin/views/OperationsOverviewView';
import { PlansPricingView } from '../../../features/admin/views/PlansPricingView';
import { PriceFixView } from '../../../features/admin/views/PriceFixView';
import { OpenSafetyStatusView, SafetyEventsView } from '../../../features/admin/views/SafetyEventsView';
import { SurveillanceView } from '../../../features/admin/views/SurveillanceView';
import { MessageTemplatesView } from '../../../features/admin/views/MessageTemplatesView';
import { CaseView } from '../../../features/admin/views/CaseView';
import { FeatureFlagsView } from '../../../features/admin/views/FeatureFlagsView';
import { BillingLedgerView } from '../../../features/admin/views/BillingLedgerView';
import { BreakGlassLogView } from '../../../features/admin/views/BreakGlassLogView';
import { LabReviewerAssignmentView } from '../../../features/admin/views/LabReviewerAssignmentView';
import { MessageOutboxView } from '../../../features/admin/views/MessageOutboxView';
import { NOT_CONNECTED_SCREENS, NotConnectedView } from '../../../features/admin/views/NotConnectedView';
import { READ_ONLY_SCREENS, ReadOnlyAdminView } from '../../../features/admin/views/ReadOnlyAdminView';
import { count } from '../../../features/admin/model/format';
import { useT } from '../../../i18n';
import { AdminLoading, AdminPage, AdminStats, AdminTab, AdminTabbedPage, LegacyPanel, NotConnectedTable, unreportedStats } from './AdminPage';

const PreventiveOperationsScreen = lazy(() => import('../../../features/preventive/screens/PreventiveOperationsScreen').then(module => ({ default: module.PreventiveOperationsScreen })));

/**
 * Every Super Admin route resolves here to one canonical screen (SK-014).
 *
 * Each screen follows its design in design/screens/07-super-admin/. Titles,
 * descriptions and table columns come from the design; its sample rows and counts
 * do not, because no API supplies them. Older admin pages keep their logic and live
 * on as route-backed tabs of the screen they belong to, restyled by admin-legacy.css.
 */

// ── Operations & SOS ─────────────────────────────────────────────────────────
// No tab strip (design AdminOps). Activity, support and requests stay reachable by route — Alerts opens activity.
const OPERATIONS_ROUTES: RoutePath[] = ['admin/ops', 'admin/activity', 'admin/support', 'admin/requests'];

function OperationsScreen({ route }: { route: RoutePath }) {
  const t = useT();
  if (route === 'admin/ops') return <SafetyEventsView />;
  return <AdminPage eyebrow={t('admin.eyebrow.platform')} title={t('admin.ops.title')} description={t('admin.ops.description')} status={<OpenSafetyStatusView />}>
    {route === 'admin/activity' ? <LegacyPanel><ActivityFeedView /></LegacyPanel>
      : route === 'admin/support' ? <LegacyPanel><SupportPanel staff /></LegacyPanel>
        : <LegacyPanel><WorkRequestsView /></LegacyPanel>}
  </AdminPage>;
}

// ── Organisations, Partner applications, Integrations ────────────────────────
const ORGANISATION_TABS: AdminTab[] = [{ route: 'admin/organisations', label: 'admin.orgs.tabTenants' }, { route: 'admin/billing', label: 'admin.orgs.tabInquiries' }];
const PARTNER_TABS: AdminTab[] = [{ route: 'admin/partners', label: 'admin.partners.tabApplications' }, { route: 'admin/preventive', label: 'admin.partners.tabProviders' }];

function OrganisationsScreen({ route }: { route: RoutePath }) {
  const t = useT();
  return <AdminTabbedPage eyebrow={t('admin.eyebrow.tenants')} title={t('admin.orgs.title')} description={t('admin.orgs.description')} tabs={ORGANISATION_TABS} current={route}>
    {route === 'admin/billing' ? <LegacyPanel><ContractsView /></LegacyPanel>
      : <><AdminStats label={t('admin.orgs.summary')} stats={unreportedStats([t('admin.orgs.statLive'), t('admin.orgs.statVerified'), t('admin.orgs.statExpired'), t('admin.orgs.statDeleted')])} /><NotConnectedTable caption={t('admin.orgs.tabTenants')} columns={[t('admin.col.institution'), t('admin.col.plan'), t('admin.col.students'), t('admin.col.renewal'), t('admin.col.featureFlags'), t('admin.col.state')]} subject={t('admin.orgs.subject')} /></>}
  </AdminTabbedPage>;
}

function PartnersScreen({ route }: { route: RoutePath }) {
  const t = useT();
  return <AdminTabbedPage eyebrow={t('admin.eyebrow.gatekeeping')} title={t('admin.partners.title')} description={t('admin.partners.description')} tabs={PARTNER_TABS} current={route}>
    {route === 'admin/preventive' ? <LegacyPanel><Suspense fallback={<AdminLoading label={t('admin.partners.loadingProviders')} />}><PreventiveOperationsScreen /></Suspense></LegacyPanel>
      : <><AdminStats label={t('admin.partners.summary')} stats={unreportedStats([t('admin.partners.statMonth'), t('admin.partners.statApproved'), t('admin.partners.statDeclined'), t('admin.partners.statMedian')])} /><NotConnectedTable caption={t('admin.partners.title')} columns={[t('admin.col.organisation'), t('admin.col.category'), t('admin.col.credentialCheck'), t('admin.col.reach'), t('admin.col.decision')]} subject={t('admin.partners.subject')} /></>}
  </AdminTabbedPage>;
}

const INTEGRATION_TABS: AdminTab[] = [{ route: 'admin/integrations', label: 'admin.integrations.tabProviders' }, { route: 'admin/telemetry', label: 'admin.integrations.tabHealth' }, { route: 'admin/api-keys', label: 'admin.integrations.tabKeys' }];

function IntegrationsScreen({ route }: { route: RoutePath }) {
  const t = useT();
  return <AdminTabbedPage eyebrow={t('admin.eyebrow.tenants')} title={t('admin.integrations.title')} description={t('admin.integrations.description')} tabs={INTEGRATION_TABS} current={route}>
    {route === 'admin/api-keys' ? <ApiKeys />
      : <LegacyPanel>{route === 'admin/telemetry' ? <TelemetryConsole /> : <IntegrationsSettingsModule />}</LegacyPanel>}
  </AdminTabbedPage>;
}


// ── Token sync: the shipped tokens, read from the generated file ─────────────
const kebab = (role: string) => role.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();

function TokenSyncScreen() {
  const t = useT();
  const light = skTokens.color.light as Record<string, string>;
  const dark = skTokens.color.dark as Record<string, string>;
  const roles = Object.keys(light);
  return <AdminPage eyebrow={t('admin.eyebrow.tenants')} title={t('admin.tokens.title')} description={t('admin.tokens.description')}>
    <AdminStats label={t('admin.tokens.summary')} stats={[
      { label: t('admin.tokens.statColour'), value: count(roles.length), meta: t('admin.tokens.statColourMeta') },
      { label: t('admin.tokens.statDark'), value: count(Object.keys(dark).length), meta: t('admin.tokens.statDarkMeta') },
      { label: t('admin.tokens.statOutOfSync') },
      { label: t('admin.tokens.statUnresolved') },
    ]} />
    <div className="sk-admin-card sk-admin-table-card">
      <table className="sk-admin-table">
        <caption className="sk-admin-visually-hidden">{t('admin.tokens.statColour')}</caption>
        <thead><tr><th scope="col">{t('admin.tokens.colToken')}</th><th scope="col">{t('admin.tokens.colLight')}</th><th scope="col">{t('admin.tokens.colDark')}</th></tr></thead>
        <tbody>{roles.map(role => <tr key={role}>
          <td><span className="sk-admin-swatch" style={{ background: `var(--sk-color-${kebab(role)})` }} aria-hidden="true" /><strong className="sk-admin-mono">--sk-color-{kebab(role)}</strong></td>
          <td className="sk-admin-mono">{light[role]}</td>
          <td className="sk-admin-mono">{dark[role] ?? '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="sk-admin-note">{t('admin.tokens.noteBefore')} <span className="sk-admin-mono">npm run tokens:check</span> {t('admin.tokens.noteAfter')}</p>
  </AdminPage>;
}


// ── Integrations → API access & keys ─────────────────────────────────────────
// No endpoint lists proxy routes or their keys, so the table is empty and there are
// no Rotate key / Remove route actions, which would need the key service. The
// summary tiles were removed at the product owner's request.
function ApiKeys() {
  const t = useT();
  return <>
    <NotConnectedTable caption={t('admin.apiKeys.caption')} columns={[t('admin.col.route'), t('admin.col.usedFor'), t('admin.col.auth'), t('admin.col.keyAge'), t('admin.col.calls24h'), t('admin.col.blocked')]} subject={t('admin.apiKeys.subject')} />
    <p className="sk-admin-note">{t('admin.apiKeys.note')}</p>
  </>;
}

/** The canonical screen for any Super Admin route, or null for a non-admin route. */
export function superAdminScreen(route: RoutePath): ReactElement | null {
  if (route === 'admin') return <OperationsOverviewView />;
  if (OPERATIONS_ROUTES.includes(route)) return <OperationsScreen route={route} />;
  if (ORGANISATION_TABS.some(tab => tab.route === route)) return <OrganisationsScreen route={route} />;
  if (PARTNER_TABS.some(tab => tab.route === route)) return <PartnersScreen route={route} />;
  if (INTEGRATION_TABS.some(tab => tab.route === route)) return <IntegrationsScreen route={route} />;
  if (route === 'admin/audit') return <AuditExplorerView />;
  if (route === 'admin/surveillance') return <SurveillanceView />;
  if (route === 'admin/tokens') return <TokenSyncScreen />;
  if (route === 'admin/ledger') return <BillingLedgerView />;
  if (route === 'admin/break-glass-log') return <BreakGlassLogView />;
  if (route === 'admin/case') return <CaseView />;
  if (route === 'admin/flags') return <FeatureFlagsView />;
  if (route === 'admin/templates') return <MessageTemplatesView />;
  if (route === 'admin/accounts') return <AccountsView />;
  if (route === 'admin/erasure') return <ErasurePanel />;
  if (route === 'admin/catalog') return <CatalogueView />;
  if (route === 'admin/intake') return <IntakeView />;
  if (route === 'admin/knowledge') return <KnowledgeView />;
  if (route === 'admin/plans') return <PlansPricingView />;
  if (route === 'admin/price-fix') return <PriceFixView />;
  if (route === 'admin/ai-governance') return <AiGovernanceView />;
  if (route === 'admin/lab-reviews') return <LabReviewerAssignmentView />;
  if (route === 'admin/outbox') return <MessageOutboxView />;
  const readOnly = READ_ONLY_SCREENS[route];
  if (readOnly) return <ReadOnlyAdminView screen={readOnly} />;
  const notConnected = NOT_CONNECTED_SCREENS[route];
  if (notConnected) return <NotConnectedView screen={notConnected} />;
  return null;
}
