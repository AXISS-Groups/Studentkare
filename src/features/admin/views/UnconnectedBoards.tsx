import React, { Suspense, lazy } from 'react';
import { ConsoleTablePage } from '@/design-system';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { navigate } from '@/lib/utils/workflowRouting';
import { AdminLoading, AdminTabs, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import type { AdminTab } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';
import { ContractsView } from './ContractsView';

const PreventiveOperationsScreen = lazy(() => import('@/features/preventive/screens/PreventiveOperationsScreen').then(module => ({ default: module.PreventiveOperationsScreen })));

/**
 * Super admin boards with no data source behind them yet: Clinician verification
 * (AdminVerification), Partner applications (AdminPartners), Code sentinel
 * (AdminSentinel) and the tenants of Organisations (AdminTenants). Each keeps the board's header, figures ("—", never 0) and columns,
 * says plainly why nothing is listed, and has no decision buttons, because nothing
 * behind them could grant, decline or resolve anything.
 */

/** Clinician verification. No endpoint lists clinician applications or checks the NMC register. */
export function VerificationView() {
  const t = useT();
  const title = t('admin.verification.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.verification.description') }}
      note={<BoardNote icon="shield" action={{ label: t('adminBoard.verification.openAccounts'), onSelect: () => navigate('admin/accounts') }}>{t('adminBoard.verification.note')}</BoardNote>}
      statLabels={[t('admin.verification.statAwaiting'), t('admin.verification.statPassed'), t('admin.verification.statBlocked'), t('admin.verification.statHeld')]}
      statsLabel={t('admin.summaryOf', { title })}
      table={{
        caption: title,
        columns: [
          { label: t('admin.verification.colApplicant') }, { label: t('admin.verification.colRegistration') }, { label: t('admin.verification.colRegisterCheck') },
          { label: t('admin.verification.colIdentity') }, { label: t('admin.col.decision'), align: 'end' },
        ],
        rows: [],
      }}
      empty={boardEmpty(t, t('adminBoard.verification.empty'))}
      unconnected={{ title: t('admin.table.notConnectedTitle', { subject: t('admin.verification.subject') }), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('adminBoard.verification.what'), 'AdminVerification', () => undefined)}
      loadingLabel={t('adminBoard.verification.loading')}
    />
  </div>;
}

const PARTNER_TABS: AdminTab[] = [{ route: 'admin/partners', label: 'admin.partners.tabApplications' }, { route: 'admin/preventive', label: 'admin.partners.tabProviders' }];
export const PARTNER_ROUTES: RoutePath[] = PARTNER_TABS.map(tab => tab.route);

/**
 * Partner applications. No endpoint receives or lists partnership-form applications, so
 * there is nothing to decide or export ("Export decisions" is not shown). The providers
 * already on the platform stay reachable as the second tab (the older preventive panel).
 */
export function PartnersView({ route }: { route: RoutePath }) {
  const t = useT();
  const title = t('admin.partners.title');
  const providers = route === 'admin/preventive';
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.partners.description'), actions: <AdminTabs label={t('admin.tabs.sections', { title })} tabs={PARTNER_TABS} current={route} /> }}
      tabPanel={{ id: 'sk-admin-tabpanel', labelledBy: `sk-admin-tab-${route.replace(/\//g, '-')}` }}
      note={providers ? undefined : <BoardNote icon="hand-pointer">{t('adminBoard.partners.note')}</BoardNote>}
      statLabels={providers ? undefined : [t('admin.partners.statMonth'), t('admin.partners.statApproved'), t('admin.partners.statDeclined'), t('admin.partners.statMedian')]}
      statsLabel={t('admin.partners.summary')}
      alternate={providers ? <LegacyPanel><Suspense fallback={<AdminLoading label={t('admin.partners.loadingProviders')} />}><PreventiveOperationsScreen /></Suspense></LegacyPanel> : undefined}
      table={{
        caption: title,
        columns: [
          { label: t('admin.col.organisation') }, { label: t('admin.col.category') }, { label: t('admin.col.credentialCheck') },
          { label: t('admin.col.reach') }, { label: t('admin.col.decision'), align: 'end' },
        ],
        rows: [],
      }}
      empty={boardEmpty(t, t('adminBoard.partners.empty'))}
      unconnected={{ title: t('admin.table.notConnectedTitle', { subject: t('admin.partners.subject') }), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('adminBoard.partners.what'), 'AdminPartners', () => undefined)}
      loadingLabel={t('adminBoard.partners.loading')}
    />
  </div>;
}

