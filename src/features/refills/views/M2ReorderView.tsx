import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, OfflineBanner, Rise, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SoftIcon, SosButton, m2Text, useOwnPhoneChrome, webAttrs } from '@/design-system/m2';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { say, useT } from '@/i18n';
import { PayStepView } from '@/features/payments/views/PayStepView';
import { clockLabel, rupees } from '@/features/phoneboards/format';
import { PillButton } from '@/features/reminders/views/ReminderParts';
import type { QuoteLine } from '../data/refillsApi';
import type { ReorderViewModel } from '../viewmodel/ReorderViewModel';
import { dayText, isoDay } from '../viewmodel/refillMessages';

/**
 * One-tap reorder (M2Reorder; brief design/screens/briefs/M2Reorder.md). The
 * same items, quantities and delivery as the order, priced now by the server;
 * the student sees every price before paying, and a moved price is shown again
 * rather than charged. Prescription items go to a pharmacist (or upload /
 * consult); an item out of stock is never swapped for another.
 */
export interface M2ReorderLinks {
  back: () => void;
  sos: () => void;
  /** Send an in-date prescription to a pharmacist (the existing prescriptions page). */
  sendPrescription: () => void;
  uploadPrescription: () => void;
  consult: () => void;
  /** Ask a pharmacist (care chat / consult). */
  pharmacist: () => void;
  track: (orderId: string) => void;
  orders: () => void;
}

const LineCard = observer(function LineCard({ vm, line, links }: { vm: ReorderViewModel; line: QuoteLine; links: M2ReorderLinks }) {
  const t = useT();
  // The server sends no price for a prescription item (the pharmacy quotes it after its check).
  const priced = line.pricePaise !== null && line.state !== 'PRESCRIPTION';
  const stateText = line.state === 'LOW_STOCK' ? t('reorder.state.LOW_STOCK', { count: line.stock }) : t(`reorder.state.${line.state}`);
  const good = line.state === 'OK';
  const until = vm.validPrescriptionUntil;
  return (
    <View style={styles.line} testID={`m2-reorder-line-${line.itemId}`}>
      <View style={styles.lineTop}>
        <SoftIcon icon="pill-3" hue="teal" tile={44} iconSize={20} />
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{line.name}</Text>
          {line.pack ? <Text style={m2Text.meta}>{line.pack}</Text> : null}
          <Text style={m2Text.meta}>{t('reorder.qty', { count: line.quantity })}</Text>
        </View>
        {priced && line.pricePaise !== null ? (
          <View style={styles.priceCol}>
            <Text style={m2Text.price}>{rupees(line.pricePaise * line.quantity)}</Text>
            <Text style={m2Text.meta}>{t('reorder.each', { price: rupees(line.pricePaise) })}</Text>
            {line.mrpPaise && line.mrpPaise > line.pricePaise ? <Text style={styles.mrp}>{t('reorder.mrp', { price: rupees(line.mrpPaise) })}</Text> : null}
          </View>
        ) : null}
      </View>
      <View style={[styles.statePill, good ? styles.stateGood : styles.stateAttention]}>
        <Icon name={good ? 'check' : 'alert-triangle'} size={14} color={good ? color.positive : color.attention} />
        <Text style={[styles.stateText, { color: good ? color.positive : color.attention }]}>{stateText}</Text>
      </View>

      {line.state === 'PRESCRIPTION' ? (
        <View style={styles.block} testID={`m2-reorder-rx-${line.itemId}`}>
          {vm.rx.phase === 'loading' ? <Text style={m2Text.body}>{t('reorder.rx.checking')}</Text>
            : vm.rx.phase === 'error' ? (
              <>
                <Text role="alert" style={styles.warn}>{t('reorder.rx.failed')}</Text>
                <PillButton icons={['refresh']} label={t('common.tryAgain')} spoken={t('common.tryAgain')} tone="soft" onPress={() => void vm.rx.load()} testID="m2-reorder-rx-retry" />
              </>
            ) : until ? (
              <>
                <Text style={m2Text.body}>{t('reorder.rx.valid', { date: dayText(isoDay(until)) })}</Text>
                <PillButton icons={['doc']} label={t('reorder.rx.send')} spoken={t('reorder.rx.send')} onPress={links.sendPrescription} testID="m2-reorder-rx-send" />
              </>
            ) : (
              <>
                <Text style={m2Text.body}>{t('reorder.rx.none')}</Text>
                <View style={styles.actions}>
                  <PillButton icons={['doc-upload']} label={t('reorder.rx.upload')} spoken={t('reorder.rx.upload')} onPress={links.uploadPrescription} testID="m2-reorder-rx-upload" />
                  <PillButton icons={['stethoscope']} label={t('reorder.rx.consult')} spoken={t('reorder.rx.consult')} tone="soft" onPress={links.consult} testID="m2-reorder-rx-consult" />
                </View>
              </>
            )}
        </View>
      ) : null}

      {line.state === 'OUT_OF_STOCK' || line.state === 'LOW_STOCK' ? (
        <View style={styles.block} testID={`m2-reorder-oos-${line.itemId}`}>
          <Text style={m2Text.body}>{line.state === 'OUT_OF_STOCK' ? t('reorder.oos.body') : t('reorder.low.body')}</Text>
          {line.stockAlert ? <Text style={m2Text.meta} aria-live="polite">{t('reorder.oos.watching')}</Text> : null}
          <View style={styles.actions}>
            <PillButton icons={[line.stockAlert ? 'bell-off' : 'bell']} label={line.stockAlert ? t('reorder.oos.stop') : t('reorder.oos.notify')}
              spoken={line.stockAlert ? t('reorder.oos.stop') : t('reorder.oos.notify')} busy={vm.watchBusy === line.itemId}
              disabled={!vm.online || vm.watchBusy !== null} onPress={() => void vm.toggleWatch(line)} testID={`m2-reorder-watch-${line.itemId}`} />
            <PillButton icons={['message-circle-2']} label={t('reorder.oos.pharmacist')} spoken={t('reorder.oos.pharmacist')} tone="soft"
              onPress={links.pharmacist} testID={`m2-reorder-pharmacist-${line.itemId}`} />
          </View>
        </View>
      ) : null}
    </View>
  );
});

