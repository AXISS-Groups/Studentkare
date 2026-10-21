import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Skeleton } from '@/design-system';
import { M2Card, M2Heading, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { say, useT } from '@/i18n';
import { CardError, TileIcon } from '@/features/m2health/HealthParts';
import type { MedsTodayViewModel } from '../viewmodel/MedsTodayViewModel';
import type { WaterViewModel } from '../viewmodel/WaterViewModel';
import { DoseRow, FillBar, PillButton, ml } from './ReminderParts';

/**
 * The two "today" cards on Mobile 2.0 My health (M2Insights): Medicines today
 * and Water. Each reads, fails and retries on its own. Names and doses are
 * shown here because My health is not a store page; M2Home shows counts only.
 */

function CardHead({ icon, fill, ink, title, open, testID }: {
  icon: 'pill-3' | 'glass'; fill: string; ink: string; title: string; open?: { label: string; spoken: string; onPress: () => void }; testID: string;
}) {
  return (
    <View style={styles.head}>
      <TileIcon icon={icon} fill={fill} ink={ink} tile={38} />
      <M2Heading style={[m2Text.cardTitle, styles.grow]}>{title}</M2Heading>
      {open ? (
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={open.spoken} aria-label={open.spoken} onPress={open.onPress} testID={`${testID}-open`}
          style={({ focused }: PressState) => [styles.open, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{open.label}</Text>
          <Icon name="chevron-right" size={14} color={color.action} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}

export const MedsTodayCard = observer(function MedsTodayCard({ vm, onOpen }: { vm: MedsTodayViewModel; onOpen: () => void }) {
  const t = useT();
  if (vm.today.phase === 'error') return <CardError title={t('m2r.meds.failedTitle')} onRetry={vm.load} testID="m2-ins-meds-error" />;
  const open = { label: t('m2r.meds.open'), spoken: t('m2r.meds.openSpoken'), onPress: onOpen };
  return (
    <M2Card style={styles.card} testID="m2-ins-meds">
      <CardHead icon="pill-3" fill={color.serviceTealSoft} ink={color.serviceTealInk} title={t('m2r.meds.title')} open={open} testID="m2-ins-meds" />
      {vm.today.phase === 'loading' && !vm.today.data ? <Skeleton label={t('m2r.meds.loading')} lines={['80%', '60%']} /> : null}
      {vm.today.data && vm.plans.length === 0 ? <Text style={m2Text.body} testID="m2-ins-meds-empty">{t('m2r.meds.empty')}</Text> : null}
      {vm.plans.map((plan) => <DoseRow key={plan.planId} vm={vm} plan={plan} testID={`m2-ins-dose-${plan.planId}`} />)}
      {vm.plans.length > 0 && !vm.online ? <Text style={styles.offline}>{t('m2r.meds.offlineAction')}</Text> : null}
      {vm.status ? <Text aria-live="polite" accessibilityLiveRegion="polite" style={styles.status}>{say(t, vm.status)}</Text> : null}
      {vm.plans.length > 0 ? <Text style={styles.note}>{t('m2r.meds.noScore')}</Text> : null}
    </M2Card>
  );
});

export const WaterCard = observer(function WaterCard({ vm, onOpen }: { vm: WaterViewModel; onOpen: () => void }) {
  const t = useT();
  if (vm.today.phase === 'error') return <CardError title={t('m2r.water.title')} onRetry={vm.load} testID="m2-ins-water-error" />;
  const today = vm.today.data;
  const open = { label: t('m2r.water.open'), spoken: t('m2r.water.openSpoken'), onPress: onOpen };
  const error = vm.error ? say(t, vm.error) : '';
  return (
    <M2Card style={styles.card} testID="m2-ins-water">
      <CardHead icon="glass" fill={color.serviceSkySoft} ink={color.serviceSkyInk} title={t('m2r.water.title')} open={open} testID="m2-ins-water" />
      {!today ? <Skeleton label={t('m2r.water.loading')} lines={['70%', '100%']} /> : (
        <>
          <Text style={styles.amount} aria-live="polite" accessibilityLiveRegion="polite" testID="m2-ins-water-amount">
            {t('m2r.water.ofGoal', { consumed: ml(today.consumedMl), goal: ml(today.goalMl) })}
          </Text>
          <FillBar value={vm.fill} track={color.serviceSkySoft} fill={color.serviceSkyDeep} />
          {today.goalSource === 'DEFAULT' ? <Text style={m2Text.meta}>{t('m2r.water.goalDefaultNote')}</Text> : null}
          <View style={styles.actions}>
            <PillButton icons={['plus', 'glass']} label={vm.busy === 'add' ? t('m2r.water.adding') : t('m2r.water.addGlass', { ml: ml(vm.glassMl) })}
              spoken={t('m2r.water.addGlassSpoken', { ml: ml(vm.glassMl) })} disabled={!vm.canAdd} busy={vm.busy === 'add'}
              onPress={() => void vm.addGlass()} testID="m2-ins-water-add" />
            <PillButton icons={['undo']} label={vm.busy === 'undo' ? t('m2r.water.undoing') : t('m2r.water.undo')} spoken={t('m2r.water.undoSpoken')}
              tone="soft" disabled={!vm.canUndo} busy={vm.busy === 'undo'} onPress={() => void vm.undo()} testID="m2-ins-water-undo" />
          </View>
          {!vm.online ? <Text style={styles.offline}>{t('m2r.water.offlineAction')}</Text> : null}
          {error ? <Text role="alert" style={styles.error} testID="m2-ins-water-error-line">{error}</Text> : null}
        </>
      )}
    </M2Card>
  );
});

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  card: { padding: space.s16, borderRadius: 24, gap: space.s10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  open: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s4 },
  amount: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  offline: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  status: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  error: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  note: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.text3, borderRadius: radius.md },
});
