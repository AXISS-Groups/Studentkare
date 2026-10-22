import React, { ReactElement } from 'react';
import type { RoutePath } from '../../../lib/utils/workflowRouting';
import { SupportPanel } from '../MemberPanels';
import { AccountsView } from '../../../features/admin/views/AccountsView';
import { AuditExplorerView } from '../../../features/admin/views/AuditExplorerView';
import { CatalogueView } from '../../../features/admin/views/CatalogueView';
import { ActivityFeedView } from '../../../features/admin/views/ActivityFeedView';
import { AiGovernanceView } from '../../../features/admin/views/AiGovernanceView';
import { IntakeView } from '../../../features/admin/views/IntakeView';
import { KnowledgeView } from '../../../features/admin/views/KnowledgeView';
import { WorkRequestsView } from '../../../features/admin/views/WorkRequestsView';
import { OperationsOverviewView } from '../../../features/admin/views/OperationsOverviewView';
import { PlansPricingView } from '../../../features/admin/views/PlansPricingView';
import { PriceFixView } from '../../../features/admin/views/PriceFixView';
import { OpenSafetyStatusView, SafetyEventsView } from '../../../features/admin/views/SafetyEventsView';
import { MessageTemplatesView } from '../../../features/admin/views/MessageTemplatesView';
import { CaseView } from '../../../features/admin/views/CaseView';
import { FeatureFlagsView } from '../../../features/admin/views/FeatureFlagsView';
import { BillingLedgerView } from '../../../features/admin/views/BillingLedgerView';
import { BreakGlassLogView } from '../../../features/admin/views/BreakGlassLogView';
import { LabReviewerAssignmentView } from '../../../features/admin/views/LabReviewerAssignmentView';
import { MessageOutboxView } from '../../../features/admin/views/MessageOutboxView';
import { ClaimsAdjudicationView } from '../../../features/admin/views/ClaimsAdjudicationView';
import { ORGANISATION_ROUTES, PARTNER_ROUTES, PartnersView, SentinelView, TenantsView, VerificationView } from '../../../features/admin/views/UnconnectedBoards';
import { TokensView } from '../../../features/admin/views/TokensView';
import { ApiKeysView } from '../../../features/admin/views/ApiKeysView';
import { ErasureQueueView } from '../../../features/admin/views/ErasureQueueView';
import { INTEGRATION_ROUTES, IntegrationsView } from '../../../features/admin/views/IntegrationsView';
import { RuleLView } from '../../../features/admin/views/RuleLView';
import { TeamAccountsView } from '../../../features/team-accounts/TeamAccountsView';
import { AdminCareDirectoryScreen } from '../../../features/careDirectory/admin/CareDirectoryAdminView';
import { CheckinsView, ConsentPolicyView, HandoverView, SurveillanceView } from '../../../features/admin/views/GovernanceBoards';
import { useT } from '../../../i18n';
import { AdminPage, LegacyPanel } from './AdminPage';

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

/** The canonical screen for any Super Admin route, or null for a non-admin route. */
export function superAdminScreen(route: RoutePath): ReactElement | null {
  if (route === 'admin') return <OperationsOverviewView />;
  if (OPERATIONS_ROUTES.includes(route)) return <OperationsScreen route={route} />;
  if (ORGANISATION_ROUTES.includes(route)) return <TenantsView route={route} />;
  if (PARTNER_ROUTES.includes(route)) return <PartnersView route={route} />;
  if (INTEGRATION_ROUTES.includes(route)) return <IntegrationsView route={route} />;
  if (route === 'admin/api-keys') return <ApiKeysView />;
  if (route === 'admin/care-directory') return <AdminCareDirectoryScreen />;
  if (route === 'admin/audit') return <AuditExplorerView />;
  if (route === 'admin/surveillance') return <SurveillanceView />;
  if (route === 'admin/tokens') return <TokensView />;
  if (route === 'admin/sentinel') return <SentinelView />;
  if (route === 'admin/verification') return <VerificationView />;
  if (route === 'admin/claims') return <ClaimsAdjudicationView />;
  if (route === 'admin/ledger') return <BillingLedgerView />;
  if (route === 'admin/break-glass-log') return <BreakGlassLogView />;
  if (route === 'admin/case') return <CaseView />;
  if (route === 'admin/flags') return <FeatureFlagsView />;
  if (route === 'admin/templates') return <MessageTemplatesView />;
  if (route === 'admin/accounts') return <AccountsView />;
  if (route === 'admin/team-accounts') return <TeamAccountsView />;
  if (route === 'admin/erasure') return <ErasureQueueView />;
  if (route === 'admin/catalog') return <CatalogueView />;
  if (route === 'admin/intake') return <IntakeView />;
  if (route === 'admin/knowledge') return <KnowledgeView />;
  if (route === 'admin/plans') return <PlansPricingView />;
  if (route === 'admin/price-fix') return <PriceFixView />;
  if (route === 'admin/ai-governance') return <AiGovernanceView />;
  if (route === 'admin/lab-reviews') return <LabReviewerAssignmentView />;
  if (route === 'admin/outbox') return <MessageOutboxView />;
  if (route === 'admin/rule-l') return <RuleLView />;
  if (route === 'admin/consent-policy') return <ConsentPolicyView />;
  if (route === 'admin/handover') return <HandoverView />;
  if (route === 'admin/checkins') return <CheckinsView />;
  return null;
}