export const M2ReorderView = observer(function M2ReorderView({ vm, links }: { vm: ReorderViewModel; links: M2ReorderLinks }) {
  const t = useT();
  useOwnPhoneChrome();
  const payment = vm.payment;
  if (vm.phase === 'pay' && payment) {
    return <PayStepView viewModel={payment} onBack={vm.backToReview} onTrack={() => links.track(payment.orderId)} onOrders={links.orders} />;
  }
  const quote = vm.quote.data;
  const total = rupees(vm.totalPaise);
  const delivery = quote?.delivery;
  let body: React.ReactNode;
  if (vm.quote.phase === 'error') {
    body = <ErrorState title={t('reorder.failedTitle')} body={t('refill.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.refresh()} />;
  } else if (!quote) {
    body = <Skeleton label={t('reorder.loading')} lines={['70%', '100%', '100%']} />;
  } else {
    const partial = vm.buyable.length > 0 && vm.buyable.length < vm.lines.length;
    body = (
      <View style={styles.stack}>
        <View style={styles.note} testID="m2-reorder-price-note">
          <Icon name="clock" size={16} color={color.info} />
          <Text style={[m2Text.body, styles.grow]}>{t('reorder.priceNote', { time: clockLabel(quote.quotedAt) })}</Text>
        </View>
        {vm.notice ? <Text role="status" aria-live="polite" style={styles.warn} testID="m2-reorder-notice">{say(t, vm.notice)}</Text> : null}
        <M2Card style={styles.card} testID="m2-reorder-lines">
          {vm.lines.map((line) => <LineCard key={line.itemId} vm={vm} line={line} links={links} />)}
        </M2Card>
        {delivery ? (
          <M2Card style={styles.card} testID="m2-reorder-delivery">
            <View style={styles.fact}>
              <Icon name="map-pin" size={18} color={color.text2} />
              <View style={styles.grow}>
                <Text style={m2Text.eyebrow}>{delivery.mode === 'pickup' ? t('reorder.pickupAt') : t('reorder.deliverTo')}</Text>
                <Text style={m2Text.body}>{delivery.mode === 'pickup' ? t('reorder.pickupPlace', { city: delivery.city, pincode: delivery.pincode })
                  : t('reorder.address', { address: delivery.address, city: delivery.city, pincode: delivery.pincode })}</Text>
              </View>
            </View>
            <View style={styles.fact}>
              <Icon name="credit-card" size={18} color={color.text2} />
              <View style={styles.grow}>
                <Text style={m2Text.eyebrow}>{t('reorder.payWith')}</Text>
                {vm.method ? <Text style={m2Text.cardTitle}>{t(`reorder.method.${vm.method}`)}</Text> : null}
                <Text style={m2Text.meta}>{vm.method ? t('reorder.methodLast') : t('reorder.methodNone')}</Text>
              </View>
            </View>
          </M2Card>
        ) : null}
        <M2Card style={styles.card} testID="m2-reorder-total">
          <View style={styles.totalRow}>
            <Icon name="shopping-bag" size={18} color={color.text2} />
            <Text style={[m2Text.section, styles.grow]}>{t('reorder.total')}</Text>
            <Text style={m2Text.price} testID="m2-reorder-total-amount">{total}</Text>
          </View>
          {partial ? <Text style={m2Text.meta}>{t('reorder.partReady')}</Text> : null}
          {vm.buyable.length === 0 ? <Text style={m2Text.meta} testID="m2-reorder-not-ready">{t('reorder.notReady')}</Text> : null}
          {vm.error ? <Text role="alert" style={styles.warn} testID="m2-reorder-error">{say(t, vm.error)}</Text> : null}
          <Button label={t('reorder.pay', { total })} accessibilityLabel={t('reorder.paySpoken', { total })} size="cta" fullWidth
            busy={vm.phase === 'placing'} disabled={!vm.canPay} onPress={() => void vm.place()} testID="m2-reorder-pay" />
          <View style={styles.fact}>
            <Icon name="lock" size={14} color={color.text3} />
            <Text style={[m2Text.meta, styles.grow]}>{t('reorder.newPackNote')}</Text>
          </View>
        </M2Card>
      </View>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-reorder">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label={t('reorder.back')} onPress={links.back} testID="m2-reorder-back" />
        <View style={styles.grow}>
          <Text numberOfLines={1} style={styles.eyebrow}>{t('reorder.eyebrow')}</Text>
          <M2Heading level={1} style={styles.title}>{t('reorder.title')}</M2Heading>
        </View>
        <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="m2-reorder-sos" />
      </View>
      {!vm.online ? <View style={styles.gutter}><OfflineBanner message={t('refill.offline')} /></View> : null}
      <Rise style={styles.gutter}>{body}</Rise>
      <View {...webAttrs({ 'aria-hidden': 'true' })} style={styles.spacer} />
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
  stack: { gap: space.s12 },
  card: { padding: space.s16, borderRadius: radius.xl, gap: space.s12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8, padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface3 },
  line: { gap: space.s10, paddingBottom: space.s12, borderBottomWidth: 1, borderBottomColor: color.rule },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  priceCol: { alignItems: 'flex-end', gap: space.s2 },
  mrp: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textDecorationLine: 'line-through' },
  statePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  stateGood: { backgroundColor: color.positiveBg },
  stateAttention: { backgroundColor: color.attentionBg },
  stateText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  block: { gap: space.s8, padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  // Amber, not red: red is for SOS, safety and clinical alerts only.
  warn: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  spacer: { height: space.s8 },
});
