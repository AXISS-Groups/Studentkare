import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, Chip, ErrorState, OfflineBanner, Sheet, Skeleton, TextField } from '@/design-system';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import {
  GlossTile, HeroButton, M2Card, M2EmptyState, M2Grid, M2Header, M2HeroPanel, M2Heading, M2ListRow, M2Note, M2Pill, M2SearchField, M2StatCard, M2Table, M2Tabs, M2WideColumn,
  M2_NAV_CLEARANCE, m2TableText, m2Text, useM2Layout, useOwnPhoneChrome, webAttrs,
} from '@/design-system/m2';
import type { ServiceHue } from '@/design-system/m2';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { fullDateFromEpoch } from '@/features/labResults/viewmodel/trendScreenModels';
import { HealthVaultViewModel, SHARE_DAYS, VAULT_CATEGORIES, vaultKindOf } from '../viewmodel/HealthVaultViewModel';
import type { VaultCategory, VaultDocument } from '../viewmodel/HealthVaultViewModel';
import { PrescriptionsTab } from './PrescriptionsTab';
import type { PrescriptionsTabLinks } from './PrescriptionsTab';

export type VaultTab = 'documents' | 'prescriptions' | 'who' | 'family';

export interface HealthVaultLinks {
  back?: () => void;
  /** Add a document: the report upload (web) or the camera capture (app). Omitted: no Add. */
  addDocument?: () => void;
  /** Save the export the server returned as a file (web). Omitted: no Export. */
  saveExport?: (data: unknown) => void;
  /** Open a document's file by its id. Omitted: no Download. */
  download?: (documentId: string) => void;
  visitSummaries?: () => void;
  verify?: () => void;
}

export interface HealthVaultViewProps {
  viewModel: HealthVaultViewModel;
  online: boolean;
  links: HealthVaultLinks;
  /** The tab to open; the web keeps it in `?tab=`. */
  tab: VaultTab;
  onTabChange: (tab: VaultTab) => void;
  /** The Prescriptions tab's own links (§7). Omitted: the tab is not drawn. */
  prescriptions?: { links: PrescriptionsTabLinks; reloadKey?: number; directory?: { pharmacies?: React.ReactNode; labs?: React.ReactNode } };
  /** The "Who can see what" (consent inbox, §15) and Family (care circle, §16) panels, drawn as they are until their own sections ship. */
  panels?: { who?: React.ReactNode; family?: React.ReactNode };
  /** Canvas art: the hero (`image-8cf36c.png`), the first-time card (`a-doctor-on-a-screen…png`), the Prescriptions hero (`image-a3e6ba.png`). */
  art?: { hero?: ArtSource; empty?: ArtSource; rx?: ArtSource };
  /** Laid out wide in the desktop web shell: stat cards in one row, the documents as a table, two-column tabs. */
  wide?: boolean;
  /** The student is verified (the first-time card's "Get verified first" step otherwise). */
  verified?: boolean;
  locale: string;
}

const KIND: Record<VaultCategory, { label: MessageKey; chip: MessageKey; icon: SkIconName; hue: ServiceHue }> = {
  LAB: { label: 'swt.vault.type.LAB', chip: 'swt.vault.chip.LAB', icon: 'flask', hue: 'violet' },
  PRESCRIPTION: { label: 'swt.vault.type.PRESCRIPTION', chip: 'swt.vault.chip.PRESCRIPTION', icon: 'file-text', hue: 'green' },
  VACCINE: { label: 'swt.vault.type.VACCINE', chip: 'swt.vault.chip.VACCINE', icon: 'syringe', hue: 'rose' },
  CAMP_REPORT: { label: 'swt.vault.type.CAMP_REPORT', chip: 'swt.vault.chip.CAMP_REPORT', icon: 'graduation-cap', hue: 'amber' },
  DISCHARGE_SUMMARY: { label: 'swt.vault.type.DISCHARGE_SUMMARY', chip: 'swt.vault.chip.DISCHARGE_SUMMARY', icon: 'file', hue: 'sky' },
  OTHER: { label: 'swt.vault.type.OTHER', chip: 'swt.vault.chip.OTHER', icon: 'file', hue: 'orange' },
};

