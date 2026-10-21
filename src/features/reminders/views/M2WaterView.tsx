import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { OfflineBanner, Rise, Skeleton } from '@/design-system';
import { Gradient, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SosButton, heroStops, m2Text, useOwnPhoneChrome, webAttrs } from '@/design-system/m2';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { say, useLanguage, useT } from '@/i18n';
import { clockLabel } from '@/features/phoneboards/format';
import { dateLocale, localDate } from '@/features/labResults/viewmodel/trendScreenModels';
import { CardError } from '@/features/m2health/HealthParts';
import { weekBars } from '../viewmodel/WaterViewModel';
import type { WaterViewModel } from '../viewmodel/WaterViewModel';
import type { WaterRemindersViewModel } from '../viewmodel/WaterRemindersViewModel';
import { FillBar, PillButton, Stepper, WaterRemindersPanel, ml } from './ReminderParts';

/**
 * Mobile 2.0 My health · Water (M2Water; no canvas board, designed in the M2
 * language, brief design/screens/briefs/M2Water.md). Today's total against the
 * goal the student set, one-tap glass and undo, the goal, the last days, and
 * optional reminders (phone app only). Every number is the server's; a day with
 * nothing logged is unknown, never 0. No streak, medal or score.
 */
export interface M2WaterLinks {
  back: () => void;
  sos: () => void;
  /** The phone's notification settings (Expo). */
  openSettings?: () => void;
}

const WEEK_BAR_HEIGHT = 96;