/**
 * Code sentinel. The /v1/admin/sentinel/* endpoints scan a few built-in sample files,
 * not this repository, so their findings, scores and "passed" checklist are not real
 * and are not shown.
 */
export function SentinelView() {
  const t = useT();
  const title = t('admin.sentinel.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.sentinel.description') }}
      note={<BoardNote icon="shield-2">{t('adminBoard.sentinel.note')}</BoardNote>}
      statLabels={[t('admin.sentinel.statTracked'), t('admin.sentinel.statResolved'), t('admin.sentinel.statBlocking'), t('admin.sentinel.statSecrets')]}
      statsLabel={t('admin.summaryOf', { title })}
      table={{
        caption: title,
        columns: [{ label: t('admin.sentinel.colFinding') }, { label: t('admin.sentinel.colWhere') }, { label: t('admin.sentinel.colAge') }, { label: t('admin.col.state'), align: 'end' }],
        rows: [],
      }}
      empty={boardEmpty(t, t('adminBoard.sentinel.empty'))}
      unconnected={{ title: t('admin.table.notConnectedTitle', { subject: t('admin.sentinel.subject') }), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('adminBoard.sentinel.what'), 'AdminSentinel', () => undefined)}
      loadingLabel={t('adminBoard.sentinel.loading')}
    />
  </div>;
}

const ORGANISATION_TABS: AdminTab[] = [{ route: 'admin/organisations', label: 'admin.orgs.tabTenants' }, { route: 'admin/billing', label: 'admin.orgs.tabInquiries' }];
export const ORGANISATION_ROUTES: RoutePath[] = ORGANISATION_TABS.map(tab => tab.route);

/**
 * Organisations (AdminTenants). There is no tenant record: nothing lists campuses with
 * their plan, renewal, per-campus flags or tenancy state, so the tenants tab keeps the
 * board's figures and columns, empty. Enterprise inquiries and contracts, which do have
 * an API, are the second tab.
 */
export function TenantsView({ route }: { route: RoutePath }) {
  const t = useT();
  const title = t('admin.orgs.title');
  const contracts = route === 'admin/billing';
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.orgs.description'), actions: <AdminTabs label={t('admin.tabs.sections', { title })} tabs={ORGANISATION_TABS} current={route} /> }}
      tabPanel={{ id: 'sk-admin-tabpanel', labelledBy: `sk-admin-tab-${route.replace(/\//g, '-')}` }}
      note={contracts ? undefined : <BoardNote icon="box">{t('adminBoard.tenants.note')}</BoardNote>}
      statLabels={contracts ? undefined : [t('admin.orgs.statLive'), t('admin.orgs.statVerified'), t('admin.orgs.statExpired'), t('admin.orgs.statDeleted')]}
      statsLabel={t('admin.orgs.summary')}
      alternate={contracts ? <ContractsView /> : undefined}
      table={{
        caption: t('admin.orgs.tabTenants'),
        columns: [
          { label: t('admin.col.institution') }, { label: t('admin.col.plan') }, { label: t('admin.col.students') }, { label: t('admin.col.renewal') },
          { label: t('admin.col.featureFlags') }, { label: t('admin.col.state') },
        ],
        rows: [],
      }}
      empty={boardEmpty(t, t('adminBoard.tenants.empty'))}
      unconnected={{ title: t('admin.table.notConnectedTitle', { subject: t('admin.orgs.subject') }), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('adminBoard.tenants.what'), 'AdminTenants', () => undefined)}
      loadingLabel={t('adminBoard.tenants.loading')}
    />
  </div>;
}
