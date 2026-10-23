import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Chip, ErrorState, OfflineBanner, Rise, Sheet, Skeleton, SwitchRow, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { Gradient, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SoftIcon, SosButton, heroStops, m2Text, useOwnPhoneChrome, webAttrs } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { say, useT } from '@/i18n';
import { PillButton } from '@/features/reminders/views/ReminderParts';
import type { OrderedItem, Refill, TrackablePlan } from '../data/refillsApi';
import { type FieldName, type RefillsViewModel, runsOutSoon } from '../viewmodel/RefillsViewModel';
import { dayText, isoDay } from '../viewmodel/refillMessages';

/**
 * Refills (M2Refills; brief design/screens/briefs/M2Refills.md). Mobile 2.0
 * language, no canvas board. The run-out date and reminder day are the
 * server's count from the student's own pack and schedule; nothing on this
 * screen suggests a dose. A medicine from a shop order can be reordered in one
 * tap; one from Medicines today is refilled by a pharmacy (Refill request).
 * Rule L: no price, offer or product on this screen, and the reorder link
 * carries the refill only to the Reorder board.
 */
export interface M2RefillsLinks {
  back: () => void;
  sos: () => void;
  reorder: (refill: Refill) => void;
  requestRefill: () => void;
}

const FIELDS: readonly { name: FieldName; label: 'refill.setup.packSize' | 'refill.setup.packs' | 'refill.setup.perDose' | 'refill.setup.perDay' | 'refill.setup.daysBefore'; limit: 'packSize' | 'packs' | 'perDose' | 'perDay' | 'daysBefore' }[] = [
  { name: 'packSize', label: 'refill.setup.packSize', limit: 'packSize' },
  { name: 'packs', label: 'refill.setup.packs', limit: 'packs' },
  { name: 'perDose', label: 'refill.setup.perDose', limit: 'perDose' },
  { name: 'perDay', label: 'refill.setup.perDay', limit: 'perDay' },
  { name: 'daysBefore', label: 'refill.setup.daysBefore', limit: 'daysBefore' },
];

const RefillRow = observer(function RefillRow({ vm, refill, links }: { vm: RefillsViewModel; refill: Refill; links: M2RefillsLinks }) {
  const t = useT();
  const busy = vm.busyId === refill.id;
  const off = !vm.online || vm.busyId !== null;
  const name = refill.label;
  const soon = runsOutSoon(refill);
  const ranOut = refill.daysLeft === 0;
  const snoozed = refill.snoozedUntil && refill.snoozedUntil * 1000 > Date.now() ? refill.snoozedUntil : null;
  const remindLine = !refill.enabled ? t('refill.row.off')
    : snoozed ? t('refill.row.snoozed', { date: dayText(isoDay(snoozed)) })
      : t('refill.row.remind', { date: dayText(refill.remindOn), count: refill.remindDaysBefore });
  return (
    <View style={[styles.row, vm.focusId === refill.id ? styles.rowFocus : null]} testID={`m2-refill-${refill.id}`}>
      <View style={styles.rowTop}>
        <SoftIcon icon="pill-3" hue="teal" tile={44} iconSize={20} />
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{name}</Text>
          <Text style={m2Text.meta}>{refill.source === 'ORDER' ? t('refill.row.sourceOrder') : t('refill.row.sourcePlan')}</Text>
        </View>
        <View style={[styles.daysPill, soon ? styles.daysSoon : null]}>
          <Text style={[styles.daysText, soon ? styles.daysTextSoon : null]}>
            {refill.daysLeft === 1 ? t('refill.row.dayLeft') : t('refill.row.daysLeft', { count: refill.daysLeft })}
          </Text>
        </View>
      </View>
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Icon name="box" size={14} color={color.text3} />
          <Text style={m2Text.body}>{t('refill.row.left', { units: refill.unitsLeft })} · {ranOut ? t('refill.row.runOut', { date: dayText(refill.runsOutOn) }) : t('refill.row.runsOut', { date: dayText(refill.runsOutOn) })}</Text>
        </View>
        <View style={styles.fact}>
          <Icon name="clock" size={14} color={color.text3} />
          <Text style={m2Text.meta}>{t('refill.row.schedule', { perDose: refill.unitsPerDose, perDay: refill.dosesPerDay, pack: refill.packSize })}</Text>
        </View>
        <View style={styles.fact}>
          <Icon name={refill.enabled ? 'calendar' : 'bell-off'} size={14} color={color.text3} />
          <Text style={m2Text.meta}>{remindLine}</Text>
        </View>
      </View>
      <SwitchRow label={t('refill.row.toggle')} detail={t('refill.row.toggleSpoken', { name })} value={refill.enabled}
        disabled={off} onChange={(next) => void vm.toggle(refill, next)} testID={`m2-refill-toggle-${refill.id}`} />
      <View style={styles.actions}>
        {refill.canReorder ? (
          <PillButton icons={['repeat']} label={t('refill.row.reorder')} spoken={t('refill.row.reorderSpoken', { name })}
            disabled={!vm.online} onPress={() => links.reorder(refill)} testID={`m2-refill-reorder-${refill.id}`} />
        ) : (
          <PillButton icons={['stethoscope']} label={t('refill.row.request')} spoken={t('refill.row.requestSpoken', { name })}
            disabled={!vm.online} onPress={links.requestRefill} testID={`m2-refill-request-${refill.id}`} />
        )}
        {refill.enabled ? (
          <PillButton icons={['bell-off']} label={t('refill.row.snooze')} spoken={t('refill.row.snoozeSpoken', { name })} tone="soft"
            disabled={off} busy={busy} onPress={() => void vm.snooze(refill)} testID={`m2-refill-snooze-${refill.id}`} />
        ) : null}
        <PillButton icons={['pencil']} label={t('refill.row.stillHave')} spoken={t('refill.row.stillHaveSpoken', { name })} tone="soft"
          disabled={off} onPress={() => vm.openSheet('adjust', refill)} testID={`m2-refill-adjust-${refill.id}`} />
        <PillButton icons={['plus']} label={t('refill.row.newPack')} spoken={t('refill.row.newPackSpoken', { name })} tone="soft"
          disabled={off} onPress={() => vm.openSheet('restock', refill)} testID={`m2-refill-restock-${refill.id}`} />
        <PillButton icons={['trash']} label={t('refill.row.remove')} spoken={t('refill.row.removeSpoken', { name })} tone="soft"
          disabled={off} onPress={() => vm.openSheet('remove', refill)} testID={`m2-refill-remove-${refill.id}`} />
      </View>
    </View>
  );
});

