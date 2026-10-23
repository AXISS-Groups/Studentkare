import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { ErrorState, OfflineBanner, Rise, Skeleton } from '@/design-system';
import { TestTrendChart } from '@/design-system/charts';
import {
  M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SoftIcon, m2Text, useOwnPhoneChrome, webAttrs,
  M2HeaderSos,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useLanguage, useT } from '@/i18n';
import type { ReportReview } from '@/features/preventive/models';
import type { LabValue, TestWithValues } from '../data/LabResultsRepository';
import type { TrendsViewModel } from '../viewmodel/LabValuesViewModels';
import { toneOf } from '../viewmodel/labValueModels';
import type { ValueTone } from '../viewmodel/labValueModels';
import {
  chartPoints, chartSummary, dateLocale, fullDate, fullDateFromEpoch, monthYear, rangeBar, reportSpan, sourceKey, stateKey, stepIcon, stepsForTest,
  valueText, valueWithUnit,
} from '../viewmodel/trendScreenModels';
import type { DoctorSteps } from '../viewmodel/trendScreenModels';

/**
 * Mobile 2.0 Trends (canvas page 9 M2Trends, Tier 1; plan
 * docs/plans/tier1-mobile2-health-2026-10-21.md, approved 2026-10-21). One lab
 * test over time from GET /health/lab-results/trends, web phone frame and Expo.
 *
 * - Chips: every test with a stored, confirmed value (bookmarked first), each
 *   with a dot in its latest value's tone and the state in its spoken name.
 * - The badge and range bar use the latest row's own printed range; each point
 *   is coloured by its own row's range; the band only when every plotted value
 *   shares one range and unit; a line only from `trends.min_points_for_line`.
 * - Graph or Table (aria-pressed); the chart has a text alternative and the
 *   table is its full equivalent; its draw-in stops under reduced motion.
 * - Bookmark: stored on the server (D-M2-10), never on the device.
 * - The doctor's steps (D-M2-11), verbatim, from the newest approved review of
 *   a report these values come from; hidden when there is none.
 *
 * Out of the lab's range is amber (`attention`), never red; in range is green
 * without celebration; no range is neutral. No direction words, no target.
 */
export interface M2TrendsLinks {
  /** Back to My health (M2Insights). */
  back: () => void;
  /** M2ReportUpload (the empty state's next step). */
  upload: () => void;
}

export interface M2TrendsViewProps {
  vm: TrendsViewModel;
  /** The student's report reviews (GET /preventive/report-reviews); null while loading or when it failed (the steps stay hidden). */
  reviews: readonly ReportReview[] | null;
  online: boolean;
  links: M2TrendsLinks;
}

const TONE_INK: Record<ValueTone, string> = { attention: color.attention, positive: color.positive, neutral: color.text2 };
const TONE_BG: Record<ValueTone, string> = { attention: color.attentionBg, positive: color.positiveBg, neutral: color.neutralBg };
const TONE_DOT: Record<ValueTone, string> = { attention: color.attention, positive: color.positive, neutral: color.text3 };

function ValueChip({ tone, text, testID }: { tone: ValueTone; text: string; testID?: string }) {
  return (
    <View style={[styles.valueChip, { backgroundColor: TONE_BG[tone] }]} testID={testID}>
      <Text style={[styles.valueChipText, { color: TONE_INK[tone] }]}>{text}</Text>
    </View>
  );
}

function TestChip({ test, selected, onPress }: { test: TestWithValues; selected: boolean; onPress: () => void }) {
  const t = useT();
  const tone = toneOf(test.latestRangeState);
  const spoken = t('m2v.tr.chipSpoken', { test: test.testName, state: t(stateKey(test.latestRangeState)) });
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={spoken} aria-label={spoken} aria-pressed={selected}
      accessibilityState={{ selected }} onPress={onPress} testID={`m2-trends-chip-${test.testKey}`}
      style={({ focused }: PressState) => [styles.chip, selected ? styles.chipOn : null, focused ? focusRing : null]}>
      <View style={[styles.dot, { backgroundColor: TONE_DOT[tone] }]} />
      <Text numberOfLines={1} style={[styles.chipText, selected ? styles.chipTextOn : null]}>{test.testName}</Text>
    </Pressable>
  );
}

