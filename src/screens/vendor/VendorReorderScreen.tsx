import React from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { PARTNER_EMPTY_TILE } from '@/features/partner/PartnerPage';

/**
 * VendorReorder — reorder rules (design page 6, Tier 3).
 *
 * No endpoint stores reorder rules, stock floors, purchase orders or expiry
 * dates (checked 2026-10-21), so this page is in the console table's
 * not-connected state in every build: the designed figures and columns, "—"
 * for every figure, and no rows — never sample stock or purchase orders.
 */
export interface VendorReorderScreenProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorReorderScreen({ onNavigate }: VendorReorderScreenProps) {
  const t = useT();
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));
  const labels = [t('pc.reorder.stat.below'), t('pc.reorder.stat.out'), t('pc.reorder.stat.expiring'), t('pc.reorder.stat.essential')];
  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status="unconnected"
        header={{ title: t('pc.reorder.title'), subtitle: t('pc.reorder.sub') }}
        statLabels={labels}
        statsLabel={t('pc.reorder.statsLabel')}
        table={{
          caption: t('pc.reorder.caption'),
          columns: [
            { label: t('pc.reorder.col.item') },
            { label: t('pc.reorder.col.onHand'), width: '120px' },
            { label: t('pc.reorder.col.trigger'), width: '120px' },
            { label: t('pc.reorder.col.rule'), width: '200px' },
            { label: t('pc.reorder.col.state'), width: '190px', align: 'end' },
          ],
          rows: [],
        }}
        empty={{ title: t('pc.reorder.emptyTitle'), body: t('pc.reorder.unconnectedBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('partner.vhome.home.emptyCta'), onSelect: () => go('catalogue') } }}
        unconnected={{ title: t('pc.reorder.unconnectedTitle'), body: t('pc.reorder.unconnectedBody') }}
        error={{ title: t('pc.reorder.errorTitle'), reference: t('pc.reorder.ref'), onRetry: () => go('reorder') }}
        loadingLabel={t('console.loading', { title: t('pc.reorder.title') })}
      />
    </main>
  );
}