function PickRow({ title, meta, onPress, testID }: { title: string; meta: string; onPress: () => void; testID: string }) {
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${title}, ${meta}`} aria-label={`${title}, ${meta}`}
      onPress={onPress} testID={testID} style={({ focused }: PressState) => [styles.pick, focused ? focusRing : null]}>
      <View style={styles.grow}>
        <Text style={m2Text.cardTitle}>{title}</Text>
        <Text style={m2Text.meta}>{meta}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
    </Pressable>
  );
}

const SetupSheet = observer(function SetupSheet({ vm }: { vm: RefillsViewModel }) {
  const t = useT();
  const ordered: OrderedItem[] = vm.ordered.data ?? [];
  const plans: TrackablePlan[] = vm.plans.data ?? [];
  const loading = vm.ordered.phase === 'loading' || vm.plans.phase === 'loading';
  const failed = vm.ordered.phase === 'error' && vm.plans.phase === 'error';
  const limits = vm.limits;
  let body: React.ReactNode;
  if (vm.setupStep === 'pick') {
    body = loading ? <Skeleton label={t('refill.setup.loading')} lines={['80%', '100%', '100%']} />
      : failed ? <Text role="alert" style={styles.error}>{t('refill.setup.loadFailed')}</Text>
        : (
          <View style={styles.sheetBody}>
            <Text style={m2Text.body}>{t('refill.setup.pick')}</Text>
            {ordered.length ? <Text style={m2Text.eyebrow}>{t('refill.setup.fromOrders')}</Text> : null}
            {ordered.map((line) => (
              <PickRow key={`${line.orderId}-${line.itemId}`} title={line.name} meta={t('refill.setup.ordered', { date: dayText(isoDay(line.orderedAt)) })}
                onPress={() => vm.pickOrdered(line)} testID={`m2-refill-pick-order-${line.itemId}`} />
            ))}
            {plans.length ? <Text style={m2Text.eyebrow}>{t('refill.setup.fromPlans')}</Text> : null}
            {plans.map((plan) => (
              <PickRow key={plan.id} title={plan.name} meta={t('refill.setup.planned')} onPress={() => vm.pickPlan(plan)} testID={`m2-refill-pick-plan-${plan.id}`} />
            ))}
            {!ordered.length && !plans.length ? <Text style={m2Text.body} testID="m2-refill-pick-none">{t('refill.setup.nothing')}</Text> : null}
          </View>
        );
  } else {
    const choice = vm.choice;
    body = (
      <View style={styles.sheetBody}>
        {choice ? <Text style={m2Text.cardTitle} testID="m2-refill-setup-choice">{choice.name}</Text> : null}
        <View style={styles.note}>
          <Icon name="info" size={16} color={color.info} />
          <Text style={[m2Text.body, styles.grow]}>{t('refill.setup.countNote')}</Text>
        </View>
        {FIELDS.map((field) => {
          const text = vm.fields[field.name];
          const bad = text.trim() !== '' && vm.parsed[field.name] === null;
          const range = t('refill.setup.range', { min: 1, max: limits[field.limit] });
          return (
            <TextField key={field.name} label={t(field.label)} value={text} keyboardType="numeric" maxLength={6}
              onChangeText={(value) => vm.setField(field.name, value)} hint={range} error={bad ? range : undefined}
              testID={`m2-refill-field-${field.name}`} />
          );
        })}
        {choice?.source === 'ORDER' && choice.orderedAt ? (
          <View style={styles.chipsBlock}>
            <Text style={m2Text.cardTitle}>{t('refill.setup.started')}</Text>
            <View style={styles.chips}>
              <Chip label={t('refill.setup.today')} selected={vm.fields.startFrom === 'today'} onPress={() => vm.setStartFrom('today')} testID="m2-refill-start-today" />
              <Chip label={t('refill.setup.orderDay')} selected={vm.fields.startFrom === 'order'} onPress={() => vm.setStartFrom('order')} testID="m2-refill-start-order" />
            </View>
          </View>
        ) : null}
        {vm.setupError ? <Text role="alert" style={styles.error} testID="m2-refill-setup-error">{say(t, vm.setupError)}</Text> : null}
        <Button label={t('refill.setup.save')} size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave} onPress={() => void vm.saveSetup()} testID="m2-refill-save" />
        <Button label={t('refill.setup.another')} variant="ghost" fullWidth disabled={vm.saving} onPress={vm.backToPick} testID="m2-refill-another" />
      </View>
    );
  }
  return (
    <Sheet visible={vm.setupOpen} title={t('refill.setup.title')} onClose={vm.closeSetup} busy={vm.saving} testID="m2-refill-setup">
      {body}
    </Sheet>
  );
});

const RowSheet = observer(function RowSheet({ vm }: { vm: RefillsViewModel }) {
  const t = useT();
  const sheet = vm.sheet;
  if (!sheet) return null;
  const name = sheet.refill.label;
  const title = sheet.kind === 'adjust' ? t('refill.adjust.title') : sheet.kind === 'restock' ? t('refill.restock.title') : t('refill.remove.title', { name });
  const busy = vm.busyId === sheet.refill.id;
  return (
    <Sheet visible title={title} subtitle={sheet.kind === 'remove' ? undefined : name} onClose={vm.closeSheet} busy={busy} testID="m2-refill-sheet">
      <View style={styles.sheetBody}>
        {sheet.kind === 'remove' ? <Text style={m2Text.body}>{t('refill.remove.body')}</Text> : (
          <TextField label={sheet.kind === 'adjust' ? t('refill.adjust.label') : t('refill.restock.label')} value={vm.sheetValue}
            keyboardType="numeric" maxLength={6} onChangeText={vm.setSheetValue}
            hint={t('refill.setup.range', { min: sheet.kind === 'adjust' ? 0 : 1, max: vm.sheetMax })}
            error={vm.sheetError ? say(t, vm.sheetError) : undefined} testID="m2-refill-sheet-field" />
        )}
        <Button label={sheet.kind === 'adjust' ? t('refill.adjust.save') : sheet.kind === 'restock' ? t('refill.restock.save') : t('refill.row.remove')}
          variant={sheet.kind === 'remove' ? 'secondary' : 'primary'} fullWidth busy={busy} disabled={!vm.online}
          onPress={() => void vm.confirmSheet()} testID="m2-refill-sheet-confirm" />
        <Button label={t('common.cancel')} variant="ghost" fullWidth disabled={busy} onPress={vm.closeSheet} testID="m2-refill-sheet-cancel" />
      </View>
    </Sheet>
  );
});

export const M2RefillsView = observer(function M2RefillsView({ vm, links }: { vm: RefillsViewModel; links: M2RefillsLinks }) {
  const t = useT();
  useOwnPhoneChrome();
  const rows = vm.items;
  const ready = vm.list.phase === 'ready' && vm.list.data !== null;
  const headline = !ready || rows.length === 0 ? t('refill.heroLine.none')
    : vm.soonCount === 0 ? t('refill.heroLine.fine') : vm.soonCount === 1 ? t('refill.heroLine.one') : t('refill.heroLine.many', { count: vm.soonCount });

  let body: React.ReactNode;
  if (vm.list.phase === 'error') {
    body = <ErrorState title={t('refill.failedTitle')} body={t('refill.failedBody')} retryLabel={t('common.tryAgain')} onRetry={vm.load} />;
  } else if (!ready) {
    body = <Skeleton label={t('refill.loading')} lines={['60%', '100%', '100%']} />;
  } else if (rows.length === 0) {
    body = (
      <M2Card style={styles.empty} testID="m2-refill-empty">
        <SoftIcon icon="pill-3" hue="teal" tile={52} iconSize={24} />
        <M2Heading style={m2Text.section}>{t('refill.emptyTitle')}</M2Heading>
        <Text style={m2Text.body}>{t('refill.emptyBody')}</Text>
        <PillButton icons={['plus']} label={t('refill.add')} spoken={t('refill.add')} disabled={!vm.online} onPress={() => vm.openSetup()} testID="m2-refill-add-empty" />
      </M2Card>
    );
  } else {
    body = (
      <View style={styles.listWrap}>
        <M2Card style={styles.list} testID="m2-refill-list">
          {rows.map((refill) => <RefillRow key={refill.id} vm={vm} refill={refill} links={links} />)}
        </M2Card>
        <PillButton icons={['plus']} label={t('refill.add')} spoken={t('refill.add')} tone="soft" disabled={!vm.online} onPress={() => vm.openSetup()} testID="m2-refill-add" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-refills">
      <View style={styles.header} testID="m2-refill-header">
        <RoundButton icon="arrow-left" label={t('refill.back')} onPress={links.back} testID="m2-refill-back" />
        <View style={styles.grow}>
          <Text numberOfLines={1} style={styles.eyebrow}>{t('refill.eyebrow')}</Text>
          <M2Heading level={1} style={styles.title}>{t('refill.title')}</M2Heading>
        </View>
        <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="m2-refill-sos" />
      </View>
      <Rise style={styles.gutter}>
        <Gradient colors={heroStops('teal')} angle={150} style={styles.hero} testID="m2-refill-hero">
          <Text style={styles.heroEyebrow}>{t('refill.heroEyebrow')}</Text>
          <Text style={styles.heroLine} aria-live="polite" testID="m2-refill-headline">{headline}</Text>
          <Text style={styles.heroNote}>{t('refill.heroNote')}</Text>
        </Gradient>
      </Rise>
      {!vm.online ? <View style={styles.gutter}><OfflineBanner message={t('refill.offline')} /></View> : null}
      <Rise index={1} style={styles.gutter}>{body}</Rise>
      {vm.status ? <Text aria-live="polite" accessibilityLiveRegion="polite" style={[styles.status, styles.gutter]} testID="m2-refill-status">{say(t, vm.status)}</Text> : null}
      <View style={[styles.lockNote, styles.gutter]} testID="m2-refill-lock-note">
        <Icon name="bell" size={16} color={color.text2} />
        <Text style={[m2Text.meta, styles.grow]}>{t('refill.lockNote')}</Text>
      </View>
      <View {...webAttrs({ 'aria-hidden': 'true' })} style={styles.spacer} />
      <SetupSheet vm={vm} />
      <RowSheet vm={vm} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  gutter: { paddingHorizontal: space.gutterPhone },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.text },
  hero: { borderRadius: radius.xl, padding: space.s20, gap: space.s8 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHero },
  heroLine: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroNote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  empty: { padding: space.s20, borderRadius: radius.xl, gap: space.s10, alignItems: 'flex-start' },
  listWrap: { gap: space.s12, alignItems: 'flex-start' },
  list: { alignSelf: 'stretch', paddingHorizontal: space.s16, borderRadius: radius.xl },
  row: { paddingVertical: space.s16, gap: space.s10, borderBottomWidth: 1, borderBottomColor: color.rule },
  rowFocus: { borderLeftWidth: 3, borderLeftColor: color.action, paddingLeft: space.s10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  daysPill: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.surface3 },
  daysSoon: { backgroundColor: color.attentionBg },
  daysText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  daysTextSoon: { color: color.attention },
  facts: { gap: space.s6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  status: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  lockNote: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  sheetBody: { gap: space.s12 },
  pick: { minHeight: size.touchTarget + space.s8, padding: space.s12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface2 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8, padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface3 },
  chipsBlock: { gap: space.s8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  // Amber, not red: red is for SOS, safety and clinical alerts only.
  error: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  spacer: { height: space.s8 },
});