function RangeBarView({ latest }: { latest: LabValue }) {
  const t = useT();
  const bar = rangeBar(latest);
  if (!bar) return <Text style={[m2Text.meta, styles.noRange]} testID="m2-trends-no-range">{t('m2v.tr.noRange')}</Text>;
  const width = (zone: 'low' | 'range' | 'high') => (bar.zones.length === 3 ? (zone === 'range' ? 50 : 25) : zone === 'range' ? 75 : 25);
  const range = latest.refText || [latest.refLow, latest.refHigh].filter((n) => n !== null).join('–');
  const spoken = t('m2v.tr.barSpoken', { range: latest.unit ? `${range} ${latest.unit}` : range });
  return (
    <View accessible accessibilityLabel={spoken} aria-label={spoken} role="img" testID="m2-trends-range-bar">
      <View style={styles.bar}>
        {bar.zones.map((zone) => (
          <View key={zone} style={[styles.zone, { width: `${width(zone)}%`, backgroundColor: zone === 'range' ? color.positiveRule : color.serviceAmberSoft }]} />
        ))}
        {bar.marker !== null ? <View style={[styles.marker, { left: `${bar.marker}%` }]} testID="m2-trends-marker" /> : null}
      </View>
      <View style={styles.barLabels}>
        {bar.zones.includes('low') ? <Text style={styles.barLabel}>{t('m2v.tr.low')}</Text> : <View />}
        <Text style={styles.barLabel}>{t('m2v.tr.range', { range: latest.unit ? `${range} ${latest.unit}` : range })}</Text>
        {bar.zones.includes('high') ? <Text style={styles.barLabel}>{t('m2v.tr.high')}</Text> : <View />}
      </View>
    </View>
  );
}

