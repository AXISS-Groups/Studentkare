import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Rise, Skeleton, TextField } from '@/design-system';
import { Icon, Illustration } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { displayDate, money } from '@/data/types/workflowTypes';
import { PayStepView } from '@/features/payments/views/PayStepView';
import type { CollectionAddress, CollectionMode } from '../data/LabBookingRepository';
import type { LabBookingViewModel } from '../viewmodel/LabBookingViewModel';

const MODE_LABEL: Record<CollectionMode, MessageKey> = {
  HOSTEL: 'care.labBook.mode.hostel',
  HOME: 'care.labBook.mode.home',
  WALK_IN: 'care.labBook.mode.walkIn',
};

function placeText(t: ReturnType<typeof useT>, mode: CollectionMode, address: CollectionAddress): string {
  if (address && 'hostelBlock' in address) return t('care.labBook.place.hostel', { block: address.hostelBlock, room: address.room });
  if (address && 'line1' in address) return [address.line1, address.line2, address.pincode].filter(Boolean).join(', ');
  return t(mode === 'WALK_IN' ? 'care.labBook.place.walkIn' : MODE_LABEL[mode]);
}

/**
 * Shop, book a lab test (canvas LabPackages "Pick a pickup slot" sheet, SK-036, Tier 2),
 * then the order Pay step (Payment, SK-063), ending on the booked state.
 *
 * Shows the shop's price before commitment and the server's amount on the Pay
 * step. Never shows a result or any clinical value. The canvas ResultLabBooked
 * actions (copy & share, receipt, add to calendar) are not drawn: nothing
 * behind them exists yet, and a button that does nothing would be a fake.
 */
