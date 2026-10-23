import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, OfflineBanner, Rise, Sheet, Skeleton, TextField, useOnline } from '@/design-system';
import {
  Gradient, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SERVICE_HUES, floatTransform, heroStops, m2Text,
  useAmbientMotion, useLoop, useOwnPhoneChrome,
  M2HeaderSos,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, size, space } from '@/design-system/theme';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { SOURCE_LABEL, stepsText, weekdayShort } from '../data/stepsApi';
import type { WeekBar } from '../data/stepsApi';
import type { StepProvider, StepSource } from '../model/stepSources';
import type { StepConnector } from '../sources/connectors';
import type { ConnectorState, StepsViewModel } from '../viewmodel/StepsViewModel';

/**
 * Steps (Mobile 2.0 language; new screen, no canvas board — brief
 * design/screens/briefs/M2Steps.md, Tier 2). The same view in the web phone
 * frame, the desktop page column and the Expo app (StepsViewModel).
 *
 * Teal hero with today's number and where it came from; the live count while
 * the screen is open; this week as bars (a day without a number is drawn
 * empty, never as zero); the sources with a plain explainer before any
 * permission prompt; typed entry. No goal, ring, streak, medal or praise.
 */
export interface M2StepsLinks {
  back: () => void;
}

const TEAL = SERVICE_HUES.teal;

export const SOURCE_ICON: Readonly<Record<StepSource, SkIconName>> = {
  HEALTHKIT: 'heart-plus',
  HEALTH_CONNECT: 'heart-plus',
  PHONE_MOTION: 'devices',
  MANUAL: 'pencil',
};

const PROVIDER_ICON: Readonly<Record<StepProvider, SkIconName>> = {
  healthkit: 'heart-plus',
  health_connect: 'heart-plus',
  phone_motion: 'devices',
};

const PROVIDER_NAME: Readonly<Record<StepProvider, MessageKey>> = {
  healthkit: 'steps.provider.healthkit',
  health_connect: 'steps.provider.health_connect',
  phone_motion: 'steps.provider.phone_motion',
};

const PROVIDER_NOTE: Readonly<Record<StepProvider, MessageKey>> = {
  healthkit: 'steps.providerNote.healthkit',
  health_connect: 'steps.providerNote.health_connect',
  phone_motion: 'steps.providerNote.phone_motion',
};

const EXPLAIN_BODY: Readonly<Record<StepProvider, MessageKey>> = {
  healthkit: 'steps.explain.body.healthkit',
  health_connect: 'steps.explain.body.health_connect',
  phone_motion: 'steps.explain.body.phone_motion',
};

const STATE_LABEL: Readonly<Record<ConnectorState, MessageKey>> = {
  checking: 'steps.state.checking',
  unavailable: 'steps.state.unavailable',
  update_required: 'steps.state.update_required',
  not_connected: 'steps.state.not_connected',
  denied: 'steps.state.denied',
  blocked: 'steps.state.blocked',
  connected: 'steps.state.connected',
};

/** The white chip on the hero that says where today's number came from. */
export function SourceChip({ source, onHero = false, testID }: { source: StepSource; onHero?: boolean; testID?: string }) {
  const t = useT();
  return (
    <View style={[styles.chip, onHero ? styles.chipOnHero : styles.chipOnCard]} testID={testID}>
      <Icon name={SOURCE_ICON[source]} size={14} color={onHero ? TEAL.deep : TEAL.ink} strokeWidth={2.4} />
      <Text style={[styles.chipText, { color: onHero ? TEAL.deep : TEAL.ink }]}>{t(SOURCE_LABEL[source])}</Text>
    </View>
  );
}