/** The four "Health documents" cards (M2Profile's), each a filter: lab reports, prescriptions, vaccine documents, scans and other. */
const STAT_CARDS: ReadonlyArray<{ key: string; label: MessageKey; icon: SkIconName; hue: ServiceHue; categories: readonly VaultCategory[] }> = [
  { key: 'lab', label: 'm2.prof.docLab', icon: 'flask', hue: 'violet', categories: ['LAB'] },
  { key: 'rx', label: 'm2.prof.docRx', icon: 'file-text', hue: 'green', categories: ['PRESCRIPTION'] },
  { key: 'vaccines', label: 'm2.prof.docVaccines', icon: 'syringe', hue: 'rose', categories: ['VACCINE'] },
  { key: 'scans', label: 'm2.prof.docScans', icon: 'file', hue: 'orange', categories: ['CAMP_REPORT', 'DISCHARGE_SUMMARY', 'OTHER'] },
];

type Filter = VaultCategory | 'ALL';

/**
 * Health vault (design page 2 RecordsVault + 3b WebVault, Tier 1; Tier 1
 * parity plan 2026-10-24 §6–7, Q1/Q2/Q4; design boards T1Vault /
 * T1VaultDesktop / T1VaultEmpty approved 24 Oct 2026): one view at both widths
 * and on Expo, on one view-model. The student's own documents
 * (GET /health/documents) and the shares they granted (GET /records/shares);
 * Share (one clinician, 1–90 days) and Stop sharing (confirm; the server is
 * read back, nothing flips locally) on each document; tabs for Prescriptions,
 * Who can see what, Family, and the Visit summaries link.
 *
 * Not drawn, on purpose: "Linked to ABDM" (no ABHA link exists server-side,
 * D9-1) and the Source column (a document records no source). The row's "…"
 * menu of the board is not in the icon manifest, so the row itself opens its
 * actions sheet on a phone; the desktop table shows them as buttons.
 */
