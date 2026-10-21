import React from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, DataTable } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import type { IntegrationCheck } from '@/data/types/workflowTypes';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { AdminTabs, LegacyPanel } from '@/screens/workspace/admin/AdminPage';
import type { AdminTab } from '@/screens/workspace/admin/AdminPage';
import { IntegrationsSettingsModule } from '@/screens/admin/IntegrationsSettingsModule';
import { TelemetryConsole } from '@/screens/workspace/TelemetryConsole';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { opsRepository } from '../model/opsRepository';
import { knowledgeRepository } from '../model/knowledgeRepository';
import { contractsRepository } from '../model/contractsRepository';
import { governanceRepository } from '../model/governanceRepository';
import { count } from '../model/format';
import { BoardNote } from './AdminBoard';
import { BoardFailure, BoardLoading, GovCard, GovLines, ViewLink, useResource } from './GovBoard';
import './gov-board.css';

/** The two views of Integrations: the board, and the older provider settings and probes it still needs. */
const INTEGRATION_TABS: AdminTab[] = [{ route: 'admin/integrations', label: 'gov.integrations.tabBoard' }, { route: 'admin/telemetry', label: 'gov.integrations.tabSettings' }];
export const INTEGRATION_ROUTES: RoutePath[] = INTEGRATION_TABS.map(tab => tab.route);

/** What each probed dependency is, and what breaks if it stops. A probe not listed shows its own name. */
const DEPENDENCY: Record<string, { name: MessageKey; blast: MessageKey }> = {
  model_gateway: { name: 'gov.integrations.modelGateway', blast: 'gov.integrations.modelGatewayBlast' },
  messaging_openwa: { name: 'gov.integrations.whatsapp', blast: 'gov.integrations.whatsappBlast' },
  email_postal: { name: 'gov.integrations.email', blast: 'gov.integrations.emailBlast' },
  analytics_posthog: { name: 'gov.integrations.analytics', blast: 'gov.integrations.analyticsBlast' },
  firebase: { name: 'gov.integrations.firebase', blast: 'gov.integrations.firebaseBlast' },
  rule_l_firewall: { name: 'gov.integrations.ruleL', blast: 'gov.integrations.ruleLBlast' },
  abdm_hfr: { name: 'gov.integrations.hfr', blast: 'gov.integrations.hfrBlast' },
};
/** A broken Rule L firewall is a safety alert; any other broken dependency needs attention. */
const SAFETY_CHECKS = new Set(['rule_l_firewall']);

export function dependencyState(check: IntegrationCheck): { label: MessageKey; tone: SkTone } {
  if (check.status === 'online') return { label: 'gov.integrations.healthy', tone: 'positive' };
  if (check.status === 'unavailable') return { label: 'gov.integrations.notConfigured', tone: 'neutral' };
  if (check.status === 'degraded') return { label: 'gov.integrations.degraded', tone: SAFETY_CHECKS.has(check.name) ? 'danger' : 'attention' };
  return { label: 'gov.integrations.notProbed', tone: 'neutral' };
}

/**
 * Integrations (design: Integrations, Tier 1). The dependency table is the server's live
 * probes (GET /ops/integration-health), plus the payment provider (from the plan
 * catalogue) and the old proxy routes (GET /apilayer/status); nothing is listed that
 * isn't probed (no ABDM gateway, LDAP or migration row; the ABDM Health Facility Registry row
 * is the care directory's connector, which reports configured or not and never probes). The index card is the knowledge index
 * status; its warning appears only when approved sources are really missing from the
 * index. The older provider settings panel (the only place to configure a provider)
 * stays as the second tab until its replacement exists.
 */
export const IntegrationsView = observer(function IntegrationsView({ route }: { route: RoutePath }) {
  const t = useT();
  const title = t('admin.integrations.title');
  const tabs = <AdminTabs label={t('admin.tabs.sections', { title })} tabs={INTEGRATION_TABS} current={route} />;
  if (route === 'admin/telemetry') {
    return <div className="sk-ds sk-admin-page sk-gov">
      <ConsolePageHeader eyebrow={t('gov.integrations.eyebrow')} title={title} actions={tabs} />
      <div id="sk-admin-tabpanel" role="tabpanel" aria-labelledby="sk-admin-tab-admin-telemetry" className="sk-gov">
        <LegacyPanel><IntegrationsSettingsModule /></LegacyPanel>
        <LegacyPanel><TelemetryConsole /></LegacyPanel>
      </div>
    </div>;
  }
  return <IntegrationsBoard tabs={tabs} />;
});

