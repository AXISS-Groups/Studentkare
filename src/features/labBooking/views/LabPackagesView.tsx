import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLanguage, useT } from '@/i18n';
import {
  Button, ErrorState, Eyebrow, Note, RadioGroup, Rise, Sheet, Skeleton, StateScreen, TextField, useOnline,
} from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { AddressKind, LabPackage, LabSlot } from '../data/LabBookingRepository';
import type { LabBookingViewModel } from '../viewmodel/LabBookingViewModel';
import { packageMeta, slotLabel } from './labFormat';

function PackageRow({ item, onBook }: { item: LabPackage; onBook: () => void }) {
  const t = useT();
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const price = money(item.pricePaise);
  return (
    <View style={styles.row} testID={`lab-package-${item.id}`}>
      <View style={styles.rowText}>
        <View style={styles.nameLine}>
          <Text style={styles.name}>{item.name}</Text>
          {item.fastingHours > 0 ? (
            <View style={styles.tag}><Text style={styles.tagText}>{t('labbook.fasting').toUpperCase()}</Text></View>
          ) : null}
        </View>
        <Text style={styles.meta}>{packageMeta(t, item.includes, item.reportHours)}</Text>
        <View style={styles.priceLine}>
          <Text style={styles.price}>{price}</Text>
          {item.mrpPaise > item.pricePaise ? <Text style={styles.mrp}>{money(item.mrpPaise)}</Text> : null}
          {off > 0 ? <Text style={styles.save}>{t('labbook.off', { percent: off })}</Text> : null}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('labbook.bookSpoken', { name: item.name, price })}
        onPress={onBook}
        style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.book, focused ? focusRing : null]}
      >
        <Text style={styles.bookText}>{t('labbook.book')}</Text>
      </Pressable>
    </View>
  );
}