export const M2WaterView = observer(function M2WaterView({ vm, reminders, online, links }: {
  vm: WaterViewModel; reminders?: WaterRemindersViewModel; online: boolean; links: M2WaterLinks;
}) {
  const t = useT();
  const locale = dateLocale(useLanguage().lang);
  useOwnPhoneChrome();
  const today = vm.today.data;
  const goal = vm.goal.data;
  const error = vm.error ? say(t, vm.error) : '';

  const header = (
    <View style={styles.header} testID="m2-water-header">
      <RoundButton icon="arrow-left" label={t('m2r.water.back')} onPress={links.back} testID="m2-water-back" />
      <View style={styles.grow}>
        <Text numberOfLines={1} style={styles.eyebrow}>{t('m2r.water.eyebrow')}</Text>
        <M2Heading level={1} style={styles.title}>{t('m2r.water.title')}</M2Heading>
      </View>
      <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="m2-water-sos" />
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-water">
      {header}
      {!online ? <View style={styles.gutter}><OfflineBanner message={t('m2r.water.offlineAction')} /></View> : null}

      <Rise style={styles.gutter}>
        {vm.today.phase === 'error' ? <CardError title={t('m2r.water.title')} onRetry={vm.load} testID="m2-water-today-error" /> : (
          <Gradient colors={heroStops('sky')} angle={150} style={styles.hero} testID="m2-water-hero">
            {!today ? <Skeleton label={t('m2r.water.loading')} lines={['50%', '80%']} /> : (
              <>
                <View accessible accessibilityLabel={t('m2r.water.ofGoal', { consumed: ml(today.consumedMl), goal: ml(today.goalMl) })}
                  aria-live="polite" testID="m2-water-total">
                  <Text style={styles.heroValue}>{t('m2r.water.heroMl', { ml: ml(today.consumedMl) })}</Text>
                  <Text style={styles.heroSub}>
                    {t(today.goalSource === 'OWNER' ? 'm2r.water.heroOfGoal' : 'm2r.water.heroOfDefault', { goal: ml(today.goalMl) })}
                  </Text>
                </View>
                <FillBar value={vm.fill} track={color.onHeroTrack} fill={color.onHero} height={space.s10} />
                <View style={styles.heroActions}>
                  <PillButton icons={['plus', 'glass']} tone="hero" label={vm.busy === 'add' ? t('m2r.water.adding') : t('m2r.water.addGlass', { ml: ml(vm.glassMl) })}
                    spoken={t('m2r.water.addGlassSpoken', { ml: ml(vm.glassMl) })} disabled={!vm.canAdd} busy={vm.busy === 'add'}
                    onPress={() => void vm.addGlass()} testID="m2-water-add" />
                  <PillButton icons={['undo']} tone="heroVeil" label={vm.busy === 'undo' ? t('m2r.water.undoing') : t('m2r.water.undo')}
                    spoken={t('m2r.water.undoSpoken')} disabled={!vm.canUndo} busy={vm.busy === 'undo'}
                    onPress={() => void vm.undo()} testID="m2-water-undo" />
                </View>
              </>
            )}
          </Gradient>
        )}
        {error ? <Text role="alert" style={[styles.error, styles.afterHero]} testID="m2-water-error">{error}</Text> : null}
      </Rise>

      {today ? (
        <Rise index={1} style={styles.gutter}>
          <M2Card style={styles.card} testID="m2-water-entries">
            <M2Heading style={m2Text.cardTitle}>{t('m2r.water.today')}</M2Heading>
            {today.entries.length === 0 ? <Text style={m2Text.body}>{t('m2r.water.todayEmpty')}</Text> : (
              [...today.entries].reverse().map((entry) => (
                <Text key={entry.id} style={styles.entry}>{t('m2r.water.entry', { time: clockLabel(entry.recordedAt), ml: ml(entry.amountMl) })}</Text>
              ))
            )}
          </M2Card>
        </Rise>
      ) : null}

      <Rise index={2} style={styles.gutter}>
        {vm.goal.phase === 'error' ? <CardError title={t('m2r.water.goalTitle')} onRetry={vm.load} testID="m2-water-goal-error" /> : (
          <M2Card style={styles.card} testID="m2-water-goal">
            <M2Heading style={m2Text.cardTitle}>{t('m2r.water.goalTitle')}</M2Heading>
            {!goal ? <Skeleton label={t('m2r.water.goalTitle')} lines={['40%']} /> : vm.goalDraft === null ? (
              <View style={styles.goalRow}>
                <View style={styles.grow}>
                  <Text style={styles.goalValue}>{t('m2r.water.goalMl', { ml: ml(goal.goalMl) })}</Text>
                  <Text style={m2Text.meta}>{t(goal.goalSource === 'OWNER' ? 'm2r.water.goalYours' : 'm2r.water.goalSuggested')}</Text>
                </View>
                <PillButton icons={[]} label={t('m2r.water.change')} spoken={t('m2r.water.changeSpoken')} tone="soft"
                  disabled={!online || vm.busy !== null} onPress={vm.startGoalEdit} testID="m2-water-goal-change" />
              </View>
            ) : (
              <>
                <Stepper label={t('m2r.water.goalTitle')} value={t('m2r.water.goalMl', { ml: ml(vm.goalDraft) })} testID="m2-water-goal-step"
                  canLess={vm.canGoalDown} canMore={vm.canGoalUp} onLess={() => vm.stepGoal(-1)} onMore={() => vm.stepGoal(1)}
                  lessLabel={t('m2r.water.goalLess', { ml: ml(vm.glassMl) })} moreLabel={t('m2r.water.goalMore', { ml: ml(vm.glassMl) })} />
                <Text style={m2Text.meta}>{t('m2r.water.goalRange', { min: ml(vm.goalBounds.min), max: ml(vm.goalBounds.max) })}</Text>
                <View style={styles.row}>
                  <PillButton icons={[]} label={vm.busy === 'goal' ? t('m2r.water.saving') : t('m2r.water.save')} spoken={t('m2r.water.save')}
                    disabled={!online || vm.busy !== null} busy={vm.busy === 'goal'} onPress={() => void vm.saveGoal()} testID="m2-water-goal-save" />
                  <PillButton icons={[]} label={t('m2r.water.cancel')} spoken={t('m2r.water.cancel')} tone="soft" disabled={vm.busy === 'goal'}
                    onPress={vm.cancelGoalEdit} testID="m2-water-goal-cancel" />
                </View>
              </>
            )}
          </M2Card>
        )}
      </Rise>

      <Rise index={3} style={styles.gutter}>
        {vm.days.phase === 'error' ? <CardError title={t('m2r.water.weekFailed')} onRetry={vm.loadWeek} testID="m2-water-week-error" /> : (
          <M2Card style={styles.card} testID="m2-water-week">
            <M2Heading style={m2Text.cardTitle}>{t('m2r.water.week', { count: vm.days.data?.days.length ?? '' })}</M2Heading>
            {!vm.days.data ? <Skeleton label={t('m2r.water.weekLoading')} lines={['100%', '100%']} /> : (
              <WeekBars days={vm.days.data.days} goalMl={vm.days.data.goalMl} locale={locale} />
            )}
          </M2Card>
        )}
      </Rise>

      <Rise index={4} style={styles.gutter}>
        <WaterRemindersPanel vm={reminders} onOpenSettings={links.openSettings} />
      </Rise>

      <Text style={[styles.gutter, styles.note]}>{t('m2r.water.noScore')}</Text>
      <View {...webAttrs({ 'aria-hidden': 'true' })} style={styles.spacer} />
    </ScrollView>
  );
});

