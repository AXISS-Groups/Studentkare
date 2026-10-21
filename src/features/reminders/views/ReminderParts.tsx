import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { M2Card, M2Heading, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { dayDone } from '../viewmodel/MedsTodayViewModel';
import type { MedsTodayPlan, MedsTodayViewModel } from '../viewmodel/MedsTodayViewModel';
import { REMINDER_SLOTS, slotTime } from '../viewmodel/MedicineRemindersViewModel';
import type { MedicineRemindersViewModel, ReminderSlot } from '../viewmodel/MedicineRemindersViewModel';
import type { ClockTime, WaterReminderPlan, WaterRemindersViewModel } from '../viewmodel/WaterRemindersViewModel';

/**
 * Pieces shared by the Mobile 2.0 reminder surfaces: the Medicines today and
 * Water cards on M2Insights, and the M2Reminders and M2Water screens (web and
 * Expo). Every control is ≥ 44 px with a role and a spoken label; nothing here
 * animates, and nothing celebrates (DESIGN.md §2.2).
 */

type Translate = ReturnType<typeof useT>;

const MINUTES_PER_HOUR = 60;
const PAD = 2;

/** "09:00": 24-hour clock, the same in every language. */
export function clock(time: ClockTime): string {
  return `${String(time.hour).padStart(PAD, '0')}:${String(time.minute).padStart(PAD, '0')}`;
}

/** "2 h", "1 h 30 min", "45 min". */
export function gapLabel(minutes: number, t: Translate): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR);
  const m = minutes % MINUTES_PER_HOUR;
  if (h && m) return t('m2r.wrem.hoursMinutes', { h, m });
  return h ? t('m2r.wrem.hours', { h }) : t('m2r.wrem.minutes', { m });
}

/** Grouped digits ("2,000"), in the device's own style. */
export function ml(value: number): string {
  return value.toLocaleString();
}

export type PillTone = 'primary' | 'soft' | 'hero' | 'heroVeil';

const PILL: Record<PillTone, { fill: string; ink: string }> = {
  primary: { fill: color.action, ink: color.onAction },
  soft: { fill: color.surface3, ink: color.action },
  hero: { fill: color.heroCurrent, ink: color.onHeroCurrent },
  heroVeil: { fill: color.onHeroVeil, ink: color.onHero },
};