function SlotOption({ slot, meta, selected, disabled, onPress }: {
  slot: LabSlot; meta: string; selected: boolean; disabled: boolean; onPress: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const label = slotLabel(t, lang, slot.slotStart, slot.slotEnd);
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityRole="radio"
      accessibilityLabel={`${label}. ${meta}`}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={`lab-slot-${slot.id}`}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [
        styles.slot, selected ? styles.slotOn : null, focused ? focusRing : null,
      ]}
    >
      <View style={[styles.mark, selected ? styles.markOn : null]} />
      <View style={styles.slotText}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotMeta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

const BookingSheet = observer(function BookingSheet({ vm }: { vm: LabBookingViewModel }) {
  const t = useT();
  const pkg = vm.selected;
  if (!pkg) return null;
  const a = vm.address;
  const price = money(pkg.pricePaise);
  const where = a.kind === 'HOSTEL'
    ? (a.hostelBlock.trim() ? t('labbook.sheet.metaHostel', { block: a.hostelBlock.trim(), room: a.room.trim() || '…' })
      : t('labbook.sheet.metaHostelEmpty'))
    : t('labbook.sheet.metaHome');
  const kinds: { value: AddressKind; label: string }[] = [
    { value: 'HOSTEL', label: t('labbook.sheet.hostel') },
    { value: 'HOME', label: t('labbook.sheet.home') },
  ];
  const addressError = vm.showAddressErrors && !vm.addressValid
    ? t(a.kind === 'HOSTEL' ? 'labbook.sheet.needHostel' : 'labbook.sheet.needHome') : undefined;
  return (
    <Sheet visible={vm.sheetOpen} title={t('labbook.sheet.title')} onClose={vm.close} busy={vm.booking} testID="lab-sheet">
      <Text style={styles.sheetSub}>{t('labbook.sheet.sub', { name: pkg.name, price })}</Text>

      {pkg.fastingHours > 0 ? (
        <View style={styles.fasting} testID="lab-fasting-note">
          <Icon name="alert-circle-2" size={18} color={color.attention} />
          <Text style={styles.fastingText}>{t('labbook.sheet.fasting', { hours: pkg.fastingHours })}</Text>
        </View>
      ) : null}

      {vm.slotPhase === 'loading' ? <Skeleton label={t('labbook.sheet.slotsLoading')} lines={['100%', '100%', '100%']} /> : null}
      {vm.slotPhase === 'error' ? (
        <ErrorState title={t('labbook.sheet.slots')} body={t('labbook.sheet.slotsError')} retryLabel={t('labbook.retry')}
          onRetry={() => void vm.loadSlots()} />
      ) : null}
      {vm.slotPhase === 'ready' && vm.slots.length === 0 ? (
        <Note tone="info" testID="lab-no-slots">{t('labbook.sheet.noSlots')}</Note>
      ) : null}
      {vm.slotPhase === 'ready' && vm.slots.length > 0 ? (
        <View role="radiogroup" accessibilityLabel={t('labbook.sheet.slots')} style={styles.group}>
          {vm.slots.map(slot => (
            <SlotOption key={slot.id} slot={slot} meta={where} selected={vm.slotId === slot.id} disabled={vm.booking}
              onPress={() => vm.chooseSlot(slot.id)} />
          ))}
        </View>
      ) : null}

      <Eyebrow>{t('labbook.sheet.where')}</Eyebrow>
      <RadioGroup<AddressKind> label={t('labbook.sheet.where')} options={kinds} value={a.kind} onChange={vm.setAddressKind} />
      {a.kind === 'HOSTEL' ? (
        <View style={styles.fields}>
          <TextField label={t('labbook.sheet.block')} value={a.hostelBlock} maxLength={80} disabled={vm.booking}
            onChangeText={v => vm.setAddress('hostelBlock', v)} error={addressError} testID="lab-block" />
          <TextField label={t('labbook.sheet.room')} value={a.room} maxLength={40} disabled={vm.booking}
            onChangeText={v => vm.setAddress('room', v)} testID="lab-room" />
        </View>
      ) : (
        <View style={styles.fields}>
          <TextField label={t('labbook.sheet.line')} value={a.line} maxLength={300} disabled={vm.booking}
            onChangeText={v => vm.setAddress('line', v)} error={addressError} testID="lab-line" />
          <TextField label={t('labbook.sheet.city')} value={a.city} maxLength={100} disabled={vm.booking}
            onChangeText={v => vm.setAddress('city', v)} testID="lab-city" />
          <TextField label={t('labbook.sheet.pincode')} value={a.pincode} maxLength={6} keyboardType="numeric"
            disabled={vm.booking} onChangeText={v => vm.setAddress('pincode', v)} testID="lab-pincode" />
          <TextField label={t('labbook.sheet.landmark')} value={a.landmark} maxLength={120} disabled={vm.booking}
            onChangeText={v => vm.setAddress('landmark', v)} />
        </View>
      )}

      {vm.error ? <Note tone="danger" testID="lab-book-error">{t(vm.error)}</Note> : null}
      {vm.errorText ? <Note tone="danger" testID="lab-book-error">{vm.errorText}</Note> : null}

      <Button
        label={t('labbook.sheet.confirm', { price })}
        accessibilityLabel={vm.booking ? t('labbook.sheet.booking') : undefined}
        onPress={() => void vm.confirm()}
        disabled={!vm.selectedSlot}
        busy={vm.booking}
        size="cta"
        fullWidth
        testID="lab-confirm"
      />
      <Text style={styles.fine}>{t(a.kind === 'HOSTEL' ? 'labbook.sheet.fineHostel' : 'labbook.sheet.fineHome')}</Text>
    </Sheet>
  );
});

/**
 * Shop — Lab packages (canvas page 2 "LabPackages", SK-036, Tier 2).
 *
 * The bookable tests with their price before anything is committed, then the
 * slot sheet. Differences from the canvas, on purpose: the "NABL accredited
 * labs only" line is not drawn (a fixed compliance claim; AGENTS.md guardrail
 * 6) — a lab's own accreditation shows on the booking when it has one; and the
 * sheet asks where to collect (hostel room or another address), which the
 * canvas assumed was always the student's block.
 */
export const LabPackagesView = observer(function LabPackagesView({ viewModel: vm, onBack, onReports }: {
  viewModel: LabBookingViewModel;
  onBack: () => void;
  onReports: () => void;
}) {
  const t = useT();
  const online = useOnline();
  return (
    <View style={styles.screen} testID="lab-packages">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('labbook.back')}
            onPress={onBack}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.back, focused ? focusRing : null]}
          >
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('labbook.title')}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={onReports}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.reports, focused ? focusRing : null]}
          >
            <Text style={styles.reportsText}>{t('labbook.myReports')}</Text>
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Eyebrow>{t('labbook.eyebrow')}</Eyebrow>
          <Text accessibilityRole="header" style={styles.heading}>{t('labbook.heading')}</Text>
          <Text style={styles.introText}>{t('labbook.intro')}</Text>
        </View>

        {/* Full-screen states (canvas StateScreens): each names what happened and gives a way forward. */}
        {vm.phase === 'loading' ? (
          <StateScreen kind="loading" label={t('labbook.loading')} lines={['90%', '70%', '90%', '70%']} testID="lab-state-loading" />
        ) : null}
        {vm.phase === 'error' && !online ? (
          <StateScreen kind="offline" testID="lab-state-offline" chip={t('labbook.state.offline')} title={t('labbook.offlineTitle')}
            body={t('labbook.offlineBody')} primary={{ label: t('labbook.retryNow'), onPress: () => void vm.load() }}
            secondary={{ label: t('labbook.back'), onPress: onBack }} />
        ) : null}
        {vm.phase === 'error' && online ? (
          <StateScreen kind="failure" testID="lab-state-error" chip={t('labbook.state.failed')} title={t('labbook.errorTitle')}
            body={t('labbook.errorBody')} primary={{ label: t('labbook.retry'), onPress: () => void vm.load() }}
            secondary={{ label: t('labbook.back'), onPress: onBack }} />
        ) : null}
        {vm.phase === 'ready' && vm.packages.length === 0 ? (
          <StateScreen kind="empty" testID="lab-state-empty" chip={t('labbook.state.empty')} title={t('labbook.emptyTitle')}
            body={t('labbook.emptyBody')} primary={{ label: t('labbook.back'), onPress: onBack }}
            secondary={{ label: t('labbook.myReports'), onPress: onReports }} />
        ) : null}
        {vm.phase === 'ready' && vm.packages.length > 0 ? (
          <Rise>
            <View role="list" style={styles.list}>
              {vm.packages.map(item => <PackageRow key={item.id} item={item} onBook={() => vm.open(item)} />)}
            </View>
          </Rise>
        ) : null}
        {vm.error && !vm.selected ? <Note tone="info">{t(vm.error)}</Note> : null}

        <Text style={styles.footnote}>{t('labbook.footnote')}</Text>
      </ScrollView>
      <BookingSheet vm={vm} />
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  back: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, marginLeft: -space.s8 },
  headerTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  reports: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s4 },
  reportsText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  intro: { gap: space.s8 },
  heading: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  introText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, color: color.text2 },
  list: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s14, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  rowText: { flex: 1, gap: space.s4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s8 },
  name: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  tag: { paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.attentionBg },
  tagText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.attention },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.s6 },
  price: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  mrp: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textDecorationLine: 'line-through' },
  save: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  book: {
    minHeight: size.touchTarget, minWidth: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.full,
    backgroundColor: color.action, alignItems: 'center', justifyContent: 'center',
  },
  bookText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  footnote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, color: color.text3 },
  sheetSub: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  fasting: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, padding: space.s12, borderRadius: radius.md, backgroundColor: color.attentionBg },
  fastingText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  group: { gap: space.s10 },
  slot: {
    minHeight: size.controlLg, flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14,
    borderRadius: radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface,
  },
  slotOn: { borderWidth: 2, borderColor: color.action },
  mark: { width: 18, height: 18, borderRadius: radius.full, borderWidth: 2, borderColor: color.ruleStrong },
  markOn: { borderWidth: 6, borderColor: color.action },
  slotText: { flex: 1, gap: space.s2 },
  slotLabel: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  slotMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  fields: { gap: space.s10 },
  fine: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, color: color.text3 },
});