/** One bar per day. A day with nothing logged is an empty track with a dash, read as "Nothing logged". */
function WeekBars({ days, goalMl, locale }: { days: readonly { date: string; consumedMl: number | null }[]; goalMl: number; locale: string }) {
  const t = useT();
  const bars = weekBars(days, goalMl);
  const dayName = (iso: string) => localDate(iso)?.toLocaleDateString(locale, { weekday: 'short' }) ?? iso;
  return (
    <View role="list" accessibilityRole="list" style={styles.week} testID="m2-water-bars">
      {days.map((day, i) => {
        const bar = bars[i];
        const value = day.consumedMl === null ? t('m2r.water.dayNone') : t('m2r.water.goalMl', { ml: ml(day.consumedMl) });
        const spoken = t('m2r.water.daySpoken', { day: dayName(day.date), value });
        return (
          <View key={day.date} role="listitem" accessible accessibilityLabel={spoken} aria-label={spoken} style={styles.day} testID={`m2-water-day-${day.date}`}>
            <Text numberOfLines={1} style={styles.dayValue}>{day.consumedMl === null ? t('m2r.water.dayNoneShort') : ml(day.consumedMl)}</Text>
            <View style={styles.dayTrack}>
              {bar !== null ? <View style={[styles.dayFill, { height: `${Math.max(2, Math.round(bar * 100))}%` }]} /> : null}
            </View>
            <Text numberOfLines={1} style={styles.dayName}>{dayName(day.date)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  gutter: { paddingHorizontal: space.gutterPhone },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.text },
  hero: { borderRadius: 28, padding: space.s20, gap: space.s14 },
  heroValue: { fontFamily: font.family.sans, fontSize: font.size.display, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.onHero, fontVariant: ['tabular-nums'] },
  heroSub: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  afterHero: { marginTop: space.s8 },
  error: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  card: { padding: space.s16, borderRadius: radius.xl, gap: space.s10 },
  entry: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, fontVariant: ['tabular-nums'] },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  goalValue: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  week: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s6 },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: space.s4 },
  dayValue: { fontFamily: font.family.sans, fontSize: 10.5, fontWeight: fontWeight(font.weight.heavy), color: color.text2, fontVariant: ['tabular-nums'] },
  dayTrack: { width: '100%', maxWidth: 30, height: WEEK_BAR_HEIGHT, borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: color.serviceSkySoft },
  dayFill: { width: '100%', borderRadius: radius.sm, backgroundColor: color.serviceSkyDeep },
  dayName: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  note: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  spacer: { height: space.s8 },
});