export const HealthVaultView = observer(function HealthVaultView({ viewModel: vm, online, links, tab, onTabChange, prescriptions, panels, art, wide = false, verified = true, locale }: HealthVaultViewProps) {
  const t = useT();
  useOwnPhoneChrome();
  const layout = useM2Layout();
  const desktop = layout === 'desktop';
  const gutter = layout === 'phone' ? styles.gutter : null;
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [actionsFor, setActionsFor] = useState<VaultDocument | null>(null);
  const [sharing, setSharing] = useState<VaultDocument | null>(null);
  const [revoking, setRevoking] = useState<VaultDocument | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const items = vm.documents ?? [];
  const counts = vm.categoryCounts;
  const needle = query.trim().toLowerCase();
  const shown = useMemo(() => items.filter((doc) => (filter === 'ALL' || vaultKindOf(doc.category) === filter) && (!needle || doc.title.toLowerCase().includes(needle))), [items, filter, needle]);
  const day = (seconds: number) => fullDateFromEpoch(seconds, locale);
  const canWrite = online;
  const reason = t('m2v.up.needsConnection');
  const revokeOutcome = vm.revokeOutcome;

  const exportAll = async () => {
    setExportFailed(false);
    const data = await vm.exportAll();
    if (data === null) { setExportFailed(true); return; }
    links.saveExport?.(data);
  };

  const tabs: { key: VaultTab; label: string }[] = [
    { key: 'documents', label: t('swt.vault.stat.documents') },
    ...(prescriptions ? [{ key: 'prescriptions' as const, label: t('m2.prof.docRx') }] : []),
    ...(panels?.who ? [{ key: 'who' as const, label: t('sf.consent.title') }] : []),
    ...(panels?.family ? [{ key: 'family' as const, label: t('hub.tab.family') }] : []),
  ];

  const header = <M2Header backLabel={t('m2.ask.back')} onBack={links.back} title={t('swt.vault.title')} eyebrow={desktop || !vm.documents ? undefined : t('swt.vault.sub', { count: vm.total })} testID="vault-header" />;

  const hero = (
    <M2HeroPanel
      icon="lock"
      title={t('swt.vault.title')}
      sub={vm.documents ? t('swt.vault.sub', { count: vm.total }) : t('swt.vault.subEmpty')}
      art={art?.hero}
      testID="vault-hero"
      actions={(
        <>
          {links.addDocument ? <HeroButton label={t('swt.vault.add')} icon="plus" onPress={links.addDocument} disabled={!canWrite} testID="vault-add" /> : null}
          {links.saveExport ? <HeroButton label={vm.exporting ? t('swt.vault.exporting') : t('swt.vault.export')} icon="download" variant="glass" onPress={() => void exportAll()} disabled={!canWrite} busy={vm.exporting} testID="vault-export" /> : null}
          {!canWrite && (links.addDocument || links.saveExport) ? <Text style={styles.heroReason}>{reason}</Text> : null}
        </>
      )}
    />
  );

  const statCards = (
    <View {...webAttrs({ role: 'group', 'aria-label': t('swt.vault.statsLabel') })} testID="vault-stats">
      {desktop ? (
        <M2Grid columns={{ desktop: 5, tablet: 3, phone: 2 }}>
          {STAT_CARDS.map((card) => <StatFilter key={card.key} card={card} counts={counts} filter={filter} onFilter={setFilter} />)}
          <M2Card fill style={styles.sharedCard} testID="vault-shared-now">
            <GlossTile icon="share-nodes" hue="amber" size={38} iconSize={18} />
            <View><Text style={m2Text.meta}>{t('swt.vault.stat.shared')}</Text><Text style={styles.sharedCount}>{vm.sharedNow}</Text></View>
            <View><Text style={m2Text.meta}>{t('swt.vault.stat.last')}</Text><Text style={styles.sharedDate}>{vm.lastAdded ? day(vm.lastAdded) : '—'}</Text></View>
          </M2Card>
        </M2Grid>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, gutter]} style={layout === 'phone' ? styles.railBleed : null}>
          {STAT_CARDS.map((card) => <StatFilter key={card.key} card={card} counts={counts} filter={filter} onFilter={setFilter} width={118} />)}
        </ScrollView>
      )}
    </View>
  );

  const documentsTab = (
    <View style={styles.stack} testID="vault-documents">
      {desktop ? (
        <View style={styles.toolbar}>
          <View style={styles.chips} {...webAttrs({ role: 'group', 'aria-label': t('swt.vault.filterLabel') })}>{filterChips()}</View>
          <View style={styles.searchWide}><M2SearchField label={t('swt.vault.searchLabel')} placeholder={t('swt.vault.searchPlaceholder')} value={query} onChangeText={setQuery} testID="vault-search" /></View>
        </View>
      ) : (
        <>
          <M2SearchField label={t('swt.vault.searchLabel')} placeholder={t('swt.vault.searchPlaceholder')} value={query} onChangeText={setQuery} testID="vault-search" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, gutter]} style={layout === 'phone' ? styles.railBleed : null} {...webAttrs({ role: 'group', 'aria-label': t('swt.vault.filterLabel') })}>
            {filterChips()}
          </ScrollView>
        </>
      )}
      {exportFailed || vm.exportFailed ? <M2Note tone="danger" icon="alert-triangle" announce testID="vault-export-failed">{t('swt.vault.exportFailed')}</M2Note> : null}
      {revokeOutcome ? <M2Note tone="danger" icon="alert-triangle" announce testID="vault-revoke-failed">{t('swt.vault.revokePartial', { names: revokeOutcome.stillShared.join(', ') })}</M2Note> : null}
      {shown.length === 0 ? (
        <M2EmptyState animation="anim-search-off" hue="indigo" title={t('swt.vault.noMatchTitle')} body={t('swt.vault.noMatchBody')} action={{ label: t('swt.vault.showAll'), onPress: () => { setFilter('ALL'); setQuery(''); } }} testID="vault-no-match" />
      ) : desktop ? (
        <M2Card style={styles.tableCard}>
          <M2Table<VaultDocument>
            caption={t('swt.vault.caption')}
            rows={shown}
            rowKey={(doc) => doc.id}
            testID="vault-table"
            columns={[
              { key: 'document', header: t('swt.vault.col.document'), flex: 2.4, cell: (doc) => (
                <View style={styles.docCell}>
                  <GlossTile icon={KIND[vaultKindOf(doc.category)].icon} hue={KIND[vaultKindOf(doc.category)].hue} size={36} iconSize={17} />
                  <Text style={m2TableText.strong} numberOfLines={2}>{doc.title}</Text>
                </View>
              ) },
              { key: 'type', header: t('swt.vault.col.type'), cell: (doc) => <Text style={m2TableText.cell}>{t(KIND[vaultKindOf(doc.category)].label)}</Text> },
              { key: 'date', header: t('swt.vault.col.date'), cell: (doc) => <Text style={m2TableText.mono}>{day(doc.createdAt)}</Text> },
              { key: 'shared', header: t('swt.vault.col.shared'), cell: (doc) => <SharedPill count={vm.activeSharesOf(doc.id).length} /> },
              { key: 'actions', header: t('swt.vault.col.actions'), align: 'right', flex: 2.2, cell: (doc) => (
                <View style={styles.rowActions}>
                  {links.download ? <Button label={t('swt.vault.download')} variant="ghost" icon={<Icon name="download" size={15} color={color.action} strokeWidth={2.4} />} onPress={() => links.download?.(doc.id)} testID={`vault-download-${doc.id}`} /> : null}
                  {vm.activeSharesOf(doc.id).length
                    ? <Button label={t('swt.vault.stopSharing')} variant="dangerOutline" disabled={!canWrite} onPress={() => { vm.clearRevokeOutcome(); setRevoking(doc); }} testID={`vault-stop-${doc.id}`} />
                    : <Button label={t('swt.vault.shareWith')} variant="secondary" disabled={!canWrite} icon={<Icon name="share-nodes" size={15} color={canWrite ? color.action : color.text2} strokeWidth={2.2} />} onPress={() => setSharing(doc)} testID={`vault-share-${doc.id}`} />}
                </View>
              ) },
            ]}
          />
        </M2Card>
      ) : (
        <View style={styles.stack}>
          <Text style={m2Text.eyebrow}>{t('swt.vault.caption')}</Text>
          <View style={styles.rows} testID="vault-rows">
            {shown.map((doc) => (
              <M2ListRow key={doc.id} icon={KIND[vaultKindOf(doc.category)].icon} hue={KIND[vaultKindOf(doc.category)].hue} tile="gloss" title={doc.title}
                meta={`${t(KIND[vaultKindOf(doc.category)].label)} · ${day(doc.createdAt)}`} onPress={() => setActionsFor(doc)}
                trailing={<View style={styles.trailing}><SharedPill count={vm.activeSharesOf(doc.id).length} /><Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.6} /></View>}
                testID={`vault-row-${doc.id}`} />
            ))}
          </View>
        </View>
      )}
      {vm.total > items.length ? <Text style={m2Text.meta}>{t('swt.vault.capped', { shown: items.length, total: vm.total })}</Text> : null}
      <M2Note tone="info" icon="share-nodes">{t('swt.vault.shareNote')}</M2Note>
    </View>
  );

  function filterChips() {
    return (
      <>
        <Chip label={t('swt.vault.chip.all', { count: items.length })} selected={filter === 'ALL'} onPress={() => setFilter('ALL')} testID="vault-chip-ALL" />
        {VAULT_CATEGORIES.filter((category) => counts.get(category)).map((category) => (
          <Chip key={category} label={t(KIND[category].chip, { count: counts.get(category) ?? 0 })} selected={filter === category} onPress={() => setFilter(category)} testID={`vault-chip-${category}`} />
        ))}
      </>
    );
  }

  const firstTime = (
    <View style={styles.stack} testID="vault-first-time">
      <M2Card style={styles.emptyCard}>
        <View style={styles.emptyArt}>
          <View style={styles.emptyTileLeft}><GlossTile icon="lock" hue="indigo" size={48} iconSize={22} /></View>
          <View style={styles.emptyTileRight}><GlossTile icon="file-text" hue="green" size={38} iconSize={18} /></View>
          {art?.empty ? <Image source={art.empty} resizeMode="contain" accessibilityIgnoresInvertColors {...webAttrs({ 'aria-hidden': 'true' })} style={styles.emptyImage} /> : <Icon3d name="vault-alt--p4" size={88} />}
        </View>
        <M2Heading style={[m2Text.section, styles.centre]}>{t('swt.vault.emptyTitle')}</M2Heading>
        <Text style={[m2Text.body, styles.centre]}>{t('swt.vault.emptyBody')}</Text>
        {links.addDocument ? <Button label={t('swt.vault.upload')} fullWidth disabled={!canWrite} icon={<Icon name="upload" size={16} color={canWrite ? color.onAction : color.text2} strokeWidth={2.4} />} onPress={links.addDocument} testID="vault-upload" /> : null}
        {!verified && links.verify ? <Button label={t('swt.vault.verifyFirst')} variant="secondary" fullWidth onPress={links.verify} testID="vault-verify-first" /> : null}
        {links.saveExport ? <Button label={t('swt.vault.export')} variant="secondary" fullWidth disabled icon={<Icon name="download" size={16} color={color.text2} strokeWidth={2.4} />} onPress={() => undefined} /> : null}
      </M2Card>
      <M2Note tone="info" icon="lock">{t('swt.vault.uploadBody')}</M2Note>
      <M2Note tone="neutral" icon="shield-check">{t('swt.vault.uploadHint')}</M2Note>
    </View>
  );

  let body: React.ReactNode;
  if (vm.loading) {
    body = <View style={gutter}><Skeleton label={t('swt.vault.loading')} lines={['60%', '100%', '100%', '80%']} /></View>;
  } else if (vm.loadFailed) {
    body = <View style={gutter}><ErrorState title={t('swt.vault.errorTitle')} body={t('swt.vault.errorBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /></View>;
  } else if (items.length === 0 && tab === 'documents') {
    body = <View style={gutter}>{firstTime}</View>;
  } else {
    const panel = tab === 'documents' ? documentsTab
      : tab === 'prescriptions' && prescriptions ? <PrescriptionsTab online={online} links={prescriptions.links} art={art?.rx} reloadKey={prescriptions.reloadKey} directory={prescriptions.directory} />
      : tab === 'who' ? panels?.who
      : tab === 'family' ? panels?.family
      : documentsTab;
    body = (
      <>
        {tab === 'documents' ? statCards : null}
        <View style={gutter}>
          <M2Tabs<VaultTab> label={t('hub.tabs')} tabs={tabs} current={tab} onChange={onTabChange} testID="vault-tab" />
        </View>
        <View role="tabpanel" {...webAttrs({ 'aria-label': tabs.find((x) => x.key === tab)?.label })} style={gutter} testID={`vault-panel-${tab}`}>{panel}</View>
        {links.visitSummaries ? (
          <View style={gutter}>
            <M2ListRow icon="stethoscope" hue="sky" tile="gloss" title={t('care.visit.listTitle')} meta={t('care.visit.entryBody')} onPress={links.visitSummaries} testID="vault-visit-summaries" />
          </View>
        ) : null}
      </>
    );
  }

  const offline = !online ? <View style={gutter}><OfflineBanner message={t('m2v.offline')} /></View> : null;
  const sheets = (
    <>
      <ActionsSheet doc={actionsFor} shares={actionsFor ? vm.activeSharesOf(actionsFor.id).length : 0} online={canWrite} reason={reason} links={links}
        onShare={() => { const doc = actionsFor; setActionsFor(null); setSharing(doc); }}
        onStop={() => { const doc = actionsFor; setActionsFor(null); vm.clearRevokeOutcome(); setRevoking(doc); }}
        onClose={() => setActionsFor(null)} />
      <ShareSheet doc={sharing} vm={vm} onClose={() => setSharing(null)} />
      <RevokeSheet doc={revoking} vm={vm} onClose={() => setRevoking(null)} />
    </>
  );

  if (wide) {
    return (
      <M2WideColumn testID="health-vault">
        {header}
        {offline}
        {vm.documents && items.length > 0 && tab === 'documents' ? hero : null}
        {body}
        {sheets}
      </M2WideColumn>
    );
  }
  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="health-vault">
        {header}
        {offline}
        {vm.documents && items.length > 0 && tab === 'documents' ? <View style={gutter}>{hero}</View> : null}
        {body}
      </ScrollView>
      {sheets}
    </>
  );
});

