import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { OfflineBanner, Rise, Skeleton, useOnline } from '@/design-system';
import { Gradient, M2Card, M2Grid, M2Heading, M2HeaderSos, M2WideColumn, M2_NAV_CLEARANCE, m2Text, useLift, useOwnPhoneChrome, webAttrs } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { clockLabel, dayLabel, shortDate } from '@/features/phoneboards/format';
import { initials } from '@/features/m2store/views/M2HomeView';
import { CardError, HeroStat, NavyHero, TileIcon } from '@/features/m2health/HealthParts';
import type { BodySystem, LabValue } from '@/features/labResults/data/LabResultsRepository';
import { toneOf } from '@/features/labResults/viewmodel/labValueModels';
import type { BodySystemRow, ValueTone } from '@/features/labResults/viewmodel/labValueModels';
import { MedsTodayCard, WaterCard } from '@/features/reminders/views/TodayCards';
import { useUndoClock } from '@/features/reminders/views/useUndoClock';
import { StepsCard } from '@/features/steps/views/StepsCard';
import { refillLine } from '../viewmodel/InsightsViewModel';
import type { InsightsViewModel } from '../viewmodel/InsightsViewModel';

/**
 * Mobile 2.0 My health · Insights (canvas page 9 M2Insights, Tier 1; plan
 * package A + the stored-values section, approved by Krishna Chintakayala
 * 2026-10-21). See InsightsViewModel for the rules each part keeps.
 *
 * Differences from the board, on purpose: the "Improve" tab is dropped
 * (D-M2-7) and Records opens the vault; "NEED YOU" is "To do" (D-M2-8);
 * the care cards link to a refill request and the order's collection time
 * (D-M2-9); "Ask Ayush about this report" is not drawn (D-M2-13 not built);
 * the vaccine record lives here as "not available yet" (D-M2-3).
 */
export interface M2InsightsLinks {
  trends: () => void;
  records: () => void;
  reportUpload: () => void;
  /** Medicines today and reminders (M2Reminders). */
  medicines: () => void;
  /** Water (M2Water). */
  water: () => void;
  refill?: () => void;
  /** Pick a collection time on a test a doctor ordered (the order's own slot booking). */
  collection?: () => void;
  /** Add an old vaccine card as a document (the vault upload). */
  addVaccineCard?: () => void;
  appointments?: () => void;
  movement?: () => void;
  /** The Steps screen (the Steps card). */
  steps?: () => void;
  devices?: () => void;
  emergencyCard?: () => void;
  pass?: () => void;
  /** The Report insights page (all released reports), from "Reviewed lab reports". */
  allReports?: () => void;
  /** Open a released report's document by its id (an id, never a test name). */
  downloadReport?: (documentId: string) => void;
}

const SYSTEM_STYLE: Record<BodySystem, { icon: SkIconName; label: MessageKey; fill: string; ink: string }> = {
  HEART_BLOOD: { icon: 'heart-3', label: 'm2.ins.sys.heart', fill: color.serviceRoseSoft, ink: color.serviceRoseInk },
  BLOOD_SUGAR: { icon: 'droplet', label: 'm2.ins.sys.sugar', fill: color.serviceBlueSoft, ink: color.serviceBlueInk },
  VITAMINS: { icon: 'bottle', label: 'm2.ins.sys.vitamins', fill: color.serviceAmberSoft, ink: color.serviceAmberInk },
  THYROID: { icon: 'thyroid', label: 'm2.ins.sys.thyroid', fill: color.serviceVioletSoft, ink: color.serviceVioletInk },
  KIDNEY: { icon: 'kidney', label: 'm2.ins.sys.kidney', fill: color.serviceTealSoft, ink: color.serviceTealInk },
  LIVER: { icon: 'flask', label: 'm2.ins.sys.liver', fill: color.serviceOrangeSoft, ink: color.serviceOrangeInk },
  BLOOD_COUNT: { icon: 'droplet', label: 'm2.ins.sys.bloodCount', fill: color.serviceRoseSoft, ink: color.serviceRoseInk },
  OTHER: { icon: 'flask', label: 'm2.ins.sys.other', fill: color.neutralBg, ink: color.text2 },
};

const TONE: Record<ValueTone, { fill: string; ink: string }> = {
  attention: { fill: color.attentionBg, ink: color.attention },
  positive: { fill: color.positiveBg, ink: color.positive },
  neutral: { fill: color.neutralBg, ink: color.text2 },
};

