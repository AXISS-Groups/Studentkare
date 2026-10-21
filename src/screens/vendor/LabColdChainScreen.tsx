import React from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE, PartnerNote } from '@/features/partner/PartnerPage';
import '@/features/partner/work/partner-work.css';

/**
 * LabColdChain — the cold-chain log (design page 6, Tier 1, approved 2026-10-21).
 *
 * Not connected: there is no cold-box, temperature or breach model on the
 * server, so the page draws the board's layout with every figure "—", the
 * designed columns and an honest note, and never a sample box. It used to draw
 * whatever a caller passed in.
 *
 * Left out until the pathology owner sets them (approved decisions): the
 * required range ("2–8 °C") and breach duration, which belong in the settings
 * registry, and the "free recollection" promise, which needs a commerce-side
 * policy that never learns the test. A "Breached — held" label alone is not a
 * safeguard: when this is built, the server must block result entry for those
 * samples.
 */
export function LabColdChainScreen({ onNavigate }: { onNavigate?: (route: string) => void; onLogout?: () => void }) {
  const t = useT();
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));
  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status="unconnected"
        header={{ title: t('pt.cold.title'), subtitle: t('pt.cold.sub') }}
        note={<PartnerNote tone="info" lead={t('pt.cold.noteLead')}>{t('pt.cold.note')}</PartnerNote>}
        statLabels={[t('pt.cold.stat.transit'), t('pt.cold.stat.breached'), t('pt.cold.stat.held'), t('pt.cold.stat.logged')]}
        statsLabel={t('pt.cold.statsLabel')}
        table={{
          caption: t('pt.cold.caption'),
          columns: [
            { label: t('pt.cold.col.box'), width: '140px' },
            { label: t('pt.cold.col.contents') },
            { label: t('pt.cold.col.required'), width: '150px' },
            { label: t('pt.cold.col.recorded'), width: '190px' },
            { label: t('pt.cold.col.outcome'), width: '170px', align: 'end' },
          ],
          rows: [],
          footnote: t('pt.cold.footnote'),
        }}
        empty={{ title: t('pt.cold.emptyTitle'), body: t('pt.cold.emptyBody'), icon3d: PARTNER_EMPTY_TILE }}
        unconnected={{ title: t('pt.cold.unconnectedTitle'), body: t('pt.cold.unconnectedBody') }}
        error={{ title: t('pt.cold.errorTitle'), reference: t('pt.cold.ref'), onRetry: () => go('cold-chain'), onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.cold.title') })}
      />
    </main>
  );
}
