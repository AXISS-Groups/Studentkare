import React, { lazy, ReactElement, Suspense } from 'react';
import type { RoutePath } from '../../../lib/workflowRouting';
import { skTokens } from '../../../theme/tokens/generated/skTokens';
import { SupportPanel } from '../MemberPanels';
import { TelemetryConsole } from '../TelemetryConsole';
import { IntegrationsSettingsModule } from '../../admin/IntegrationsSettingsModule';
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
import { NOT_CONNECTED_SCREENS, NotConnectedView } from '../../../features/admin/views/NotConnectedView';
import { READ_ONLY_SCREENS, ReadOnlyAdminView } from '../../../features/admin/views/ReadOnlyAdminView';
import { count } from '../../../features/admin/model/format';
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
  if (route === 'admin/ops') return <SafetyEventsView />;
  return <AdminPage eyebrow="Platform" title="Operations & SOS" description="Every campus, one board. Emergencies above everything else." status={<OpenSafetyStatusView />}>
    {route === 'admin/activity' ? <LegacyPanel><ActivityFeedView /></LegacyPanel>
      : route === 'admin/support' ? <LegacyPanel><SupportPanel staff /></LegacyPanel>
        : <LegacyPanel><WorkRequestsView /></LegacyPanel>}
  </AdminPage>;
}

// ── Organisations, Partner applications, Integrations ────────────────────────
const ORGANISATION_TABS: AdminTab[] = [{ route: 'admin/organisations', label: 'Tenants' }, { route: 'admin/billing', label: 'Inquiries & contracts' }];
const PARTNER_TABS: AdminTab[] = [{ route: 'admin/partners', label: 'Applications' }, { route: 'admin/preventive', label: 'Providers & preventive care' }];

function OrganisationsScreen({ route }: { route: RoutePath }) {
  return <AdminTabbedPage eyebrow="Tenants" title="Organisations" description="Tenant plans, contracts and renewals." tabs={ORGANISATION_TABS} current={route}>
    {route === 'admin/billing' ? <LegacyPanel><ContractsView /></LegacyPanel>
      : <><AdminStats label="Tenant summary" stats={unreportedStats(['Campuses live', 'Verified students', 'Expired, read-only', 'Data deleted on expiry'])} /><NotConnectedTable caption="Tenants" columns={['Institution', 'Plan', 'Students', 'Renewal', 'Feature flags', 'State']} subject="tenants" /></>}
  </AdminTabbedPage>;
}

function PartnersScreen({ route }: { route: RoutePath }) {
  return <AdminTabbedPage eyebrow="Gatekeeping" title="Partner applications" description="Applications from the partnerships form, and the providers already on the platform." tabs={PARTNER_TABS} current={route}>
    {route === 'admin/preventive' ? <LegacyPanel><Suspense fallback={<AdminLoading label="Loading providers…" />}><PreventiveOperationsScreen /></Suspense></LegacyPanel>
      : <><AdminStats label="Applications summary" stats={unreportedStats(['This month', 'Approved for pilot', 'Declined', 'Median time to answer'])} /><NotConnectedTable caption="Partner applications" columns={['Organisation', 'Category', 'Credential check', 'Reach', 'Decision']} subject="partner applications" /></>}
  </AdminTabbedPage>;
}

const INTEGRATION_TABS: AdminTab[] = [{ route: 'admin/integrations', label: 'Providers' }, { route: 'admin/telemetry', label: 'Health & jobs' }, { route: 'admin/api-keys', label: 'API access & keys' }];

function IntegrationsScreen({ route }: { route: RoutePath }) {
  return <AdminTabbedPage eyebrow="Tenants" title="Integrations" description="Connected services and their keys, and how they and the background jobs are running." tabs={INTEGRATION_TABS} current={route}>
    {route === 'admin/api-keys' ? <ApiKeys />
      : <LegacyPanel>{route === 'admin/telemetry' ? <TelemetryConsole /> : <IntegrationsSettingsModule />}</LegacyPanel>}
  </AdminTabbedPage>;
}


// ── Token sync: the shipped tokens, read from the generated file ─────────────
const kebab = (role: string) => role.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();

function TokenSyncScreen() {
  const light = skTokens.color.light as Record<string, string>;
  const dark = skTokens.color.dark as Record<string, string>;
  const roles = Object.keys(light);
  return <AdminPage eyebrow="Tenants" title="Token sync" description="The colour tokens that ship, generated from design/tokens/studentkare.tokens.json.">
    <AdminStats label="Token summary" stats={[
      { label: 'Colour tokens', value: count(roles.length), meta: 'Roles in the light theme' },
      { label: 'Dark theme roles', value: count(Object.keys(dark).length), meta: 'Must match the light theme' },
      { label: 'Out of sync' },
      { label: 'Unresolved' },
    ]} />
    <div className="sk-admin-card sk-admin-table-card">
      <table className="sk-admin-table">
        <caption className="sk-admin-visually-hidden">Colour tokens</caption>
        <thead><tr><th scope="col">Token</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead>
        <tbody>{roles.map(role => <tr key={role}>
          <td><span className="sk-admin-swatch" style={{ background: `var(--sk-color-${kebab(role)})` }} aria-hidden="true" /><strong className="sk-admin-mono">--sk-color-{kebab(role)}</strong></td>
          <td className="sk-admin-mono">{light[role]}</td>
          <td className="sk-admin-mono">{dark[role] ?? '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="sk-admin-note">Whether the design source and the shipped files match is checked by <span className="sk-admin-mono">npm run tokens:check</span> in CI, not on this screen.</p>
  </AdminPage>;
}


// ── Integrations → API access & keys ─────────────────────────────────────────
// No endpoint lists proxy routes or their keys, so the table is empty and there are
// no Rotate key / Remove route actions, which would need the key service. The
// summary tiles were removed at the product owner's request.
function ApiKeys() {
  return <>
    <NotConnectedTable caption="API routes" columns={['Route', 'Used for', 'Auth', 'Key age', 'Calls · 24 h', 'Blocked']} subject="API routes" />
    <p className="sk-admin-note">Key rotation and route removal will appear here once the key service is connected. Rotation will need a second admin.</p>
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
  if (route === 'admin/catalog') return <CatalogueView />;
  if (route === 'admin/intake') return <IntakeView />;
  if (route === 'admin/knowledge') return <KnowledgeView />;
  if (route === 'admin/plans') return <PlansPricingView />;
  if (route === 'admin/price-fix') return <PriceFixView />;
  if (route === 'admin/ai-governance') return <AiGovernanceView />;
  const readOnly = READ_ONLY_SCREENS[route];
  if (readOnly) return <ReadOnlyAdminView screen={readOnly} />;
  const notConnected = NOT_CONNECTED_SCREENS[route];
  if (notConnected) return <NotConnectedView screen={notConnected} />;
  return null;
}