function StatFilter({ card, counts, filter, onFilter, width }: { card: (typeof STAT_CARDS)[number]; counts: Map<VaultCategory, number>; filter: Filter; onFilter: (f: Filter) => void; width?: number }) {
  const t = useT();
  const n = card.categories.reduce((sum, c) => sum + (counts.get(c) ?? 0), 0);
  const first = card.categories[0];
  const selected = filter === first;
  return (
    <M2StatCard icon={card.icon} hue={card.hue} count={n} label={t(card.label)} selected={selected} fill onPress={() => onFilter(selected ? 'ALL' : first)}
      style={width ? { width } : undefined} testID={`vault-stat-${card.key}`} />
  );
}

function SharedPill({ count }: { count: number }) {
  const t = useT();
  return count ? <M2Pill label={t('swt.vault.shared', { count })} tone="attention" /> : <M2Pill label={t('swt.vault.private')} tone="neutral" icon="lock" />;
}

/** A document's actions on a phone (the board's row menu): Download, Share, Stop sharing. */
function ActionsSheet({ doc, shares, online, reason, links, onShare, onStop, onClose }: {
  doc: VaultDocument | null; shares: number; online: boolean; reason: string; links: HealthVaultLinks; onShare: () => void; onStop: () => void; onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet visible={doc !== null} title={doc?.title ?? ''} subtitle={t('swt.vault.menuFor', { title: doc?.title ?? '' })} onClose={onClose} testID="vault-actions-sheet">
      <View style={styles.form}>
        {links.download && doc ? <Button label={t('swt.vault.download')} variant="secondary" fullWidth icon={<Icon name="download" size={16} color={color.action} strokeWidth={2.4} />} onPress={() => { links.download?.(doc.id); onClose(); }} testID="vault-action-download" /> : null}
        <Button label={t('swt.vault.shareWith')} fullWidth disabled={!online} icon={<Icon name="share-nodes" size={16} color={online ? color.onAction : color.text2} strokeWidth={2.2} />} onPress={onShare} testID="vault-action-share" />
        {shares ? <Button label={t('swt.vault.stopSharing')} variant="dangerOutline" fullWidth disabled={!online} onPress={onStop} testID="vault-action-stop" /> : null}
        {!online ? <Text style={m2Text.meta}>{reason}</Text> : null}
      </View>
    </Sheet>
  );
}

