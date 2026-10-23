import React, { useCallback, useMemo, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import { SkButton } from '@/design-system/primitives';
import { apiRequest } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import { money } from '@/data/types/workflowTypes';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { PARTNER_EMPTY_TILE, PartnerNote, usePartnerLoad } from '@/features/partner/PartnerPage';

/**
 * VendorCatalogue — the partner's listings (design page 6, Tier 3).
 *
 * There is no partner-scoped catalogue endpoint: listings are created and
 * edited by Studentkare ops (`POST/PATCH /ops/catalog` are super-admin only).
 * The partner's published listings are read from the public catalogue
 * (`GET /catalog`, active listings only) and kept where `providerId` is this
 * account — prices and stock exactly as the server holds them. "Low stock"
 * (no threshold is configured) and "Under review" (unpublished listings are
 * not visible to partners) have no source, so they read "—".
 */

/** One row of `GET /catalog` (workflow_api.catalog_payload). */
export interface CatalogueItem {
  id: string;
  providerId: string;
  kind: string;
  name: string;
  brand: string;
  pack: string;
  pricePaise: number;
  stock: number;
  active: boolean;
  requiresPrescription: boolean;
}

export interface CatalogueData {
  items: CatalogueItem[];
  /** Public listings checked, and how many exist: when they differ, the list may be partial. */
  scanned: number;
  total: number;
}

export type CatalogueSource = (providerId: string, signal: AbortSignal) => Promise<CatalogueData>;

/** The endpoint's own page ceiling (workflow_api.catalog: limit ≤ 100). */
const CATALOG_PAGE = 100;
/** How many public pages one visit reads at most; past that the page says the list may be partial. */
const CATALOG_MAX_PAGES = 10;

export const liveCatalogueSource: CatalogueSource = async (providerId, signal) => {
  const mine: CatalogueItem[] = [];
  let scanned = 0;
  let total = 0;
  for (let page = 0; page < CATALOG_MAX_PAGES; page += 1) {
    const result = await apiRequest<{ items: CatalogueItem[]; total: number }>(`/catalog?limit=${CATALOG_PAGE}&offset=${page * CATALOG_PAGE}`, { signal });
    total = result.total;
    scanned += result.items.length;
    mine.push(...result.items.filter((item) => item.providerId === providerId));
    if (result.items.length < CATALOG_PAGE || scanned >= total) break;
  }
  return { items: mine, scanned, total };
};

export interface VendorCatalogueScreenProps {
  source?: CatalogueSource;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function VendorCatalogueScreen({ source = liveCatalogueSource, onNavigate }: VendorCatalogueScreenProps) {
  const t = useT();
  const { user } = useAuth();
  const providerId = user?.id ?? '';
  const load = useCallback((signal: AbortSignal) => source(providerId, signal), [source, providerId]);
  const catalogue = usePartnerLoad<CatalogueData>(providerId ? load : null);
  const [query, setQuery] = useState('');
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const data = catalogue.data;
  const items = useMemo(() => {
    const all = data?.items ?? [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((item) => `${item.name} ${item.brand} ${item.pack}`.toLowerCase().includes(q)) : all;
  }, [data, query]);

  const status: ConsoleTableStatus = !providerId ? 'unconnected' : catalogue.status === 'loading' ? 'loading' : catalogue.status === 'error' ? 'error' : 'ready';
  const outOfStock = (data?.items ?? []).filter((item) => item.stock <= 0).length;
  const rows: DataTableRow[] = items.map((item) => ({
    id: item.id,
    cells: [
      { text: item.name, sub: item.requiresPrescription ? t('pc.cat.rx') : undefined, weight: 'strong' },
      { text: item.brand, tone: 'action' },
      { text: item.pack, weight: 'muted' },
      { text: money(item.pricePaise), weight: 'strong' },
      { text: item.stock.toLocaleString('en-IN'), mono: true, tone: item.stock <= 0 ? 'danger' : undefined },
      { pill: item.stock <= 0 ? { label: t('pc.cat.outOfStock'), tone: 'danger' } : { label: t('pc.cat.published'), tone: 'positive' } },
    ],
  }));
  const partial = data !== null && data.scanned < data.total;

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{
          title: t('pc.cat.title'),
          subtitle: data ? t('pc.cat.sub', { count: data.items.length }) : t('pc.cat.subBlank'),
          actions: <SkButton disabled title={t('console.notAvailable')}>{t('pc.cat.add')}<span className="sk-visually-hidden"> · {t('console.notAvailable')}</span></SkButton>,
        }}
        note={<PartnerNote tone="info">{partial ? t('pc.cat.partial', { scanned: data.scanned, total: data.total }) : t('pc.cat.opsNote')}</PartnerNote>}
        stats={[
          { label: t('pc.cat.stat.published'), value: (data?.items.length ?? 0).toLocaleString('en-IN') },
          { label: t('pc.cat.stat.low'), value: null },
          { label: t('pc.cat.stat.out'), value: outOfStock.toLocaleString('en-IN'), tone: outOfStock ? 'danger' : 'text' },
          { label: t('pc.cat.stat.review'), value: null },
        ]}
        statLabels={[t('pc.cat.stat.published'), t('pc.cat.stat.low'), t('pc.cat.stat.out'), t('pc.cat.stat.review')]}
        statsLabel={t('pc.cat.statsLabel')}
        search={{ value: query, onChange: setQuery, label: t('pc.cat.search'), placeholder: t('pc.cat.search') }}
        table={{
          caption: t('pc.cat.caption'),
          columns: [
            { label: t('pc.cat.col.product') },
            { label: t('pc.cat.col.brand'), width: '150px' },
            { label: t('pc.cat.col.pack'), width: '140px' },
            { label: t('pc.cat.col.price'), width: '100px' },
            { label: t('pc.cat.col.stock'), width: '90px' },
            { label: t('pc.cat.col.status'), width: '130px', align: 'end' },
          ],
          rows,
          footnote: t('pc.cat.footnote'),
        }}
        noMatches={query.trim() ? { title: t('pc.cat.noMatchTitle'), body: t('pc.cat.noMatchBody') } : undefined}
        empty={{ title: t('pc.cat.emptyTitle'), body: t('pc.cat.emptyBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('pc.cat.emptyAction'), onSelect: () => go('support') } }}
        unconnected={{ title: t('pc.cat.unconnectedTitle'), body: t('pc.cat.unconnectedBody') }}
        error={{ title: t('pc.cat.errorTitle'), reference: t('pc.cat.ref'), detail: catalogue.error || undefined, onRetry: catalogue.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pc.cat.title') })}
      />
    </main>
  );
}