/** A rounded action button with an icon (or two). Disabled is drawn muted and announced. */
export function PillButton({ icons, label, spoken, onPress, disabled = false, busy = false, tone = 'primary', style, testID }: {
  icons: readonly SkIconName[]; label: string; spoken: string; onPress: () => void; disabled?: boolean; busy?: boolean;
  tone?: PillTone; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const c = PILL[tone];
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={spoken} aria-label={spoken} aria-disabled={disabled}
      accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.pill, { backgroundColor: c.fill }, disabled ? styles.disabled : null, focused ? focusRing : null, style]}>
      {icons.map((name) => <Icon key={name} name={name} size={16} color={c.ink} strokeWidth={2.4} />)}
      <Text numberOfLines={1} style={[styles.pillText, { color: c.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** A track with a fill, capped at full. Decorative: the words beside it carry the value. */
export function FillBar({ value, track, fill, height = space.s8 }: { value: number; track: string; fill: string; height?: number }) {
  const width = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` as const;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.track, { backgroundColor: track, height }]}>
      <View style={[styles.fill, { backgroundColor: fill, width }]} />
    </View>
  );
}

/** −  value  + : a bounded stepper. */
export function Stepper({ label, value, onLess, onMore, canLess, canMore, lessLabel, moreLabel, testID }: {
  label: string; value: string; onLess: () => void; onMore: () => void; canLess: boolean; canMore: boolean;
  lessLabel: string; moreLabel: string; testID: string;
}) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Text style={[m2Text.cardTitle, styles.stepperLabel]}>{label}</Text>
      <StepButton icon="minus" label={lessLabel} disabled={!canLess} onPress={onLess} testID={`${testID}-less`} />
      <Text style={styles.stepperValue} aria-live="polite" testID={`${testID}-value`}>{value}</Text>
      <StepButton icon="plus" label={moreLabel} disabled={!canMore} onPress={onMore} testID={`${testID}-more`} />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress, testID }: { icon: SkIconName; label: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={label} aria-label={label} aria-disabled={disabled}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.step, disabled ? styles.disabled : null, focused ? focusRing : null]}>
      <Icon name={icon} size={18} color={color.action} strokeWidth={2.4} />
    </Pressable>
  );
}

/** "1 of 2 taken today · 1 skipped", or for a plan without a count, what today holds. */
export function doseLine(plan: MedsTodayPlan, t: Translate): string {
  const skipped = plan.dosesSkipped ?? 0;
  if (plan.dosesPlanned === null) {
    if (plan.dosesTaken > 0) return t('m2r.meds.onceTaken');
    return skipped > 0 ? t('m2r.meds.onceSkipped') : t('m2r.meds.onceNone');
  }
  const line = t('m2r.meds.progress', { taken: plan.dosesTaken, planned: plan.dosesPlanned });
  return skipped > 0 ? `${line} · ${t('m2r.meds.skippedPart', { count: skipped })}` : line;
}

/** One medicine: its name and dose from the server, today's doses, Taken / Skip / Undo. */
export const DoseRow = observer(function DoseRow({ vm, plan, children, testID }: {
  vm: MedsTodayViewModel; plan: MedsTodayPlan; children?: React.ReactNode; testID: string;
}) {
  const t = useT();
  const undo = vm.undoFor(plan);
  const busy = vm.busyPlan === plan.planId;
  const done = dayDone(plan);
  const actionable = vm.online && vm.busyPlan === null;
  const error = vm.error && vm.error.planId === plan.planId ? say(t, vm.error.said) : '';
  return (
    <View style={styles.dose} testID={testID}>
      <View style={styles.doseHead}>
        <View style={[styles.doseTile]}><Icon name="pill-3" size={18} color={color.serviceTealInk} strokeWidth={2.1} /></View>
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle} testID={`${testID}-name`}>{plan.name}</Text>
          {plan.dosage ? <Text style={m2Text.meta}>{plan.dosage}</Text> : null}
          <Text style={styles.doseLine} testID={`${testID}-line`}>{busy ? t('m2r.meds.working') : doseLine(plan, t)}</Text>
        </View>
      </View>
      {!done || undo ? (
        <View style={styles.actions}>
          {!done ? (
            <>
              <PillButton icons={['check']} label={t('m2r.meds.take')} spoken={t('m2r.meds.takeSpoken', { name: plan.name })}
                disabled={!actionable} busy={busy && vm.busyAction === 'take'} onPress={() => void vm.take(plan.planId)} testID={`${testID}-take`} />
              <PillButton icons={['skip-forward']} label={t('m2r.meds.skip')} spoken={t('m2r.meds.skipSpoken', { name: plan.name })} tone="soft"
                disabled={!actionable} busy={busy && vm.busyAction === 'skip'} onPress={() => void vm.skip(plan.planId)} testID={`${testID}-skip`} />
            </>
          ) : null}
          {undo ? (
            <PillButton icons={['undo']} label={t('m2r.meds.undo')} tone="soft"
              spoken={t(undo.outcome === 'SKIPPED' ? 'm2r.meds.undoSkippedSpoken' : 'm2r.meds.undoTakenSpoken', { name: plan.name })}
              disabled={!actionable} busy={busy && vm.busyAction === 'undo'} onPress={() => void vm.undo(plan.planId)} testID={`${testID}-undo`} />
          ) : null}
        </View>
      ) : null}
      {error ? <Text role="alert" accessibilityLiveRegion="polite" style={styles.error} testID={`${testID}-error`}>{error}</Text> : null}
      {children}
    </View>
  );
});

/** The phone's daily reminder for one medicine: off or one of the slots (times from settings). */
export const MedicineReminderChips = observer(function MedicineReminderChips({ vm, plan, testID }: {
  vm: MedicineRemindersViewModel; plan: { planId: string; name: string }; testID: string;
}) {
  const t = useT();
  const current = vm.reminders[plan.planId] ?? null;
  const choices: { key: ReminderSlot | 'off'; label: string }[] = [
    { key: 'off', label: t('m2r.meds.remindOff') },
    ...REMINDER_SLOTS.map((slot) => ({ key: slot, label: t(`m2r.slot.${slot}` as MessageKey, { time: clock(slotTime(slot)) }) })),
  ];
  const group = t('m2r.meds.remindLabel', { name: plan.name });
  return (
    <View role="radiogroup" accessibilityRole="radiogroup" accessibilityLabel={group} aria-label={group} style={styles.chips} testID={testID}>
      {choices.map((choice) => {
        const selected = (current ?? 'off') === choice.key;
        const busy = vm.changingId === plan.planId;
        return (
          <Pressable key={choice.key} role="radio" accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, disabled: busy }}
            accessibilityLabel={choice.label} aria-label={choice.label} disabled={busy} testID={`${testID}-${choice.key}`}
            onPress={() => void vm.setReminder(plan.planId, choice.key === 'off' ? null : choice.key)}
            style={({ focused }: PressState) => [styles.chip, selected ? styles.chipOn : null, focused ? focusRing : null]}>
            <Icon name={choice.key === 'off' ? 'bell-off' : 'bell'} size={14} color={selected ? color.onAction : color.action} strokeWidth={2.3} />
            <Text style={[styles.chipText, selected ? styles.chipTextOn : null]}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

/**
 * Water reminders. Without a scheduler (the web) it says plainly that they
 * need the phone app; with one it shows what the phone has and lets the
 * student pick a gap and hours.
 */
export const WaterRemindersPanel = observer(function WaterRemindersPanel({ vm, onOpenSettings }: {
  vm?: WaterRemindersViewModel; onOpenSettings?: () => void;
}) {
  const t = useT();
  if (!vm) {
    return (
      <M2Card style={styles.panel} testID="m2-water-reminders-web">
        <View style={styles.panelHead}>
          <Icon name="bell-off" size={20} color={color.text2} />
          <M2Heading style={m2Text.cardTitle}>{t('m2r.wrem.title')}</M2Heading>
        </View>
        <Text style={m2Text.body}>{t('m2r.wrem.web')}</Text>
      </M2Card>
    );
  }
  const current = vm.current;
  const step = (field: keyof WaterReminderPlan, label: string, value: string) => (
    <Stepper label={label} value={value} testID={`m2-water-rem-${field}`}
      canLess={vm.canStep(field, -1) && !vm.saving} canMore={vm.canStep(field, 1) && !vm.saving}
      onLess={() => vm.step(field, -1)} onMore={() => vm.step(field, 1)}
      lessLabel={t('m2r.wrem.decrease', { field: label })} moreLabel={t('m2r.wrem.increase', { field: label })} />
  );
  const times = vm.times;
  return (
    <M2Card style={styles.panel} testID="m2-water-reminders">
      <View style={styles.panelHead}>
        <Icon name={current ? 'bell' : 'bell-off'} size={20} color={current ? color.action : color.text2} />
        <M2Heading style={m2Text.cardTitle}>{t('m2r.wrem.title')}</M2Heading>
      </View>
      <Text style={m2Text.body} aria-live="polite" testID="m2-water-rem-state">
        {current
          ? t('m2r.wrem.onState', { gap: gapLabel(current.intervalMinutes, t), from: clock({ hour: current.startHour, minute: 0 }), to: clock({ hour: current.endHour, minute: 0 }) })
          : t('m2r.wrem.offState')}
      </Text>
      {vm.loadFailed ? <Text role="alert" style={styles.error}>{t('m2r.wrem.loadFailed')}</Text> : null}
      {step('intervalMinutes', t('m2r.wrem.gap'), gapLabel(vm.draft.intervalMinutes, t))}
      {step('startHour', t('m2r.wrem.from'), clock({ hour: vm.draft.startHour, minute: 0 }))}
      {step('endHour', t('m2r.wrem.to'), clock({ hour: vm.draft.endHour, minute: 0 }))}
      <Text style={m2Text.meta} testID="m2-water-rem-times">
        {times.length ? t('m2r.wrem.times', { count: times.length, times: times.map(clock).join(', ') }) : t('m2r.wrem.noTimes')}
      </Text>
      {vm.permissionDenied ? (
        <View style={styles.denied} accessibilityRole="alert" testID="m2-water-rem-denied">
          <Text style={styles.deniedText}>{t('reminders.denied')}</Text>
          {onOpenSettings ? <PillButton icons={['bell']} label={t('reminders.openSettings')} spoken={t('reminders.openSettings')} tone="soft" onPress={onOpenSettings} testID="m2-water-rem-settings" /> : null}
        </View>
      ) : null}
      {vm.failed ? <Text role="alert" style={styles.error} testID="m2-water-rem-failed">{t('m2r.wrem.failed')}</Text> : null}
      <View style={styles.actions}>
        {!current || vm.changed ? (
          <PillButton icons={['bell']} label={vm.saving ? t('m2r.wrem.saving') : current ? t('m2r.wrem.saveChanges') : t('m2r.wrem.turnOn')}
            spoken={current ? t('m2r.wrem.saveChanges') : t('m2r.wrem.turnOn')} disabled={vm.saving || times.length === 0}
            busy={vm.saving} onPress={() => void vm.save()} testID="m2-water-rem-save" />
        ) : null}
        {current ? (
          <PillButton icons={['bell-off']} label={t('m2r.wrem.turnOff')} spoken={t('m2r.wrem.turnOff')} tone="soft" disabled={vm.saving}
            onPress={() => void vm.turnOff()} testID="m2-water-rem-off" />
        ) : null}
      </View>
      <Text style={m2Text.meta}>{t('m2r.wrem.lockScreen')}</Text>
    </M2Card>
  );
});

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  pill: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: space.s6,
  },
  pillText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy) },
  disabled: { opacity: 0.45 },
  track: { width: '100%', borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  stepperLabel: { flex: 1, minWidth: 0 },
  stepperValue: {
    minWidth: 76, textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy),
    color: color.text, fontVariant: ['tabular-nums'],
  },
  step: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface3,
  },
  dose: { gap: space.s10, paddingVertical: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  doseHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  doseTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.serviceTealSoft },
  doseLine: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  error: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  chip: {
    minHeight: size.touchTarget, paddingHorizontal: space.s12, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6,
    borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface,
  },
  chipOn: { backgroundColor: color.action, borderColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  chipTextOn: { color: color.onAction },
  panel: { padding: space.s16, borderRadius: radius.xl, gap: space.s12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  denied: { gap: space.s8, padding: space.s12, borderRadius: radius.md, backgroundColor: color.attentionBg },
  deniedText: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.attention },
});
