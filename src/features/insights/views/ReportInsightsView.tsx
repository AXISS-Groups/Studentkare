import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { ErrorState, OfflineBanner, Rise, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import {
  GlossTile, HeroButton, M2Card, M2EmptyState, M2Header, M2HeroPanel, M2Heading, M2ListRow, M2Note, M2SectionHead, M2Table, M2Tabs, M2WideColumn, M2_NAV_CLEARANCE,
  m2TableText, m2Text, useM2Layout, useOwnPhoneChrome, webAttrs,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import type { StudentLabTest } from '@/features/studentweb/views/t1/WebMyLabTestsView';
import { pickReport, releasedReports } from '../viewmodel/releasedReports';
import { fullDateFromEpoch } from '@/features/labResults/viewmodel/trendScreenModels';

export type ReportInsightsTab = 'summary' | 'history';

export interface ReportInsightsLinks {
  /** Back to My health (the card this page details). */
  back: () => void;
  /** My lab tests. */
  labTests: () => void;
  /** Book a consult (Doctor consults). */
  talk: () => void;
  /** Add an outside report (the vault / report upload). */
  addOutside: () => void;
  /** Download the report document by its id (never a test name in the URL: Rule L). */
  download: (documentId: string) => void;
}

export interface ReportInsightsViewProps {
  /** GET /lab-orders?limit=50, or null while loading. */
  tests: readonly StudentLabTest[] | null;
  loading: boolean;
  failed: boolean;
  online: boolean;
  onRetry: () => void;
  /** The report asked for (`?id=`), an id only. */
  askedId: string | null;
  links: ReportInsightsLinks;
  /** The side hero's art (canvas `image-aa86cc.png`), decorative. */
  art?: ArtSource;
  /** Laid out wide in the desktop web shell: summary beside the report facts, the history as a full-width table. */
  wide?: boolean;
  /** Date locale for the facts. */
  locale: string;
}

/**
 * Report insights (Tier 1 parity plan 2026-10-24 §3, Q3; design boards
 * T1ReportInsights / T1ReportInsightsDesktop approved 24 Oct 2026): the detail
 * page of My health's "Reviewed lab reports" card, the same data at both
 * widths (GET /lab-orders, the page's own pick rule).
 *
 * Shown: the reviewing doctor's note verbatim (or the "no note" line), who
 * wrote it and when, the report's released and collected dates, Download by
 * document id, the two next steps and the history of released reports.
 * Not drawn, on purpose (unchanged from the 3b page): a body-system table
 * (labs send a document, not data), an AI draft, a report-scoped Ayush, a
 * retest reminder. Nothing here links to a product (Rule L).
 */
export function ReportInsightsView({ tests, loading, failed, online, onRetry, askedId, links, art, wide = false, locale }: ReportInsightsViewProps) {
  const t = useT();
  useOwnPhoneChrome();
  const layout = useM2Layout();
  const [tab, setTab] = useState<ReportInsightsTab>('summary');
  const [chosen, setChosen] = useState<string | null>(askedId);
  const report = useMemo(() => pickReport(tests ?? [], chosen), [tests, chosen]);
  const history = useMemo(() => releasedReports(tests ?? []), [tests]);
  const gutter = layout === 'phone' ? styles.gutter : null;
  const day = (seconds: number) => fullDateFromEpoch(seconds, locale);
  const nameOf = (test: StudentLabTest) => test.testPanel.join(', ') || t('swt.labs.fact.testUnknown');

  const header = (
    <M2Header
      backLabel={t('m2.ask.back')}
      onBack={links.back}
      eyebrow={report ? t('swt.insights.sub', { test: nameOf(report), date: day(report.reviewedAt ?? report.createdAt) }) : undefined}
      title={t('swt.insights.title')}
      testID="m2-ri-header"
    />
  );

  let body: React.ReactNode;
  if (loading && !tests) {
    body = <View style={gutter}><Skeleton label={t('swt.insights.loading')} lines={['60%', '100%', '100%', '80%']} /></View>;
  } else if (failed && !tests) {
    body = <View style={gutter}><ErrorState title={t('swt.insights.errorTitle')} body={t('swt.insights.errorBody')} retryLabel={t('common.tryAgain')} onRetry={onRetry} /></View>;
  } else if (!report) {
    body = (
      <View style={gutter}>
        <M2EmptyState animation="anim-file-text" hue="violet" title={t('swt.insights.emptyTitle')} body={t('swt.insights.emptyBody')} action={{ label: t('swt.insights.openLabs'), onPress: links.labTests }} testID="m2-ri-empty" />
      </View>
    );
  } else {
    const doctor = report.reviewedByDoctor ?? '';
    const released = report.reviewedAt ?? report.createdAt;
    const summary = (
      <View style={styles.stack} testID="m2-ri-summary">
        <Rise index={1}>
          <M2Card style={[styles.card, styles.summaryCard]}>
            <View style={styles.cardHead}>
              <GlossTile icon="stethoscope" hue="violet" size={40} iconSize={20} />
              <M2Heading style={m2Text.section}>{t('swt.insights.summaryTitle')}</M2Heading>
            </View>
            {report.reviewNote ? <Text style={styles.noteText} testID="m2-ri-note">{report.reviewNote}</Text> : <Text style={[m2Text.body, styles.muted]} testID="m2-ri-no-note">{t('swt.insights.noNote')}</Text>}
            <View style={styles.writtenBy}>
              <Icon name="stethoscope" size={16} color={color.text3} />
              <Text style={m2Text.meta}>{doctor ? t('swt.insights.writtenBy', { name: doctor, date: day(released) }) : t('swt.insights.writtenOn', { date: day(released) })}</Text>
            </View>
          </M2Card>
        </Rise>
        <M2Note tone="positive" icon="shield-check">{t('swt.insights.signedRule')}</M2Note>
        <M2Note tone="neutral" icon="file-text">{t('swt.insights.noBreakdown')}</M2Note>
        <M2Note tone="info" icon="lock">{t('swt.insights.firewall')}</M2Note>
      </View>
    );
    const facts = (
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>{t('swt.insights.released')}</Text>
          <Text style={styles.factValue}>{day(released)}</Text>
        </View>
        {report.collectedAt ? (
          <View style={styles.fact}>
            <Text style={styles.factLabel}>{t('swt.labs.fact.collected')}</Text>
            <Text style={styles.factValue}>{day(report.collectedAt)}</Text>
          </View>
        ) : null}
      </View>
    );
    const side = (
      <View style={styles.stack} testID="m2-ri-side">
        <M2HeroPanel
          eyebrow={t('swt.insights.sideLabel')}
          title={nameOf(report)}
          hue="violet"
          icon="flask"
          art={art}
          testID="m2-ri-report"
          actions={online
            ? <HeroButton label={t('swt.insights.download')} icon="download" onPress={() => links.download(report.reportDocumentId)} testID="m2-ri-download" />
            : <Text style={styles.heroOffline} testID="m2-ri-download-offline">{`${t('swt.insights.download')}: ${t('m2v.up.needsConnection')}`}</Text>}
        >
          {facts}
        </M2HeroPanel>
        <View>
          <M2SectionHead title={t('swt.insights.next')} />
          <View style={styles.stack}>
            <M2ListRow icon="stethoscope" hue="indigo" title={t('swt.insights.talk')} meta={t('swt.insights.talkMeta')} onPress={links.talk} testID="m2-ri-talk" />
            <M2ListRow icon="upload" hue="violet" title={t('swt.insights.addOutside')} meta={t('swt.insights.addOutsideMeta')} onPress={links.addOutside} testID="m2-ri-add-outside" />
          </View>
        </View>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('swt.insights.allTests')} aria-label={t('swt.insights.allTests')} onPress={links.labTests} testID="m2-ri-all-tests"
          style={({ focused }: PressState) => [styles.link, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('swt.insights.allTests')}</Text>
          <Icon name="arrow-right" size={15} color={color.action} strokeWidth={2.6} />
        </Pressable>
      </View>
    );
    const historyTable = (
      <M2Card style={styles.card} testID="m2-ri-history">
        <M2Table<StudentLabTest>
          caption={t('swt.insights.historyCaption')}
          rowKey={(row) => row.id}
          rows={history}
          testID="m2-ri-history-table"
          columns={[
            { key: 'test', header: t('swt.labs.fact.test'), flex: 2, cell: (row) => (
              <View style={styles.histCell}>
                <Text style={m2TableText.strong}>{nameOf(row)}</Text>
                {row.reviewedByDoctor ? <Text style={m2Text.meta}>{t('swt.labs.reviewedBy', { name: row.reviewedByDoctor })}</Text> : null}
              </View>
            ) },
            { key: 'released', header: t('swt.insights.released'), cell: (row) => <Text style={m2TableText.cell}>{day(row.reviewedAt ?? row.createdAt)}</Text> },
            { key: 'actions', header: t('swt.vault.col.actions'), align: 'right', width: 88, cell: (row) => (
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('swt.insights.openSpoken', { test: nameOf(row) })} aria-label={t('swt.insights.openSpoken', { test: nameOf(row) })}
                aria-current={row.id === report.id ? 'true' : undefined} onPress={() => { setChosen(row.id); setTab('summary'); }} testID={`m2-ri-open-${row.id}`}
                style={({ focused }: PressState) => [styles.openBtn, row.id === report.id ? styles.openBtnCurrent : null, focused ? focusRing : null]}>
                <Text style={styles.openBtnText}>{t('swt.insights.open')}</Text>
              </Pressable>
            ) },
          ]}
        />
      </M2Card>
    );
    const tabs = (
      <View style={gutter}>
        <M2Tabs<ReportInsightsTab>
          label={t('swt.insights.tabsLabel')}
          segmented
          current={tab}
          onChange={setTab}
          testID="m2-ri-tab"
          tabs={[{ key: 'summary', label: t('swt.insights.tab.summary') }, { key: 'history', label: t('swt.insights.tab.history', { count: history.length }) }]}
        />
      </View>
    );
    const panel = tab === 'summary'
      ? (layout === 'desktop'
        ? <View style={styles.columns}><View style={styles.main}>{summary}</View><View style={styles.aside}>{side}</View></View>
        : <View style={[styles.stack, gutter]}>{side}{summary}</View>)
      : <View style={gutter}>{historyTable}</View>;
    body = (
      <>
        {tabs}
        <View role="tabpanel" {...webAttrs({ 'aria-label': tab === 'summary' ? t('swt.insights.tab.summary') : t('swt.insights.tab.history', { count: history.length }) })} testID={`m2-ri-panel-${tab}`}>
          {panel}
        </View>
      </>
    );
  }

  const offline = !online ? <View style={gutter}><OfflineBanner message={t('m2v.offline')} /></View> : null;
  if (wide) {
    return (
      <M2WideColumn testID="m2-report-insights">
        {header}
        {offline}
        {body}
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-report-insights">
      {header}
      {offline}
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  gutter: { paddingHorizontal: space.gutterPhone },
  stack: { gap: space.s12 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s24 },
  main: { flex: 1, minWidth: 0 },
  aside: { width: 380 },
  card: { padding: space.s16, gap: space.s10 },
  summaryCard: { borderTopWidth: 3, borderTopColor: color.serviceVioletInk },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  noteText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  muted: { color: color.text3 },
  writtenBy: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16, marginTop: space.s4 },
  fact: { minWidth: 120, gap: space.s2 },
  factLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHeroLabel },
  factValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroOffline: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  link: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, alignSelf: 'flex-start', borderRadius: radius.sm },
  histCell: { gap: space.s2 },
  openBtn: { minHeight: 40, paddingHorizontal: space.s14, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  openBtnCurrent: { borderWidth: 1, borderColor: color.action },
  openBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