const STATE_WORDS: Record<LabValue['rangeState'], MessageKey> = {
  ABOVE: 'm2.ins.above', BELOW: 'm2.ins.below', IN_RANGE: 'm2.ins.inside', NO_RANGE: 'm2.ins.noRangeShort',
};

function valueText(v: LabValue): string {
  return v.valueNumeric !== null ? `${v.valueNumeric}${v.unit ? ` ${v.unit}` : ''}` : v.valueText;
}

function rangeText(v: LabValue, t: ReturnType<typeof useT>): string {
  if (v.refText.trim()) return t('m2.ins.range', { range: v.refText.trim() });
  if (v.refLow !== null || v.refHigh !== null) return t('m2.ins.range', { range: `${v.refLow ?? ''}–${v.refHigh ?? ''}${v.unit ? ` ${v.unit}` : ''}` });
  return t('m2.ins.noRange');
}

function ValueRow({ v, onPress }: { v: LabValue; onPress: () => void }) {
  const t = useT();
  const tone = TONE[toneOf(v.rangeState)];
  const label = `${v.testName}, ${valueText(v)}, ${t(STATE_WORDS[v.rangeState])}. ${rangeText(v, t)}`;
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={label} aria-label={label} onPress={onPress} testID={`m2-ins-value-${v.id}`}
      style={({ focused }: PressState) => [styles.valueRow, focused ? focusRing : null]}>
      <View style={styles.grow}>
        <Text style={m2Text.cardTitle}>{v.testName}</Text>
        <Text style={m2Text.meta}>{rangeText(v, t)}</Text>
      </View>
      <View style={[styles.chip, { backgroundColor: tone.fill }]}><Text style={[styles.chipText, { color: tone.ink }]} testID={`m2-ins-value-chip-${v.id}`}>{valueText(v)}</Text></View>
      <Icon name="chevron-right" size={14} color={color.text3} strokeWidth={2.6} />
    </Pressable>
  );
}