const Hero = observer(function Hero({ vm, links, wide = false }: { vm: StepsViewModel; links: M2StepsLinks; wide?: boolean }) {
  const t = useT();
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  const today = vm.today;
  const week = vm.week;
  const noneBody: MessageKey = !vm.automatic ? 'steps.noneTodayWeb' : vm.connected.length ? 'steps.noneTodayAutomatic' : 'steps.noneTodayManual';
  return (
    <Gradient colors={heroStops('teal')} angle={160} style={[styles.hero, wide ? styles.heroWide : null]} testID="m2-steps-hero">
      <View pointerEvents="none" style={styles.ringBig} />
      <View pointerEvents="none" style={styles.ringSmall} />
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.glyph, { transform: floatTransform(float, space.s6) }]}>
        <Icon name="walk" size={34} color={color.onHero} strokeWidth={1.9} />
      </Animated.View>
      <View style={styles.head}>
        <RoundButton icon="arrow-left" label={t('steps.back')} onPress={links.back} onHero testID="m2-steps-back" />
        <View style={styles.grow}>
          <Text style={styles.eyebrow}>{t('steps.eyebrow')}</Text>
          <M2Heading level={1} style={styles.title}>{t('steps.title')}</M2Heading>
        </View>
        <M2HeaderSos />
      </View>
      <View style={styles.today} aria-live="polite" testID="m2-steps-today">
        <Text style={styles.todayLabel}>{t('steps.todayLabel')}</Text>
        {week.phase === 'loading' && !week.data ? (
          <Text style={styles.todayPending} accessibilityLabel={t('steps.card.loading')}>{t('steps.card.loading')}</Text>
        ) : null}
        {week.phase === 'error' ? (
          <View style={styles.heroError} accessibilityRole="alert">
            <Text style={styles.todayNone}>{t('steps.failed')}</Text>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.tryAgain')} aria-label={t('common.tryAgain')}
              onPress={() => void week.load()} testID="m2-steps-retry" style={({ focused }: PressState) => [styles.heroRetry, focused ? focusRing : null]}>
              <Icon name="refresh" size={16} color={TEAL.deep} strokeWidth={2.4} />
              <Text style={styles.heroRetryText}>{t('common.tryAgain')}</Text>
            </Pressable>
          </View>
        ) : null}
        {today && today.steps !== null ? (
          <>
            <Text style={styles.todayValue} testID="m2-steps-today-value">{stepsText(today.steps)}</Text>
            {today.source ? <SourceChip source={today.source} onHero testID="m2-steps-today-source" /> : null}
          </>
        ) : null}
        {today && today.steps === null ? (
          <>
            <Text style={styles.todayNone} testID="m2-steps-today-none">{t('steps.noneToday')}</Text>
            <Text style={styles.heroBody}>{t(noneBody)}</Text>
          </>
        ) : null}
      </View>
      <Text style={styles.noPressure}>{t('steps.noPressure')}</Text>
    </Gradient>
  );
});

