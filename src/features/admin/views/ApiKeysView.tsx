import React from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage } from '@/design-system';
import type { DataTableRow, Stat } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { count, readable } from '../model/format';
import { governanceRepository } from '../model/governanceRepository';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';
import { BackLink, useResource } from './GovBoard';

/** Where the old proxy router is mounted (services/apilayer.py). */
const PROXY_PREFIX = '/api/apilayer/';
/** Feature names whose route path is spelled differently from the feature. */
const ROUTE_SPELLING: Record<string, string> = { bad_words: 'badwords' };
export const proxyRoute = (feature: string) => `${PROXY_PREFIX}${ROUTE_SPELLING[feature] ?? feature.replace(/_/g, '-')}`;

/**
 * API access & keys (design: AdminApiKeys, Tier 1). The table lists the proxy routes the
 * server says are mounted (GET /apilayer/status), with their auth as it really is: a
 * super admin session, not a signed service token (the board's "all routes need a
 * service token" is not true and is not shown). Nothing counts calls, blocks or key age,
 * so those read "—". Rotating a key and removing a route need a key service and a
 * backend change that are not built; they are not offered.
 */
export const ApiKeysView = observer(function ApiKeysView() {
  const t = useT();
  const vm = useResource(governanceRepository.apiLayer);
  const status = vm.data;
  const features = status?.supported_features ?? [];
  const stats: Stat[] = [
    { label: t('gov.keys.statRoutes'), value: count(features.length) },
    { label: t('gov.keys.statKey'), value: status ? (status.has_api_key ? t('gov.keys.keySet') : t('gov.keys.keyNotSet')) : null },
    { label: t('gov.keys.statCalls'), value: null },
    { label: t('gov.keys.statBlocked'), value: null },
  ];
  const rows: DataTableRow[] = features.map(feature => ({
    id: feature,
    cells: [
      { text: proxyRoute(feature), weight: 'strong', mono: true },
      { text: readable(feature), sub: t('gov.keys.usedFor') },
      { node: <span className="sk-gov-auth"><Icon name="check" size={14} strokeWidth={2.6} />{t('gov.keys.authSession')}</span> },
      { text: '—', weight: 'muted' },
      { text: '—', weight: 'muted', mono: true },
      { text: '—', weight: 'muted', mono: true },
    ],
  }));
  return <div className="sk-admin-page">
    <div className="sk-gov"><BackLink route="admin/integrations" label={t('admin.integrations.title')} /></div>
    <ConsoleTablePage
      status={vm.status}
      header={{ title: t('gov.keys.title'), subtitle: t('gov.keys.subtitle') }}
      note={<BoardNote icon="info" tone="attention">{t('gov.keys.note')}</BoardNote>}
      stats={stats}
      statLabels={stats.map(stat => stat.label)}
      statsLabel={t('admin.summaryOf', { title: t('gov.keys.title') })}
      table={{
        caption: t('admin.apiKeys.caption'),
        columns: [{ label: t('admin.col.route'), width: '30%' }, { label: t('admin.col.usedFor') }, { label: t('admin.col.auth') }, { label: t('admin.col.keyAge') }, { label: t('admin.col.calls24h') }, { label: t('admin.col.blocked') }],
        rows,
        footnote: t('gov.keys.footnote'),
      }}
      empty={boardEmpty(t, t('gov.keys.empty'))}
      unconnected={{ title: t('gov.keys.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.keys.what'), 'AdminApiKeys', vm.reload, vm.error)}
      loadingLabel={t('gov.keys.loading')}
    />
  </div>;
});