const IntegrationsBoard = observer(function IntegrationsBoard({ tabs }: { tabs: React.ReactNode }) {
  const t = useT();
  const health = useResource(opsRepository.integrationHealth);
  const index = useResource(knowledgeRepository.indexStatus);
  const plans = useResource(contractsRepository.plans);
  const proxies = useResource(governanceRepository.apiLayer);
  const title = t('admin.integrations.title');

  if (health.status === 'loading') return <BoardLoading label={t('gov.integrations.loading')} />;
  if (health.status === 'error') return <BoardFailure t={t} what={t('gov.integrations.what')} screen="Integrations" onRetry={health.reload} detail={health.error} />;

  const rows: DataTableRow[] = (health.data?.summary.checks ?? []).map(check => {
    const known = DEPENDENCY[check.name];
    const state = dependencyState(check);
    return {
      id: check.name,
      cells: [
        { text: known ? t(known.name) : check.name, weight: 'strong', sub: check.detail },
        { text: known ? t(known.blast) : '—' },
        { pill: { label: t(state.label), tone: state.tone } },
      ],
    };
  });
  if (plans.data) {
    rows.push({
      id: 'payments',
      cells: [
        { text: t('gov.integrations.payments'), weight: 'strong', sub: t('gov.integrations.paymentsMeta') },
        { text: t('gov.integrations.paymentsBlast') },
        { pill: plans.data.checkoutAvailable ? { label: t('gov.integrations.configured'), tone: 'positive' } : { label: t('gov.integrations.notConfigured'), tone: 'neutral' } },
      ],
    });
  }
  if (proxies.data) {
    rows.push({
      id: 'proxies',
      cells: [
        { text: t('gov.integrations.proxies', { count: count(proxies.data.supported_features.length) }), weight: 'strong', sub: proxies.data.supported_features.slice(0, 3).join(', ') },
        { text: t('gov.integrations.proxiesBlast') },
        { pill: { label: t('gov.integrations.unused'), tone: 'attention' } },
      ],
    });
  }
  const idx = index.data;
  return <div className="sk-ds sk-admin-page sk-gov">
    <ConsolePageHeader eyebrow={t('gov.integrations.eyebrow')} title={title} actions={tabs} />
    <div id="sk-admin-tabpanel" role="tabpanel" aria-labelledby="sk-admin-tab-admin-integrations" className="sk-gov-grid sk-gov-grid--split">
      <div className="sk-gov-stack">
        <DataTable variant="plain" caption={t('gov.integrations.caption')}
          columns={[{ label: t('gov.integrations.colDependency'), width: '32%' }, { label: t('gov.integrations.colStops') }, { label: t('admin.col.state'), align: 'end' }]}
          rows={rows} emptyMessage={{ title: t('gov.integrations.empty'), body: t('adminBoard.notConnectedBody') }} />
        {proxies.data?.supported_features.length ? <p className="sk-gov-fine">{t('gov.integrations.proxiesNote')} <ViewLink route="admin/api-keys" label={t('gov.integrations.manageKeys')} /></p> : null}
      </div>
      <GovCard eyebrow={t('gov.integrations.indexTitle')}>
        {index.status === 'loading' ? <p className="sk-gov-fine" role="status">{t('admin.kb.indexLoading')}</p>
          : index.status === 'error' || !idx ? <p className="sk-gov-error" role="alert">{t('admin.kb.indexError')}</p>
            : <>
              <p className="sk-gov-big"><strong>{count(idx.indexedSources)}</strong><span>{t('gov.integrations.indexed')}</span></p>
              <GovLines label={t('gov.integrations.indexTitle')} lines={[
                { label: t('gov.ai.waitingReindex'), value: count(idx.missing.length), tone: idx.missing.length ? 'attention' : undefined },
                { label: t('admin.kb.chunks'), value: count(idx.chunks) },
                { label: t('gov.integrations.method'), value: `${idx.semantic ? t('admin.kb.semantic') : t('admin.kb.keyword')} · ${idx.embedder}` },
              ]} />
              {idx.missing.length ? <BoardNote icon="alert-triangle" tone="attention">{t('gov.integrations.reindexNote', { count: count(idx.missing.length) })}</BoardNote> : null}
              <ViewLink route="admin/knowledge" label={t('gov.integrations.openKnowledge')} />
            </>}
      </GovCard>
    </div>
  </div>;
});