function WeekChart({ bars, wide = false }: { bars: readonly WeekBar[]; wide?: boolean }) {
  const t = useT();
  const max = Math.max(0, ...bars.map((b) => b.steps ?? 0));
  return (
    <View role="list" accessibilityLabel={t('steps.week.chartLabel')} aria-label={t('steps.week.chartLabel')} style={[styles.chart, wide ? styles.chartWide : null]} testID="m2-steps-week">
      {bars.map((bar) => {
        const day = bar.isToday ? t('steps.week.today') : weekdayShort(bar.date);
        const spoken = bar.steps === null
          ? t('steps.week.barNone', { day })
          : t('steps.week.bar', { day, count: stepsText(bar.steps), source: bar.source ? t(SOURCE_LABEL[bar.source]) : '' });
        const share = bar.steps !== null && max > 0 ? bar.steps / max : 0;
        return (
          <View key={bar.date} role="listitem" accessible accessibilityLabel={spoken} aria-label={spoken} style={styles.barCol} testID={`m2-steps-bar-${bar.date}`}>
            <Text style={[styles.barValue, wide ? styles.barValueWide : null]} numberOfLines={1}>{bar.steps === null ? '' : stepsText(bar.steps)}</Text>
            <View style={[styles.barTrack, bar.steps === null ? styles.barTrackEmpty : null, wide ? styles.barTrackWide : null]}>
              {bar.steps !== null ? <View style={[styles.barFill, { height: `${Math.max(share * 100, bar.steps > 0 ? MIN_BAR_PERCENT : 0)}%` }]} /> : null}
            </View>
            <Text style={[styles.barDay, bar.isToday ? styles.barDayToday : null, wide ? styles.barDayWide : null]} numberOfLines={1}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const SourceRow = observer(function SourceRow({ connector, vm }: { connector: StepConnector; vm: StepsViewModel }) {
  const t = useT();
  const provider = connector.provider;
  const state: ConnectorState = vm.states[provider] ?? 'checking';
  const name = t(PROVIDER_NAME[provider]);
  const busy = vm.connecting === provider;
  const canConnect = state === 'not_connected' || state === 'denied';
  const canSettings = (state === 'blocked' || state === 'denied' || state === 'update_required') && Boolean(connector.openSettings);
  return (
    <View style={styles.sourceRow} testID={`m2-steps-source-${provider}`}>
      <View style={[styles.sourceIcon, { backgroundColor: TEAL.soft }]}><Icon name={PROVIDER_ICON[provider]} size={20} color={TEAL.ink} strokeWidth={2.1} /></View>
      <View style={styles.grow}>
        <Text style={m2Text.cardTitle}>{name}</Text>
        <Text style={m2Text.meta}>{t(PROVIDER_NOTE[provider])}</Text>
        <View style={styles.stateLine}>
          {state === 'connected' ? <Icon name="check" size={14} color={color.positive} strokeWidth={2.6} /> : null}
          <Text style={[styles.stateText, state === 'connected' ? styles.stateOn : null]} testID={`m2-steps-state-${provider}`}>
            {t(busy ? 'steps.connecting' : STATE_LABEL[state])}
          </Text>
        </View>
      </View>
      {state === 'connected' ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('steps.stopNamed', { name })} aria-label={t('steps.stopNamed', { name })}
          onPress={() => vm.disconnect(provider)} testID={`m2-steps-stop-${provider}`} style={({ focused }: PressState) => [styles.ghostButton, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('steps.stop')}</Text>
        </Pressable>
      ) : null}
      {canConnect ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('steps.connectNamed', { name })} aria-label={t('steps.connectNamed', { name })}
          disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => vm.explain(provider)} testID={`m2-steps-connect-${provider}`}
          style={({ focused }: PressState) => [styles.connectButton, focused ? focusRing : null]}>
          <Text style={styles.connectText}>{t('steps.connect')}</Text>
        </Pressable>
      ) : null}
      {!canConnect && canSettings ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('steps.settingsNamed', { name })} aria-label={t('steps.settingsNamed', { name })}
          onPress={() => vm.openSettings(provider)} testID={`m2-steps-settings-${provider}`} style={({ focused }: PressState) => [styles.ghostButton, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('steps.settings')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const SyncLine = observer(function SyncLine({ vm }: { vm: StepsViewModel }) {
  const t = useT();
  if (!vm.connected.length || vm.liveOnly && vm.connected.length === 1) return null;
  const words: MessageKey | null = vm.sync === 'syncing' ? 'steps.sync.syncing' : vm.sync === 'failed' ? 'steps.sync.failed' : vm.sync === 'no_data' ? 'steps.sync.noData' : null;
  return (
    <View style={styles.syncLine} testID="m2-steps-sync">
      <View style={styles.grow} aria-live="polite">
        {words ? <Text style={[m2Text.body, vm.sync === 'failed' ? styles.attention : null]} testID="m2-steps-sync-state">{t(words)}</Text> : null}
        {vm.sync === 'no_data' && vm.connected.includes('healthkit') ? <Text style={m2Text.meta}>{t('steps.sync.healthkitHint')}</Text> : null}
      </View>
      <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('steps.sync.now')} aria-label={t('steps.sync.now')} disabled={vm.sync === 'syncing'}
        onPress={() => void vm.syncNow()} testID="m2-steps-sync-now" style={({ focused }: PressState) => [styles.ghostButton, styles.row, focused ? focusRing : null]}>
        <Icon name="refresh" size={16} color={color.action} strokeWidth={2.4} />
        <Text style={m2Text.link}>{t('steps.sync.now')}</Text>
      </Pressable>
    </View>
  );
});

export interface M2StepsViewProps {
  vm: StepsViewModel;
  links: M2StepsLinks;
  wide?: boolean;
}

export const M2StepsView = observer(function M2StepsView({ vm, links, wide = false }: M2StepsViewProps) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  const explaining = vm.explaining;
  const explainName = explaining ? t(PROVIDER_NAME[explaining]) : '';
  const average = vm.average;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.contentWide : null]} testID="m2-steps">
      <Rise><Hero vm={vm} links={links} wide={wide} /></Rise>

      {!online ? <View style={[styles.gutter, wide ? styles.gutterWide : null]}><OfflineBanner message={t('steps.offline')} /></View> : null}

      {vm.liveSteps !== null ? (
        <Rise index={1} style={[styles.gutter, wide ? styles.gutterWide : null]}>
          <M2Card style={[styles.card, wide ? styles.cardWide : null]} testID="m2-steps-live">
            <View style={styles.row}>
              <View style={[styles.sourceIcon, { backgroundColor: TEAL.soft }]}><Icon name="walk" size={20} color={TEAL.ink} strokeWidth={2.1} /></View>
              <View style={styles.grow} aria-live="polite">
                <M2Heading style={m2Text.cardTitle}>{t('steps.live.title')}</M2Heading>
                <Text style={styles.liveCount} testID="m2-steps-live-count">{t('steps.live.count', { count: stepsText(vm.liveSteps) })}</Text>
              </View>
            </View>
            {vm.liveOnly ? <Text style={m2Text.meta}>{t('steps.live.onlyLive')}</Text> : null}
          </M2Card>
        </Rise>
      ) : null}

      <Rise index={2} style={[styles.gutter, wide ? styles.gutterWide : null]}>
        <M2Card style={[styles.card, wide ? styles.cardWide : null]} testID="m2-steps-week-card">
          <M2Heading style={m2Text.section}>{t('steps.week.title')}</M2Heading>
          {vm.week.phase === 'loading' && !vm.week.data ? <Skeleton label={t('steps.card.loading')} lines={['100%', '60%']} /> : null}
          {vm.week.phase === 'error' ? <Text style={m2Text.meta}>{t('steps.failed')}</Text> : null}
          {vm.week.data ? (
            <>
              <WeekChart bars={vm.bars} wide={wide} />
              {average !== null ? <Text style={m2Text.meta} testID="m2-steps-average">{t('steps.week.average', { count: stepsText(average) })}</Text> : (
                <Text style={m2Text.meta} testID="m2-steps-week-empty">{t('steps.week.empty')}</Text>
              )}
            </>
          ) : null}
          <SyncLine vm={vm} />
        </M2Card>
      </Rise>

      <Rise index={3} style={[styles.gutter, wide ? styles.gutterWide : null]}>
        {vm.automatic ? (
          <M2Card style={[styles.card, wide ? styles.cardWide : null]} testID="m2-steps-sources">
            <M2Heading style={m2Text.section}>{t('steps.sources.title')}</M2Heading>
            {vm.connectors.map((c) => <SourceRow key={c.provider} connector={c} vm={vm} />)}
            <View style={styles.note}>
              <Icon name="info" size={16} color={color.info} strokeWidth={2.2} />
              <Text style={[m2Text.meta, styles.grow]}>{t('steps.sources.order')}</Text>
            </View>
          </M2Card>
        ) : (
          <M2Card style={[styles.card, styles.row, styles.top, wide ? styles.cardWide : null]} testID="m2-steps-web">
            <View style={[styles.sourceIcon, { backgroundColor: TEAL.soft }]}><Icon name="devices" size={20} color={TEAL.ink} strokeWidth={2.1} /></View>
            <View style={styles.grow}>
              <M2Heading style={m2Text.cardTitle}>{t('steps.sources.webTitle')}</M2Heading>
              <Text style={m2Text.body}>{t('steps.sources.webBody')}</Text>
            </View>
          </M2Card>
        )}
      </Rise>

      <Rise index={4} style={[styles.gutter, wide ? styles.gutterWide : null]}>
        <M2Card style={[styles.card, wide ? styles.cardWide : null]} testID="m2-steps-typed">
          <View style={styles.row}>
            <View style={[styles.sourceIcon, { backgroundColor: color.surface3 }]}><Icon name="pencil" size={18} color={color.action} strokeWidth={2.2} /></View>
            <M2Heading style={[m2Text.section, styles.grow]}>{t('steps.typed.title')}</M2Heading>
          </View>
          <TextField label={t('steps.typed.label')} value={vm.typed} onChangeText={vm.setTyped} keyboardType="numeric" maxLength={String(vm.typedMax).length}
            hint={t('steps.typed.hint', { max: stepsText(vm.typedMax) })} error={vm.typedState === 'error' && vm.typedError ? say(t, vm.typedError) : undefined}
            disabled={vm.typedState === 'saving'} testID="m2-steps-typed-input" />
          <Button label={vm.typedState === 'saving' ? t('steps.typed.saving') : t('steps.typed.save')} onPress={() => void vm.saveTyped()}
            busy={vm.typedState === 'saving'} disabled={!online || vm.typed.trim() === ''} fullWidth testID="m2-steps-typed-save" />
          <View aria-live="polite">
            {vm.typedState === 'saved' ? <Text style={styles.saved} testID="m2-steps-typed-saved">{t('steps.typed.saved')}</Text> : null}
          </View>
        </M2Card>
      </Rise>

      <Sheet visible={explaining !== null} title={t('steps.explain.title', { name: explainName })} onClose={vm.cancelExplain} testID="m2-steps-explain">
        {explaining ? (
          <View style={styles.sheet}>
            <Text style={m2Text.body}>{t(EXPLAIN_BODY[explaining])}</Text>
            <Text style={m2Text.body}>{t('steps.explain.use')}</Text>
            <Text style={m2Text.body}>{t('steps.explain.next')}</Text>
            <Button label={t('steps.explain.continue')} onPress={() => void vm.confirmConnect()} fullWidth testID="m2-steps-explain-continue" />
            <Button label={t('steps.explain.notNow')} variant="ghost" onPress={vm.cancelExplain} fullWidth testID="m2-steps-explain-cancel" />
          </View>
        ) : null}
      </Sheet>
    </ScrollView>
  );
});

const BAR_HEIGHT = 112;
/** A day with a few steps still shows a sliver, so it is not read as "no number". */
const MIN_BAR_PERCENT = 4;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  contentWide: { maxWidth: 1024, paddingHorizontal: space.s32, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  gutterWide: { paddingHorizontal: 0 },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  top: { alignItems: 'flex-start' },
  hero: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', gap: space.s16 },
  heroWide: { borderRadius: 32, marginTop: space.s16 },
  ringBig: { position: 'absolute', right: -50, bottom: -70, width: 210, height: 210, borderRadius: radius.full, borderWidth: 28, borderColor: color.onHeroRule },
  ringSmall: { position: 'absolute', right: 60, top: -60, width: 140, height: 140, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  glyph: { position: 'absolute', right: space.gutterPhone, top: 76, width: 64, height: 64, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  title: { fontFamily: font.family.sans, fontSize: 22, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero },
  today: { gap: space.s6, paddingRight: 84 },
  todayLabel: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, textTransform: 'uppercase', color: color.onHero },
  todayValue: { fontFamily: font.family.sans, fontSize: font.size.display + space.s8, lineHeight: font.size.display + space.s16, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -1, color: color.onHero, fontVariant: ['tabular-nums'] },
  todayPending: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  todayNone: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  heroError: { gap: space.s8 },
  heroRetry: { alignSelf: 'flex-start', minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6, backgroundColor: color.heroCurrent },
  heroRetryText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: TEAL.deep },
  noPressure: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  chipOnHero: { backgroundColor: color.heroCurrent },
  chipOnCard: { backgroundColor: TEAL.soft },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  card: { padding: space.s16, gap: space.s12, borderRadius: 24 },
  cardWide: { padding: space.s24, borderRadius: 24, borderWidth: 1, borderColor: color.ruleSoft },
  liveCount: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s6, paddingTop: space.s4 },
  chartWide: { gap: space.s16, paddingTop: space.s8 },
  barCol: { flex: 1, minWidth: 0, alignItems: 'center', gap: space.s4 },
  barValue: { fontFamily: font.family.sans, fontSize: 10, fontWeight: fontWeight(font.weight.heavy), color: color.text2, fontVariant: ['tabular-nums'] },
  barValueWide: { fontSize: font.size.caption },
  barTrack: { width: '100%', maxWidth: 30, height: BAR_HEIGHT, borderRadius: radius.md, backgroundColor: color.surface2, justifyContent: 'flex-end', overflow: 'hidden' },
  barTrackWide: { maxWidth: 64, height: 160 },
  barTrackEmpty: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.ruleStrong },
  barFill: { width: '100%', borderRadius: radius.md, backgroundColor: color.chartCategorical1 },
  barDay: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  barDayToday: { color: color.text, fontWeight: fontWeight(font.weight.heavy) },
  barDayWide: { fontSize: font.size.bodySm },
  syncLine: { flexDirection: 'row', alignItems: 'center', gap: space.s8, borderTopWidth: 1, borderTopColor: color.ruleSoft, paddingTop: space.s8 },
  attention: { color: color.attention },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s8, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  sourceIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stateLine: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  stateText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  stateOn: { color: color.positive },
  connectButton: { minHeight: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.action },
  connectText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  ghostButton: { minHeight: size.touchTarget, minWidth: size.touchTarget, paddingHorizontal: space.s8, justifyContent: 'center', alignItems: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.surface3 },
  saved: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  sheet: { gap: space.s12 },
});