/** Share one document with one clinician for 1–90 days: the same fields and limits as before. */
const ShareSheet = observer(function ShareSheet({ doc, vm, onClose }: { doc: VaultDocument | null; vm: HealthVaultViewModel; onClose: () => void }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(String(SHARE_DAYS.initial));
  useEffect(() => { if (doc) { setEmail(''); setDays(String(SHARE_DAYS.initial)); vm.shareError = null; } }, [doc, vm]);
  const n = Number(days);
  const daysValid = Number.isInteger(n) && n >= SHARE_DAYS.min && n <= SHARE_DAYS.max;
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && daysValid;
  const submit = async () => {
    if (!doc || !valid) return;
    if (await vm.share(doc.id, email, n)) onClose();
  };
  return (
    <Sheet visible={doc !== null} title={t('swt.vault.shareTitle', { title: doc?.title ?? '' })} subtitle={t('swt.vault.shareBody')} onClose={() => { if (!vm.sharing) onClose(); }} busy={vm.sharing} testID="vault-share-sheet">
      <View style={styles.form}>
        <TextField label={t('swt.vault.shareEmail')} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" testID="vault-share-email" />
        <TextField label={t('swt.vault.shareDays', { min: SHARE_DAYS.min, max: SHARE_DAYS.max })} value={days} onChangeText={setDays} keyboardType="numeric" hint={t('swt.vault.shareHint')}
          error={days !== '' && !daysValid ? t('swt.vault.shareDays', { min: SHARE_DAYS.min, max: SHARE_DAYS.max }) : undefined} testID="vault-share-days" />
        {vm.shareError !== null ? <M2Note tone="danger" icon="alert-triangle" announce testID="vault-share-failed">{vm.shareError || t('swt.vault.shareFailed')}</M2Note> : null}
        <Button label={vm.sharing ? t('swt.vault.sharing') : t('swt.vault.shareCta')} busy={vm.sharing} disabled={!valid} onPress={() => void submit()} fullWidth testID="vault-share-confirm" />
        <Button label={t('common.cancel')} variant="ghost" disabled={vm.sharing} onPress={onClose} fullWidth />
      </View>
    </Sheet>
  );
});