export const LabBookingSheet = observer(function LabBookingSheet({ viewModel: vm, studentName, onClose, onViewBooking, onOrders }: {
  viewModel: LabBookingViewModel;
  /** The signed-in student, for the booked summary ("From"). */
  studentName: string;
  onClose: () => void;
  onViewBooking: () => void;
  onOrders: () => void;
}) {
  const t = useT();
  const price = vm.test.pricePaise > 0 ? money(vm.test.pricePaise) : '';

  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);

  if (vm.phase === 'pay' && vm.payment) {
    // Back leaves the booking unpaid: its time stays held until the payment is due, then is released.
    return <PayStepView viewModel={vm.payment} onBack={onClose} backLabel={t('care.labBook.back')} onTrack={() => void vm.confirm()} onOrders={onOrders} />;
  }

  const errors = vm.showErrors ? vm.fieldErrors : {};
  const fieldError = (field: keyof typeof errors) => (errors[field] ? t(errors[field] as MessageKey) : undefined);

  return (
    <View style={styles.screen} testID="lab-booking">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('care.labBook.back')}
          onPress={onClose}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.back, focused ? focusRing : null]}
        >
          <Icon name="arrow-left" size={18} color={color.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>{t('care.labBook.title')}</Text>
          <Text style={styles.subtitle}>{price ? t('care.labBook.subtitle', { test: vm.test.name, price }) : vm.test.name}</Text>
        </View>
      </View>

      {vm.phase === 'loading' ? <Skeleton label={t('care.labBook.loading')} lines={['60%', '100%', '100%', '100%', '40%']} /> : null}

      {vm.phase === 'loadError' ? (
        <ErrorState title={t('care.labBook.loadError.title')} body={t('care.labBook.loadError.body')}
          retryLabel={t('care.labBook.retry')} onRetry={() => void vm.load()} />
      ) : null}

      {vm.phase === 'unbookable' ? (
        <EmptyState title={t('care.labBook.empty.title')} body={t('care.labBook.empty.body')}
          action={{ label: t('care.labBook.empty.action'), onPress: () => void vm.load() }} />
      ) : null}

      {vm.phase === 'form' || vm.phase === 'booking' ? (
        <Rise>
          {vm.test.preparation ? (
            <View style={styles.prep} testID="lab-booking-prep">
              <Icon name="alert-circle-2" size={18} color={color.attention} />
              <Text style={styles.prepText}>{vm.test.preparation}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Eyebrow>{t('care.labBook.slots')}</Eyebrow>
            <RadioGroup
              label={t('care.labBook.slots')}
              value={vm.slotId || null}
              onChange={vm.setSlot}
              options={vm.slots.map(slot => ({
                value: slot.id,
                label: t('care.labBook.slotOption', { start: displayDate(slot.slotStart), end: displayDate(slot.slotEnd), count: slot.available }),
              }))}
            />
            {errors.slot ? <Text role="alert" style={styles.fieldError}>{t(errors.slot)}</Text> : null}
          </View>

          <View style={styles.section}>
            <Eyebrow>{t('care.labBook.where')}</Eyebrow>
            <RadioGroup<CollectionMode>
              label={t('care.labBook.where')}
              value={vm.mode}
              onChange={vm.setMode}
              options={vm.modes.map(mode => ({ value: mode, label: t(MODE_LABEL[mode]) }))}
            />
            {!vm.homeCollection ? <Text style={styles.fine}>{t('care.labBook.walkInOnly', { lab: vm.labName })}</Text> : null}
            {vm.mode === 'HOSTEL' ? (
              <View style={styles.fields}>
                <TextField label={t('care.labBook.field.block')} value={vm.address.hostelBlock} maxLength={80}
                  onChangeText={value => vm.setField('hostelBlock', value)} error={fieldError('hostelBlock')} testID="lab-booking-block" />
                <TextField label={t('care.labBook.field.room')} value={vm.address.hostelRoom} maxLength={40}
                  onChangeText={value => vm.setField('hostelRoom', value)} error={fieldError('hostelRoom')} testID="lab-booking-room" />
              </View>
            ) : null}
            {vm.mode === 'HOME' ? (
              <View style={styles.fields}>
                <TextField label={t('care.labBook.field.line1')} value={vm.address.addressLine1} maxLength={200}
                  onChangeText={value => vm.setField('addressLine1', value)} error={fieldError('addressLine1')} testID="lab-booking-line1" />
                <TextField label={t('care.labBook.field.line2')} value={vm.address.addressLine2} maxLength={200}
                  onChangeText={value => vm.setField('addressLine2', value)} testID="lab-booking-line2" />
                <TextField label={t('care.labBook.field.pincode')} value={vm.address.pincode} maxLength={6} keyboardType="numeric"
                  onChangeText={value => vm.setField('pincode', value)} error={fieldError('pincode')} testID="lab-booking-pincode" />
              </View>
            ) : null}
          </View>

          {vm.error ? (
            <Note tone="danger" testID="lab-booking-error">{'key' in vm.error ? t(vm.error.key) : vm.error.raw}</Note>
          ) : null}

          <View style={styles.cta}>
            <Button
              label={price ? t('care.labBook.cta', { price }) : t('care.labBook.ctaNoPrice')}
              onPress={() => void vm.submit()}
              busy={vm.phase === 'booking'}
              size="cta"
              fullWidth
              testID="lab-booking-cta"
            />
            <Text style={styles.fine}>{t('care.labBook.fine')}</Text>
          </View>
        </Rise>
      ) : null}

      {vm.phase === 'confirming' ? <Skeleton label={t('care.labBook.confirming')} lines={['50%', '100%', '80%']} /> : null}

      {vm.phase === 'confirmPending' ? (
        <View role="status" style={styles.outcome} testID="lab-booking-confirm-pending">
          <Illustration name="illustration-result-pending" size={112} />
          <Text accessibilityRole="header" style={styles.outcomeTitle}>{t('care.labBook.pending.title')}</Text>
          <Text style={styles.outcomeBody}>{t('care.labBook.pending.body', { ref: vm.reference })}</Text>
          <Button label={t('care.labBook.pending.check')} onPress={() => void vm.confirm()} fullWidth />
          <Button label={t('care.labBook.view')} onPress={onViewBooking} variant="ghost" fullWidth />
        </View>
      ) : null}

      {vm.phase === 'booked' && vm.booking ? (
        <View role="status" accessibilityLiveRegion="polite" style={styles.outcome} testID="lab-booking-booked">
          <Illustration name="illustration-result-success" size={112} />
          <Text accessibilityRole="header" style={styles.outcomeTitle}>{t('care.labBook.booked.title')}</Text>
          <Text style={styles.outcomeBody}>
            {t('care.labBook.booked.summary', { test: vm.booking.testPanel.join(', ') || vm.test.name, time: displayDate(vm.booking.slotStart) })}
          </Text>
          <Card>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>{t('care.labBook.booked.to')}</Text>
              <Text style={styles.detailValue}>{vm.booking.labName || vm.labName}</Text>
              <Text style={styles.mono}>{t('care.labBook.booked.ref', { ref: vm.reference })}</Text>
            </View>
            <View style={styles.rule} />
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>{t('care.labBook.booked.from')}</Text>
              {studentName ? <Text style={styles.detailValue}>{studentName}</Text> : null}
              <Text style={styles.detailMeta}>{placeText(t, vm.booking.collectionMode, vm.booking.collectionAddress)}</Text>
              {vm.payment?.payment ? (
                <Text style={styles.mono}>
                  {vm.payment.testMode
                    ? t('care.labBook.booked.paidTest', { amount: money(vm.payment.payment.amountPaise) })
                    : t('care.labBook.booked.paid', { amount: money(vm.payment.payment.amountPaise) })}
                </Text>
              ) : null}
            </View>
          </Card>
          <Button label={t('care.labBook.view')} onPress={onViewBooking} size="cta" fullWidth testID="lab-booking-view" />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { gap: space.s20, backgroundColor: color.canvas, paddingBottom: space.s16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  back: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, backgroundColor: color.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, gap: space.s4 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  subtitle: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2 },
  prep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, padding: space.s14, borderRadius: radius.lg,
    backgroundColor: color.attentionBg, marginBottom: space.s20,
  },
  prepText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, color: color.attention },
  section: { gap: space.s10, marginBottom: space.s20 },
  fields: { gap: space.s12, marginTop: space.s8 },
  fieldError: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.danger },
  cta: { gap: space.s10 },
  fine: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  outcome: { alignItems: 'center', gap: space.s12, paddingVertical: space.s16 },
  outcomeTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  outcomeBody: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, textAlign: 'center' },
  detail: { gap: space.s4, alignSelf: 'stretch' },
  detailLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  detailValue: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  detailMeta: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  mono: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text2 },
  rule: { height: 1, backgroundColor: color.rule, marginVertical: space.s12 },
});