function CountCard({ count, label, tone, pressed, onPress, testID }: { count: number; label: string; tone: 'attention' | 'positive'; pressed: boolean; onPress: () => void; testID: string }) {
  const c = TONE[tone];
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${count} ${label}`} aria-label={`${count} ${label}`} aria-pressed={pressed}
      accessibilityState={{ selected: pressed }} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.count, { backgroundColor: c.fill }, pressed ? { borderColor: c.ink } : null, focused ? focusRing : null]}>
      <Text style={[styles.countValue, { color: c.ink }]}>{count}</Text>
      <Text style={[styles.countLabel, { color: c.ink }]}>{label}</Text>
    </Pressable>
  );
}

function SystemTile({ row, onPress, fill = false }: { row: BodySystemRow; onPress: () => void; fill?: boolean }) {
  const t = useT();
  const lift = useLift();
  const s = SYSTEM_STYLE[row.bodySystem];
  const inRange = row.tests - row.outsideRange - row.noRange;
  const summary = row.outsideRange > 0
    ? t('m2.ins.sysOutside', { count: row.outsideRange, total: row.tests })
    : inRange > 0 && row.noRange === 0 ? t('m2.ins.sysAllIn') : row.noRange === row.tests ? t('m2.ins.sysNoRange') : t('m2.ins.sysSomeIn', { count: inRange, total: row.tests });
  const dots: ValueTone[] = [
    ...Array<ValueTone>(row.outsideRange).fill('attention'),
    ...Array<ValueTone>(Math.max(0, inRange)).fill('positive'),
    ...Array<ValueTone>(row.noRange).fill('neutral'),
  ].slice(0, 8);
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={`${t(s.label)}. ${summary}`} aria-label={`${t(s.label)}. ${summary}`} onPress={onPress}
      testID={`m2-ins-system-${row.bodySystem}`} style={(state: PressState) => [styles.system, fill ? styles.systemFill : null, lift(state)]}>
      <TileIcon icon={s.icon} fill={s.fill} ink={s.ink} tile={38} />
      <Text style={m2Text.cardTitle}>{t(s.label)}</Text>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {dots.map((d, i) => <View key={`${d}-${i}`} style={[styles.dot, { backgroundColor: d === 'attention' ? color.attention : d === 'positive' ? color.positive : color.ruleStrong }]} />)}
      </View>
      <Text style={styles.systemSummary}>{summary}</Text>
    </Pressable>
  );
}

function Tabs({ links }: { links: M2InsightsLinks }) {
  const t = useT();
  const tabs: { key: string; label: MessageKey; onPress?: () => void }[] = [
    { key: 'insights', label: 'm2.ins.tabInsights' },
    { key: 'trends', label: 'm2.ins.tabTrends', onPress: links.trends },
    { key: 'records', label: 'm2.ins.tabRecords', onPress: links.records },
  ];
  return (
    <View role="tablist" accessibilityRole="tablist" accessibilityLabel={t('m2.nav.health')} aria-label={t('m2.nav.health')} style={styles.tabs}>
      {tabs.map((tab) => {
        const selected = !tab.onPress;
        return (
          <Pressable key={tab.key} role="tab" accessibilityRole="tab" aria-selected={selected} accessibilityState={{ selected }} onPress={tab.onPress}
            accessibilityLabel={t(tab.label)} aria-label={t(tab.label)} testID={`m2-ins-tab-${tab.key}`}
            style={({ focused }: PressState) => [styles.tab, selected ? styles.tabOn : null, focused ? focusRing : null]}>
            <Text style={[styles.tabText, selected ? styles.tabTextOn : null]}>{t(tab.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CareCard({ icon, fill, ink, title, lines, empty, action, testID }: {
  icon: SkIconName; fill: string; ink: string; title: string; lines: string[] | null; empty: string; action?: { label: string; onPress: () => void }; testID: string;
}) {
  return (
    <M2Card style={styles.care} testID={testID}>
      <TileIcon icon={icon} fill={fill} ink={ink} />
      <M2Heading style={m2Text.cardTitle}>{title}</M2Heading>
      {lines === null ? <Skeleton label={title} lines={['90%', '60%']} /> : (
        <Text style={styles.careLines}>{lines.length ? lines.join('\n') : empty}</Text>
      )}
      {action && lines && lines.length ? (
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={action.label} aria-label={action.label} onPress={action.onPress} testID={`${testID}-action`}
          style={({ focused }: PressState) => [styles.careAction, { backgroundColor: fill }, focused ? focusRing : null]}>
          <Text style={[styles.careActionText, { color: ink }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </M2Card>
  );
}

/**
 * "Reviewed lab reports" (Tier 1 parity plan 2026-10-24 §3, Q3): the newest
 * released StudentKare lab report, the doctor's note verbatim (or the page's
 * "no note" line), who wrote it and when, Download, and "All reports (n)" to
 * the Report insights page. Hidden until a released report exists; its read
 * (/lab-orders) failing is already shown, with a retry, on the "ordered" card.
 */
const ReviewedReportCard = observer(function ReviewedReportCard({ vm, links, online }: { vm: InsightsViewModel; links: M2InsightsLinks; online: boolean }) {
  const t = useT();
  const report = vm.reviewedReport;
  if (!report || !report.reportDocumentId) return null;
  const documentId = report.reportDocumentId;
  const doctor = report.reviewedByDoctor ?? '';
  const released = shortDate(report.reviewedAt ?? report.createdAt);
  const tests = report.testPanel.join(', ') || t('swt.labs.fact.testUnknown');
  const count = vm.releasedReportCount;
  return (
    <M2Card style={styles.reviewed} testID="m2-ins-reviewed">
      <View style={styles.noteHead}>
        <TileIcon icon="flask" fill={color.serviceGreenSoft} ink={color.serviceGreenInk} />
        <View style={styles.grow}>
          <Text style={m2Text.eyebrow}>{t('m2.ins.reviewedReports')}</Text>
          <M2Heading style={m2Text.cardTitle}>{tests}</M2Heading>
        </View>
      </View>
      <Text style={m2Text.meta} testID="m2-ins-reviewed-by">
        {doctor ? t('swt.insights.writtenBy', { name: doctor, date: released }) : t('swt.insights.writtenOn', { date: released })}
      </Text>
      <Text style={report.reviewNote ? styles.noteText : m2Text.meta} testID="m2-ins-reviewed-note">{report.reviewNote || t('swt.insights.noNote')}</Text>
      <View style={styles.reviewedActions}>
        {links.downloadReport ? (online ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('swt.insights.download')} aria-label={t('swt.insights.download')}
            onPress={() => links.downloadReport?.(documentId)} testID="m2-ins-reviewed-download" style={({ focused }: PressState) => [styles.smallButton, focused ? focusRing : null]}>
            <Text style={styles.smallButtonText}>{t('swt.insights.download')}</Text>
          </Pressable>
        ) : (
          <Text style={m2Text.meta} testID="m2-ins-reviewed-offline">{`${t('swt.insights.download')}: ${t('m2v.up.needsConnection')}`}</Text>
        )) : null}
        {links.allReports ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ins.allReports', { count })} aria-label={t('m2.ins.allReports', { count })}
            onPress={links.allReports} testID="m2-ins-reviewed-all" style={({ focused }: PressState) => [styles.open, focused ? focusRing : null]}>
            <Text style={m2Text.link}>{t('m2.ins.allReports', { count })}</Text>
          </Pressable>
        ) : null}
      </View>
    </M2Card>
  );
});

export const M2InsightsView = observer(function M2InsightsView({ vm, name, links, stepsOnPhone = false, wide = false }: {
  vm: InsightsViewModel; name: string; links: M2InsightsLinks;
  /** True in the phone app, which can count steps itself; the web says to open the phone app. */
  stepsOnPhone?: boolean;
  /** Laid out wide in the desktop web shell (Tier 1 parity plan 2026-10-24 §2): the same cards in rows. */
  wide?: boolean;
}) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  React.useEffect(() => {
    vm.meds.setOnline(online);
    vm.water.setOnline(online);
  }, [vm, online]);
  useUndoClock(vm.meds);
  const values = vm.values;
  const latest = values.latest;
  const next = vm.next;
  const note = vm.note;
  const review = vm.latestReportReview;
  const gutter = wide ? undefined : styles.gutter;

  const stat = (ready: boolean, failed: boolean, value: string) => (ready ? value : failed ? '–' : '…');
  const stats = [
    <HeroStat key="todo" value={stat(vm.toDo !== null, vm.refills.phase === 'error' || vm.labOrders.phase === 'error', String(vm.toDo ?? ''))} label={t('m2.ins.toDo')} tone={color.onHeroAttention} testID="m2-ins-stat-todo" />,
    <HeroStat key="consult" value={stat(vm.appointments.ready, vm.appointments.phase === 'error', next ? `${dayLabel(next.slotStart, t)} ${clockLabel(next.slotStart)}` : t('m2.ins.none'))} label={t('m2.ins.nextConsult')} testID="m2-ins-stat-consult" />,
    <HeroStat key="docs" value={stat(vm.documents.ready, vm.documents.phase === 'error', String(vm.documents.data?.total ?? ''))} label={t('m2.ins.documents')} tone={color.onHeroPositive} testID="m2-ins-stat-docs" />,
    <HeroStat key="shared" value={stat(vm.activeShares !== null, vm.shares.phase === 'error', String(vm.activeShares ?? ''))} label={t('m2.ins.shared')} testID="m2-ins-stat-shared" />,
  ];

  const hero = (
    <Rise>
      <NavyHero style={wide ? styles.heroWide : undefined}>
        <View style={styles.head}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={styles.avatarText}>{initials(name)}</Text></View>
          <View style={styles.grow}>
            <Text style={styles.eyebrow}>{t('m2.insights.eyebrow')}</Text>
            <M2Heading level={1} style={styles.title}>{t('m2.nav.health')}</M2Heading>
          </View>
          {/* SOS is the shell's (parity plan §1): the phone frame's helplines dialog, the app's Emergency screen; none on desktop, whose top bar has it. */}
          <M2HeaderSos testID="m2-ins-sos" />
        </View>
        <Tabs links={links} />
        {wide ? (
          <View style={[styles.stats, styles.statRow]} testID="m2-ins-stats">{stats}</View>
        ) : (
          <View style={styles.stats} testID="m2-ins-stats">
            <View style={styles.statRow}>{stats.slice(0, 2)}</View>
            <View style={styles.statRow}>{stats.slice(2)}</View>
          </View>
        )}
        <Text style={styles.noScore}>{t('m2.ins.noScore')}</Text>
      </NavyHero>
    </Rise>
  );

  const offline = !online ? (
    <View style={[gutter, styles.offline]}>
      <OfflineBanner message={t('m2h.offline')} />
      <View style={styles.offlineLinks}>
        {links.emergencyCard ? <Text accessibilityRole="link" onPress={links.emergencyCard} style={[m2Text.link, styles.offlineLink]}>{t('pb.offline.emergencyCard')}</Text> : null}
        {links.pass ? <Text accessibilityRole="link" onPress={links.pass} style={[m2Text.link, styles.offlineLink]}>{t('pb.offline.pass')}</Text> : null}
      </View>
    </View>
  ) : null;

  const meds = <MedsTodayCard vm={vm.meds} onOpen={links.medicines} />;
  const water = <WaterCard vm={vm.water} onOpen={links.water} />;

  const report = (
    <M2Card style={styles.report} fill={wide} testID="m2-ins-report">
      {values.phase === 'loading' ? <Skeleton label={t('m2.ins.valuesLoading')} lines={['40%', '80%', '100%', '100%']} /> : null}
      {values.phase === 'error' ? (
        <View style={styles.reportState} accessibilityRole="alert">
          <Text style={m2Text.cardTitle}>{t('m2.ins.valuesFailed')}</Text>
          <Text accessibilityRole="button" onPress={() => void values.load()} style={[m2Text.link, styles.inlineLink]} testID="m2-ins-values-retry">{t('common.tryAgain')}</Text>
        </View>
      ) : null}
      {values.phase === 'empty' ? (
        <View style={styles.reportState} testID="m2-ins-first">
          <M2Heading style={m2Text.section}>{t('m2.ins.firstTitle')}</M2Heading>
          <Text style={m2Text.body}>{t('m2.ins.firstBody')}</Text>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ins.addReport')} aria-label={t('m2.ins.addReport')} onPress={links.reportUpload}
            testID="m2-ins-add-report" style={({ focused }: PressState) => [styles.primary, focused ? focusRing : null]}>
            <Text style={styles.primaryText}>{t('m2.ins.addReport')}</Text>
          </Pressable>
        </View>
      ) : null}
      {values.phase === 'ready' && latest ? (
        <>
          <View style={styles.reportHead}>
            <Text style={m2Text.eyebrow}>{t('m2.ins.latest', { date: shortDate(latest.collectedOn) })}</Text>
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ins.openTrends')} aria-label={t('m2.ins.openTrends')} onPress={links.trends}
              testID="m2-ins-open" style={({ focused }: PressState) => [styles.open, focused ? focusRing : null]}>
              <Text style={m2Text.link}>{t('m2.ins.open')}</Text>
            </Pressable>
          </View>
          <M2Heading style={styles.reportTitle}>{latest.labName || t('m2.ins.yourReport')}</M2Heading>
          <Text style={m2Text.meta} testID="m2-ins-source">
            {latest.source === 'LAB_RELEASED' ? t('m2.ins.fromLab') : t('m2.ins.confirmedByYou', { lab: latest.labName || t('m2.ins.aLab') })}
          </Text>
          <View style={styles.counts}>
            <CountCard count={values.needsLookCount} label={t('m2.ins.needLook')} tone="attention" pressed={values.filter === 'needsLook'} onPress={() => values.toggleFilter('needsLook')} testID="m2-ins-count-look" />
            <CountCard count={values.inRangeCount} label={t('m2.ins.inRange')} tone="positive" pressed={values.filter === 'inRange'} onPress={() => values.toggleFilter('inRange')} testID="m2-ins-count-ok" />
          </View>
          <View aria-live="polite" style={styles.values} testID="m2-ins-values">
            {values.rows.map((v) => <ValueRow key={v.id} v={v} onPress={links.trends} />)}
            {values.rows.length === 0 ? <Text style={[m2Text.meta, styles.noRows]}>{t('m2.ins.noRows')}</Text> : null}
          </View>
          {latest.source === 'STUDENT_CONFIRMED' ? <Text style={styles.rangeNote}>{t('m2.ins.rangeTyped')}</Text> : null}
        </>
      ) : null}
    </M2Card>
  );

  const noteParts = [
    vm.reviews.phase === 'error' ? <CardError key="error" title={t('m2.ins.noteTitle')} onRetry={() => void vm.reviews.load()} testID="m2-ins-note-error" /> : null,
    note ? (
      <Gradient key="note" colors={[color.positiveBg, color.surface]} angle={160} style={styles.note} testID="m2-ins-note">
        <View style={styles.noteHead}>
          <Gradient colors={[color.serviceGreenSoft, color.serviceGreenSoft]} style={styles.noteAvatar}>
            <Text style={styles.noteInitials}>{initials((note.reviewedByName ?? '').replace(/^dr\.?\s+/i, '')) || '·'}</Text>
          </Gradient>
          <View style={styles.grow}>
            <M2Heading style={m2Text.cardTitle}>{t('m2.ins.noteTitle')}</M2Heading>
            <Text style={m2Text.meta}>{t('m2.ins.noteBy', { name: note.reviewedByName || t('m2.ins.yourDoctor'), date: note.reviewedAt ? shortDate(note.reviewedAt) : '' })}</Text>
          </View>
        </View>
        <Text style={styles.noteText} testID="m2-ins-note-text">{note.guidance?.summary}</Text>
        {note.guidance && note.guidance.steps.length > 0 ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ins.seeSteps', { count: note.guidance.steps.length })} aria-label={t('m2.ins.seeSteps', { count: note.guidance.steps.length })}
            onPress={links.trends} testID="m2-ins-steps" style={({ focused }: PressState) => [styles.steps, focused ? focusRing : null]}>
            <Text style={styles.stepsText}>{t('m2.ins.seeSteps', { count: note.guidance.steps.length })}</Text>
          </Pressable>
        ) : null}
      </Gradient>
    ) : null,
    !note && review && (review.status === 'REQUESTED' || review.status === 'ASSIGNED') ? (
      <M2Card key="status" style={styles.reviewState} testID="m2-ins-review-status">
        <Icon name="stetho" size={20} color={color.action} />
        <Text style={[m2Text.body, styles.grow]}>{t(review.status === 'ASSIGNED' ? 'm2.ins.reviewAssigned' : 'm2.ins.reviewRequested')}</Text>
      </M2Card>
    ) : null,
    !note && vm.canAskReview ? (
      <M2Card key="ask" style={styles.reviewState} testID="m2-ins-ask-review">
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{t('m2.ins.noNote')}</Text>
          {vm.reviewAsk === 'error' ? <Text accessibilityRole="alert" style={styles.errorText}>{vm.reviewAskMessage || t('m2h.cardFailed')}</Text> : null}
        </View>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.ins.askDoctor')} aria-label={t('m2.ins.askDoctor')} disabled={vm.reviewAsk === 'sending'}
          onPress={() => void vm.askReview()} testID="m2-ins-ask-review-button" style={({ focused }: PressState) => [styles.smallButton, focused ? focusRing : null]}>
          <Text style={styles.smallButtonText}>{vm.reviewAsk === 'sending' ? t('m2.ins.asking') : t('m2.ins.askDoctor')}</Text>
        </Pressable>
      </M2Card>
    ) : null,
  ].filter(Boolean);
  const reviewed = <ReviewedReportCard vm={vm} links={links} online={online} />;

  const refills = vm.refills.phase === 'error' ? <CardError title={t('m2.ins.refills')} onRetry={() => void vm.refills.load()} testID="m2-ins-refills-error" /> : (
    <CareCard icon="refresh" fill={color.surface3} ink={color.action} title={t('m2.ins.refills')} testID="m2-ins-refills"
      lines={vm.refills.data ? vm.refills.data.items.map((p) => refillLine(p, (date) => t('m2.ins.refillDue', { date }), shortDate)) : null}
      empty={t('m2.ins.refillsNone')} action={links.refill ? { label: t('m2.ins.requestRefill'), onPress: links.refill } : undefined} />
  );
  const ordered = vm.labOrders.phase === 'error' ? <CardError title={t('m2.ins.ordered')} onRetry={() => void vm.labOrders.load()} testID="m2-ins-ordered-error" /> : (
    <CareCard icon="stetho" fill={color.serviceAmberSoft} ink={color.serviceAmberInk} title={t('m2.ins.ordered')} testID="m2-ins-ordered"
      lines={vm.labOrders.data ? vm.ordered.map((o) => t('m2.ins.orderedLine', { tests: o.testPanel.join(', '), date: shortDate(o.createdAt) })) : null}
      empty={t('m2.ins.orderedNone')} action={links.collection ? { label: t('m2.ins.pickTime'), onPress: links.collection } : undefined} />
  );
  const dueTitle = <M2Heading style={[m2Text.section, styles.sectionTitle]}>{t('m2.ins.due')}</M2Heading>;

  const steps = links.steps ? <StepsCard week={vm.steps} onPhone={stepsOnPhone} onPress={links.steps} /> : null;
  const showSystems = values.phase === 'ready' && values.bodySystems.length > 0;
  const systemsTitle = <M2Heading style={[m2Text.section, styles.sectionTitle]}>{t('m2.ins.systems')}</M2Heading>;

  const vaccines = (
    <M2Card style={styles.vaccines} fill={wide} testID="m2-ins-vaccines">
      <TileIcon icon="syringe" fill={color.serviceAmberSoft} ink={color.serviceAmberInk} />
      <View style={styles.grow}>
        <M2Heading style={m2Text.cardTitle}>{t('m2.ins.vaccineRecord')}</M2Heading>
        <Text style={m2Text.meta}>{t('m2.ins.vaccineRecordNotYet')}</Text>
      </View>
      {links.addVaccineCard ? (
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ins.addCard')} aria-label={t('m2.ins.addCard')} onPress={links.addVaccineCard}
          testID="m2-ins-add-card" style={({ focused }: PressState) => [styles.open, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('m2.ins.addCard')}</Text>
        </Pressable>
      ) : null}
    </M2Card>
  );

  const more = (
    <M2Card style={styles.more} fill={wide} testID="m2-ins-more">
      {([
        { key: 'appointments', icon: 'calendar-2', label: 'm2.ins.appointments', onPress: links.appointments },
        { key: 'movement', icon: 'zap', label: 'm2.ins.movement', onPress: links.movement },
        { key: 'devices', icon: 'activity-3', label: 'm2.ins.devices', onPress: links.devices },
      ] as const).filter((r) => r.onPress).map((r) => (
        <Pressable key={r.key} role="link" accessibilityRole="link" accessibilityLabel={t(r.label)} aria-label={t(r.label)} onPress={r.onPress} testID={`m2-ins-more-${r.key}`}
          style={({ focused }: PressState) => [styles.moreRow, focused ? focusRing : null]}>
          <Icon name={r.icon} size={18} color={color.action} />
          <Text style={[m2Text.cardTitle, styles.grow]}>{t(r.label)}</Text>
          <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
        </Pressable>
      ))}
    </M2Card>
  );

  if (wide) {
    return (
      <M2WideColumn testID="m2-insights">
        {hero}
        {offline}
        <Rise index={1}>
          {/* The report card keeps at least its phone width (plan §2 risks): two columns, the note and the reviewed reports stacked beside it. */}
          <M2Grid columns={{ tablet: 1, desktop: 2 }} testID="m2-ins-row-report">
            {report}
            <View style={styles.noteCell}>
              {noteParts}
              {reviewed}
            </View>
          </M2Grid>
        </Rise>
        <Rise index={2}>
          {dueTitle}
          <M2Grid columns={{ tablet: 2, desktop: 4 }} testID="m2-ins-row-due">
            {refills}
            {ordered}
            {meds}
            {water}
          </M2Grid>
        </Rise>
        {showSystems ? (
          <Rise index={3}>
            {systemsTitle}
            <M2Grid columns={{ tablet: 2, desktop: 3 }} testID="m2-ins-systems">
              {values.bodySystems.map((row) => <SystemTile key={row.bodySystem} row={row} onPress={links.trends} fill />)}
            </M2Grid>
          </Rise>
        ) : null}
        <Rise index={4}>
          <M2Grid columns={{ tablet: 2, desktop: 3 }} testID="m2-ins-row-more">
            {steps}
            {vaccines}
            {more}
          </M2Grid>
        </Rise>
      </M2WideColumn>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-insights">
      {hero}
      {offline}

      <Rise index={1} style={[styles.gutter, styles.today]}>
        {meds}
        {water}
      </Rise>

      <Rise index={1} style={styles.gutter}>{report}</Rise>

      <Rise index={2} style={[styles.gutter, styles.noteCell]}>
        {noteParts}
        {reviewed}
      </Rise>

      <Rise index={3} style={styles.gutter}>
        {dueTitle}
        <View style={styles.pair}>
          <View style={styles.half}>{refills}</View>
          <View style={styles.half}>{ordered}</View>
        </View>
      </Rise>

      {steps ? <Rise index={4} style={styles.gutter}>{steps}</Rise> : null}

      {showSystems ? (
        <Rise index={4} style={styles.gutter}>
          {systemsTitle}
          <View style={styles.systems} testID="m2-ins-systems">
            {values.bodySystems.map((row) => <SystemTile key={row.bodySystem} row={row} onPress={links.trends} />)}
          </View>
        </Rise>
      ) : null}

      <Rise index={5} style={styles.gutter}>{vaccines}</Rise>

      <Rise index={6} style={styles.gutter}>{more}</Rise>
      <View {...webAttrs({ 'aria-hidden': 'true' })} style={styles.spacer} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  avatar: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  avatarText: { fontFamily: font.family.sans, fontSize: 15, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  title: { fontFamily: font.family.sans, fontSize: 22, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero },
  tabs: { marginTop: space.s16, padding: space.s4, borderRadius: radius.full, flexDirection: 'row', backgroundColor: color.onHeroVeil },
  tab: { flex: 1, minHeight: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: color.heroCurrent },
  tabText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  tabTextOn: { color: color.onHeroCurrent },
  stats: { marginTop: space.s16, gap: space.s10 },
  statRow: { flexDirection: 'row', gap: space.s10 },
  noScore: { marginTop: space.s12, fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  offline: { gap: space.s8 },
  today: { gap: space.s12 },
  offlineLinks: { flexDirection: 'row', gap: space.s16, flexWrap: 'wrap' },
  offlineLink: { minHeight: size.touchTarget, paddingTop: space.s12 },
  report: { borderRadius: 28, padding: space.s16 },
  reportState: { gap: space.s8 },
  inlineLink: { minHeight: size.touchTarget, paddingTop: space.s12 },
  reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  open: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s4 },
  reportTitle: { fontFamily: font.family.sans, fontSize: 19, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  counts: { marginTop: space.s12, flexDirection: 'row', gap: space.s10 },
  count: {
    flex: 1, borderRadius: 22, padding: space.s14, gap: space.s2, borderWidth: 2.5, borderColor: 'transparent', minHeight: size.touchTarget,
    ...webOnly({ transitionProperty: 'border-color, box-shadow', transitionDuration: `${motion.duration.fast}ms` }),
  },
  countValue: { fontFamily: font.family.sans, fontSize: 30, fontWeight: fontWeight(font.weight.heavy), fontVariant: ['tabular-nums'] },
  countLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  values: { marginTop: space.s12 },
  valueRow: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  chip: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  chipText: { fontFamily: font.family.mono, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy), fontVariant: ['tabular-nums'] },
  noRows: { paddingVertical: space.s12 },
  rangeNote: { marginTop: space.s8, fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  note: { borderRadius: 26, padding: space.s16, gap: space.s12, ...shadowStyle(shadow.card) },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  noteAvatar: { width: size.touchTarget, height: size.touchTarget, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  noteInitials: { fontFamily: font.family.sans, fontSize: 15, fontWeight: fontWeight(font.weight.heavy), color: color.serviceGreenInk },
  noteText: { fontFamily: font.family.sans, fontSize: 13, lineHeight: 20, fontWeight: fontWeight(font.weight.strong), color: color.text },
  steps: { alignSelf: 'flex-start', minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.serviceGreenDeep },
  stepsText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  reviewState: { padding: space.s14, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  errorText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  smallButton: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.action },
  smallButtonText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  primary: { marginTop: space.s4, minHeight: size.control, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.action },
  primaryText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  sectionTitle: { marginBottom: space.s12 },
  pair: { flexDirection: 'row', gap: space.s12 },
  half: { flex: 1, minWidth: 0 },
  care: { flex: 1, borderRadius: 24, padding: space.s14, gap: space.s8 },
  careLines: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  careAction: { marginTop: 'auto', alignSelf: 'flex-start', minHeight: size.touchTarget, paddingHorizontal: space.s12, borderRadius: radius.full, justifyContent: 'center' },
  careActionText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  systems: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  system: { width: '47%', flexGrow: 1, borderRadius: 24, padding: space.s14, gap: space.s10, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  dots: { flexDirection: 'row', gap: space.s4, flexWrap: 'wrap' },
  dot: { width: 22, height: 6, borderRadius: radius.full },
  systemSummary: { fontFamily: font.family.sans, fontSize: 11.5, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  vaccines: { padding: space.s14, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  more: { borderRadius: 22, paddingVertical: space.s4 },
  moreRow: { minHeight: size.touchTarget + space.s4, paddingHorizontal: space.s16, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  spacer: { height: space.s8 },
  heroWide: { borderRadius: 36, paddingHorizontal: space.s32 },
  noteCell: { gap: space.s12 },
  systemFill: { width: '100%', flexGrow: 0, height: '100%' },
  reviewed: { borderRadius: 26, padding: space.s16, gap: space.s10 },
  reviewedActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s12, marginTop: 'auto' },
});