/** Stop sharing a document: the confirm names the clinicians; the shares are read back from the server afterwards. */
const RevokeSheet = observer(function RevokeSheet({ doc, vm, onClose }: { doc: VaultDocument | null; vm: HealthVaultViewModel; onClose: () => void }) {
  const t = useT();
  const names = doc ? vm.activeSharesOf(doc.id).map((share) => share.clinician).join(', ') : '';
  const busy = Boolean(doc && vm.revokingDocumentId === doc.id);
  const confirm = async () => {
    if (!doc) return;
    await vm.revokeDocument(doc.id);
    onClose();
  };
  return (
    <Sheet visible={doc !== null} title={t('swt.vault.revokeTitle', { title: doc?.title ?? '' })} subtitle={t('swt.vault.revokeBody', { names })} onClose={() => { if (!busy) onClose(); }} busy={busy} testID="vault-revoke-sheet">
      <View style={styles.form}>
        <Button label={busy ? t('swt.vault.stopping') : t('swt.vault.stopSharing')} variant="danger" busy={busy} onPress={() => void confirm()} fullWidth testID="vault-revoke-confirm" />
        <Button label={t('swt.vault.keepSharing')} variant="secondary" disabled={busy} onPress={onClose} fullWidth testID="vault-revoke-keep" />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  gutter: { paddingHorizontal: space.gutterPhone },
  stack: { gap: space.s12 },
  rows: { gap: space.s8 },
  centre: { textAlign: 'center' },
  heroReason: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2, alignSelf: 'center' },
  rail: { flexDirection: 'row', gap: space.s10, paddingBottom: space.s4 },
  railBleed: { marginHorizontal: -space.gutterPhone },
  sharedCard: { padding: space.s16, gap: space.s10, minHeight: 132, justifyContent: 'space-between' },
  sharedCount: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  sharedDate: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.s16, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', gap: space.s8, flexWrap: 'nowrap', alignItems: 'center', flexGrow: 1 },
  searchWide: { width: 320 },
  tableCard: { padding: space.s16 },
  docCell: { flexDirection: 'row', alignItems: 'center', gap: space.s12, flex: 1 },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.s8, flexWrap: 'wrap' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  emptyCard: { padding: space.s20, gap: space.s12, alignItems: 'center' },
  emptyArt: { width: '100%', height: 190, alignItems: 'center', justifyContent: 'flex-end', borderRadius: radius.xl, backgroundColor: color.surface2 },
  emptyTileLeft: { position: 'absolute', left: space.s16, top: space.s16 },
  emptyTileRight: { position: 'absolute', right: space.s20, top: space.s40 },
  emptyImage: { width: 100, height: 186 },
  form: { gap: space.s12 },
});