function TrendTable({ rows }: { rows: readonly LabValue[] }) {
  const t = useT();
  const locale = dateLocale(useLanguage().lang);
  return (
    <View role="table" {...webAttrs({ 'aria-label': t('m2v.tr.tableLabel') })} style={styles.table} testID="m2-trends-table">
      <View role="row" style={[styles.tr, styles.thead]}>
        <Text role="columnheader" style={[styles.th, styles.colDate]}>{t('m2v.tr.col.date')}</Text>
        <Text role="columnheader" style={[styles.th, styles.colLab]}>{t('m2v.tr.col.lab')}</Text>
        <Text role="columnheader" style={[styles.th, styles.colValue]}>{t('m2v.tr.col.value')}</Text>
      </View>
      {rows.map((v) => {
        const tone = toneOf(v.rangeState);
        return (
          <View key={v.id} role="row" style={styles.tr} testID={`m2-trends-row-${v.id}`}>
            <Text role="cell" style={[styles.td, styles.colDate]}>{monthYear(v.collectedOn, locale)}</Text>
            <View role="cell" style={styles.colLab}>
              <Text numberOfLines={2} style={styles.td}>{v.labName}</Text>
              <Text style={styles.tdMeta}>{t(sourceKey(v))}</Text>
              {v.refText ? <Text style={styles.tdMeta}>{t('m2v.tr.rangeAsPrinted', { range: v.refText })}</Text> : null}
            </View>
            <View role="cell" style={styles.colValue}>
              <ValueChip tone={tone} text={valueWithUnit(v)} testID={`m2-trends-row-chip-${v.id}`} />
              <Text style={[styles.tdMeta, styles.right]}>{t(stateKey(v.rangeState))}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StepsSection({ steps }: { steps: DoctorSteps }) {
  const t = useT();
  const locale = dateLocale(useLanguage().lang);
  const count = steps.steps.length;
  const from = steps.doctorName
    ? t('m2v.tr.stepsFrom', { name: steps.doctorName })
    : t('m2v.tr.stepsReviewed', { date: fullDateFromEpoch(steps.reviewedAt, locale) });
  return (
    <Rise index={3} style={styles.gutter}>
      <View style={styles.stepsCard} testID="m2-trends-steps">
        <View style={styles.stepsHead}>
          <M2Heading style={m2Text.section}>{count === 1 ? t('m2v.tr.stepsOne') : t('m2v.tr.steps', { count })}</M2Heading>
          <Text style={styles.stepsFrom}>{from}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsRow}>
          {steps.steps.map((step, i) => {
            const icon = stepIcon(step.kind);
            return (
              <View key={`${steps.reviewId}-${i}`} style={styles.step} testID={`m2-trends-step-${i}`}>
                {icon ? <SoftIcon icon={icon} hue="green" tile={40} iconSize={20} /> : null}
                <Text style={m2Text.cardTitle}>{step.text}</Text>
                {step.often || step.when ? (
                  <View style={styles.stepChips}>
                    {step.often ? <View style={styles.stepChipGreen}><Text style={styles.stepChipGreenText}>{step.often}</Text></View> : null}
                    {step.when ? <View style={styles.stepChip}><Text style={styles.stepChipText}>{step.when}</Text></View> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Rise>
  );
}

export const M2TrendsView = observer(function M2TrendsView({ vm, reviews, online, links }: M2TrendsViewProps) {
  const t = useT();
  const locale = dateLocale(useLanguage().lang);
  useOwnPhoneChrome();
  const [mode, setMode] = useState<'graph' | 'table'>('graph');
  const view = vm.view;
  const latest = view?.latest ?? null;
  const items = vm.items;
  const testName = vm.trend?.testName ?? vm.tests.find((x) => x.testKey === vm.selectedKey)?.testName ?? '';
  const span = reportSpan(items);
  const eyebrow = items.length === 0 ? '' : span.count === 1 || span.from === span.to
    ? t(span.count === 1 ? 'm2v.tr.spanOne' : 'm2v.tr.spanSame', { count: span.count, year: span.to })
    : t('m2v.tr.span', { count: span.count, from: span.from, to: span.to });
  const steps = reviews && vm.trend ? stepsForTest(reviews, items) : null;
  const allTyped = items.every((v) => v.source === 'STUDENT_CONFIRMED');
  const bookmarkLabel = t('m2v.tr.bookmark', { test: testName });

  const header = (
    <View style={styles.header} testID="m2-trends-header">
      <RoundButton icon="arrow-left" label={t('m2v.tr.back')} onPress={links.back} testID="m2-trends-back" />
      <View style={styles.grow}>
        {eyebrow ? <Text numberOfLines={1} style={styles.eyebrow} testID="m2-trends-span">{eyebrow}</Text> : null}
        <M2Heading level={1} style={styles.title}>{t('m2v.tr.title')}</M2Heading>
      </View>
      {vm.phase === 'ready' && vm.selectedKey ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={bookmarkLabel} aria-label={bookmarkLabel}
          aria-pressed={vm.selectedPinned} accessibilityState={{ selected: vm.selectedPinned, busy: vm.pinSaving, disabled: vm.pinSaving }}
          disabled={vm.pinSaving} onPress={() => void vm.togglePin()} testID="m2-trends-bookmark"
          style={({ focused }: PressState) => [styles.bookmark, vm.selectedPinned ? styles.bookmarkOn : null, focused ? focusRing : null]}>
          <Icon name="bookmark" size={size.navIcon} color={vm.selectedPinned ? color.onAction : color.text} strokeWidth={2.3} />
        </Pressable>
      ) : null}
      <M2HeaderSos />
    </View>
  );

  let body: React.ReactNode;
  if (vm.phase === 'loading') {
    body = <View style={styles.gutter}><Skeleton label={t('m2v.tr.loading')} lines={['60%', '100%', '100%', '80%']} /></View>;
  } else if (vm.phase === 'error') {
    body = (
      <View style={styles.gutter}>
        <ErrorState title={t('m2v.tr.errorTitle')} body={t('m2v.tr.errorBody')} retryLabel={t('m2v.retry')} onRetry={() => void vm.load()} />
      </View>
    );
  } else if (vm.phase === 'empty') {
    body = (
      <Rise style={styles.gutter}>
        <M2Card style={styles.empty} testID="m2-trends-empty">
          <SoftIcon icon="flask" hue="indigo" tile={52} iconSize={24} />
          <M2Heading style={m2Text.section}>{t('m2v.tr.emptyTitle')}</M2Heading>
          <Text style={m2Text.body}>{t('m2v.tr.emptyBody')}</Text>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2v.addReport')} aria-label={t('m2v.addReport')} onPress={links.upload}
            testID="m2-trends-add" style={({ focused }: PressState) => [styles.primary, focused ? focusRing : null]}>
            <Text style={styles.primaryText}>{t('m2v.addReport')}</Text>
          </Pressable>
        </M2Card>
      </Rise>
    );
  } else {
    body = (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} testID="m2-trends-chips"
          {...webAttrs({ role: 'group', 'aria-label': t('m2v.tr.tests') })}>
          {vm.tests.map((test) => (
            <TestChip key={test.testKey} test={test} selected={test.testKey === vm.selectedKey} onPress={() => void vm.select(test.testKey)} />
          ))}
        </ScrollView>
        {vm.pinError ? (
          <Text role="alert" accessibilityLiveRegion="polite" style={[styles.gutter, styles.pinError]} testID="m2-trends-pin-error">
            {vm.pinError === 'error' ? t('m2v.tr.pinError') : vm.pinError}
          </Text>
        ) : null}
        <Rise index={1} style={styles.gutter}>
          <M2Card style={styles.card} testID="m2-trends-card">
            {vm.trendPhase === 'loading' || vm.trendPhase === 'idle' ? (
              <Skeleton label={t('m2v.tr.loadingTest')} lines={['40%', '100%', '100%']} />
            ) : vm.trendPhase === 'error' || !view || !latest ? (
              <ErrorState title={t('m2v.tr.testErrorTitle')} body={t('m2v.tr.errorBody')} retryLabel={t('m2v.retry')} onRetry={() => void vm.select(vm.selectedKey)} />
            ) : (
              <>
                <View style={styles.latestHead}>
                  <View style={styles.grow}>
                    <Text style={m2Text.eyebrow}>{t('m2v.tr.latest', { date: monthYear(latest.collectedOn, locale) })}</Text>
                    <View style={styles.valueRow} accessible accessibilityLabel={`${testName}: ${valueWithUnit(latest)}`} aria-label={`${testName}: ${valueWithUnit(latest)}`}>
                      <Text style={styles.bigValue} testID="m2-trends-latest">{valueText(latest)}</Text>
                      {latest.unit ? <Text style={styles.unit}>{latest.unit}</Text> : null}
                    </View>
                  </View>
                  <ValueChip tone={toneOf(latest.rangeState)} text={t(stateKey(latest.rangeState))} testID="m2-trends-badge" />
                </View>
                <RangeBarView latest={latest} />
                <View style={styles.segment} {...webAttrs({ role: 'group', 'aria-label': t('m2v.tr.viewLabel') })}>
                  {(['graph', 'table'] as const).map((m) => (
                    <Pressable key={m} role="button" accessibilityRole="button" accessibilityLabel={t(m === 'graph' ? 'm2v.tr.graph' : 'm2v.tr.table')}
                      aria-label={t(m === 'graph' ? 'm2v.tr.graph' : 'm2v.tr.table')} aria-pressed={mode === m} accessibilityState={{ selected: mode === m }}
                      onPress={() => setMode(m)} testID={`m2-trends-mode-${m}`}
                      style={({ focused }: PressState) => [styles.segmentBtn, mode === m ? styles.segmentOn : null, focused ? focusRing : null]}>
                      <Text style={[styles.segmentText, mode === m ? styles.segmentTextOn : null]}>{t(m === 'graph' ? 'm2v.tr.graph' : 'm2v.tr.table')}</Text>
                    </Pressable>
                  ))}
                </View>
                {mode === 'graph' ? (
                  view.points.length > 0 ? (
                    <View style={styles.chart}>
                      <TestTrendChart
                        points={chartPoints(view.points, locale)}
                        band={view.band}
                        drawLine={view.drawLine}
                        bandLabel={t('m2v.tr.bandLabel')}
                        summary={chartSummary(testName, view.points, (vars) => t('m2v.tr.overTime', vars), locale)}
                      />
                      {!view.drawLine ? <Text style={[m2Text.meta, styles.centre]} testID="m2-trends-few">{t('m2v.tr.fewPoints')}</Text> : null}
                    </View>
                  ) : (
                    <Text style={[m2Text.meta, styles.chartNone]} testID="m2-trends-nothing-to-plot">{t('m2v.tr.nothingToPlot')}</Text>
                  )
                ) : (
                  <TrendTable rows={view.table} />
                )}
                <Text style={[m2Text.meta, styles.foot]}>{t(allTyped ? 'm2v.tr.footTyped' : 'm2v.tr.footMixedSources')}</Text>
                {view.mixedRanges ? <Text style={[m2Text.meta, styles.foot]} testID="m2-trends-mixed">{t('m2v.tr.mixedRanges')}</Text> : null}
                {view.notPlotted.length > 0 ? (
                  <Text style={[m2Text.meta, styles.foot]} testID="m2-trends-not-plotted">
                    {view.notPlotted.length === 1 ? t('m2v.tr.notPlottedOne') : t('m2v.tr.notPlotted', { count: view.notPlotted.length })}
                  </Text>
                ) : null}
                <Text style={[m2Text.meta, styles.foot]}>{t('m2v.tr.latestFrom', { lab: latest.labName, date: fullDate(latest.collectedOn, locale), source: t(sourceKey(latest)) })}</Text>
              </>
            )}
          </M2Card>
        </Rise>
        {steps && vm.trendPhase === 'ready' ? <StepsSection steps={steps} /> : null}
      </>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-trends">
      {header}
      {!online ? <View style={styles.gutter}><OfflineBanner message={t('m2v.offline')} /></View> : null}
      {body}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  grow: { flex: 1, minWidth: 0 },
  gutter: { paddingHorizontal: space.gutterPhone },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.text },
  bookmark: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface, ...shadowStyle(shadow.hairline),
  },
  bookmarkOn: { backgroundColor: color.action },
  chips: { paddingHorizontal: space.gutterPhone, gap: space.s8, paddingVertical: space.s2 },
  chip: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s8,
    backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.rule,
  },
  chipOn: { backgroundColor: color.action, borderColor: color.action, ...shadowStyle(shadow.card) },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  chipTextOn: { color: color.onAction },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  pinError: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  card: { padding: space.s20, gap: space.s16 },
  latestHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s6, marginTop: space.s4 },
  bigValue: { fontFamily: font.family.mono, fontSize: font.size.display + 6, fontWeight: fontWeight(font.weight.heavy), color: color.clinicalValue, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  valueChip: { paddingHorizontal: space.s10, paddingVertical: space.s4 + 1, borderRadius: radius.full, alignSelf: 'flex-start' },
  valueChipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), fontVariant: ['tabular-nums'] },
  noRange: { color: color.text2 },
  bar: { height: 10, borderRadius: radius.full, flexDirection: 'row', overflow: 'visible', position: 'relative' },
  zone: { height: 10 },
  marker: {
    position: 'absolute', top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: radius.full,
    backgroundColor: color.action, borderWidth: 3, borderColor: color.surface, ...shadowStyle(shadow.hairline),
  },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s8 },
  barLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  segment: { flexDirection: 'row', padding: space.s4, borderRadius: radius.full, backgroundColor: color.surface3 },
  segmentBtn: { flex: 1, minHeight: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: color.surface, ...shadowStyle(shadow.hairline) },
  segmentText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text3 },
  segmentTextOn: { color: color.text },
  chart: { gap: space.s4 },
  centre: { textAlign: 'center' },
  chartNone: { paddingVertical: space.s16, textAlign: 'center' },
  foot: { color: color.text2 },
  table: { gap: 0 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingVertical: space.s10, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  thead: { paddingVertical: space.s6 },
  th: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text3, textTransform: 'uppercase', letterSpacing: 0.6 },
  td: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  tdMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  right: { textAlign: 'right' },
  colDate: { width: 64 },
  colLab: { flex: 1, minWidth: 0 },
  colValue: { alignItems: 'flex-end', gap: space.s2 },
  stepsCard: { borderRadius: 22, padding: space.s16, gap: space.s12, backgroundColor: color.positiveBg },
  stepsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8, flexWrap: 'wrap' },
  stepsFrom: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  stepsRow: { gap: space.s12, paddingRight: space.s4 },
  step: { width: 220, padding: space.s14, gap: space.s10, borderRadius: radius.xl, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  stepChipGreen: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.positiveBg },
  stepChipGreenText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  stepChip: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.surface3 },
  stepChipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  empty: { padding: space.s20, gap: space.s12, alignItems: 'flex-start' },
  primary: { minHeight: size.touchTarget, paddingHorizontal: space.s20, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.action },
  primaryText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
