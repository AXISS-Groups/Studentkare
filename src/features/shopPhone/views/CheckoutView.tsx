import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, Note, Rise, Sheet, TextField } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { ChoiceRow, Tag, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { plural } from '@/features/phoneKit/plural';
import type { CartPort, PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import { ShopTopBar, cartMrp, cartTotal } from './shopParts';

type Pressed = { pressed: boolean; focused?: boolean };
type SheetName = 'address' | 'slot' | null;

function Line({ label, value, meta, tag, tone, onPress, testID }: {
  label: string; value: string; meta: string; tag: string; tone: 'action' | 'attention' | 'neutral'; onPress?: () => void; testID: string;
}) {
  const body = (
    <>
      <View style={phoneLayout.grow}>
        <Text style={styles.lineLabel}>{label}</Text>
        <Text style={[styles.lineValue, tone === 'attention' ? styles.lineNeeded : null]}>{value}</Text>
        <Text style={phoneText.meta}>{meta}</Text>
      </View>
      <Tag label={tag} tone={tone} />
      {onPress ? <Icon name="chevron-right" size={18} color={color.text3} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.line} testID={testID}>{body}</View>;
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${label}: ${value}. ${meta}`} onPress={onPress} testID={testID}
      style={({ focused }: Pressed) => [styles.line, focused ? focusRing : null]}>
      {body}
    </Pressable>
  );
}

/**
 * Checkout (canvas Checkout, SK-062): where it goes, when (for a consult or
 * vaccine), then pay. Each choice opens a sheet; the progress bar counts what
 * is chosen. "Pay" checks stock and serviceability with the server first and
 * stops if that check cannot run (fail closed); the order is then placed with
 * an idempotency key and the shared Pay step takes over.
 *
 * Left out from the board: hostel rooms and delivery slots with times (the
 * order takes a pickup or an address, and the provider confirms the time),
 * and Kare points as a way to pay (points carry no cash value).
 */
export const CheckoutView = observer(function CheckoutView({ vm, cart }: { vm: PhoneShopViewModel; cart: CartPort }) {
  const t = useT();
  const [sheet, setSheet] = useState<SheetName>(null);
  const needsSlot = vm.needsSlot(cart);
  const steps = needsSlot ? 2 : 1;
  const done = (vm.addressReady ? 1 : 0) + (needsSlot && vm.slotReady(cart) ? 1 : 0);
  const total = cartTotal(cart);
  const saved = cartMrp(cart) - total;
  const d = vm.delivery;
  const where = d.mode === 'pickup' ? t('cart.pickup') : d.address.trim() || t('phone.checkout.addAddress');
  const whereMeta = [d.city, d.pincode].filter(Boolean).join(' · ') || t('phone.checkout.cityNeeded');

  return (
    <View style={phoneLayout.screen} testID="checkout">
      <ShopTopBar title={t('phone.checkout.title')} onBack={() => vm.back()}
        trailing={<Text style={phoneText.meta} role="status">{t('phone.checkout.chosen', { done, total: steps })}</Text>} />
      <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: steps }, (_, i) => <View key={i} style={[styles.seg, i < done ? styles.segOn : null]} />)}
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        <Rise>
          <Line label={t('phone.checkout.deliverTo')} value={where} meta={whereMeta} testID="checkout-address"
            tag={vm.addressReady ? t('phone.checkout.change') : t('phone.checkout.needed')} tone={vm.addressReady ? 'action' : 'attention'}
            onPress={() => setSheet('address')} />
        </Rise>
        {needsSlot ? (
          <Rise index={1}>
            <Line label={t('phone.checkout.when')} testID="checkout-slot"
              value={vm.slotReady(cart) ? `${vm.slotDate} ${vm.slotTime}` : t('phone.checkout.pickTime')} meta={t('phone.checkout.whenMeta')}
              tag={vm.slotReady(cart) ? t('phone.checkout.change') : t('phone.checkout.needed')} tone={vm.slotReady(cart) ? 'action' : 'attention'}
              onPress={() => setSheet('slot')} />
          </Rise>
        ) : null}
        <Rise index={2}>
          <Line label={t('phone.checkout.payWith')} value={t('phone.checkout.payNext')} meta={t('phone.checkout.payNextMeta')}
            tag={t('phone.checkout.next')} tone="neutral" testID="checkout-pay-with" />
        </Rise>

        <View style={styles.items}>
          <Text style={styles.lineLabel}>{plural(t, cart.lines.length, 'phone.checkout.itemCountOne', 'phone.checkout.itemCount')}</Text>
          {cart.lines.map((l) => (
            <View key={l.item.id} style={styles.itemRow}>
              <Text style={[phoneText.body, phoneLayout.grow]}>{l.quantity > 1 ? t('phone.checkout.itemQty', { name: l.item.name, count: l.quantity }) : l.item.name}</Text>
              <Text style={styles.itemPrice}>{money(l.item.pricePaise * l.quantity)}</Text>
            </View>
          ))}
          {saved > 0 ? (
            <View style={styles.itemRow}><Text style={[phoneText.body, phoneLayout.grow]}>{t('phone.cart.saved')}</Text><Text style={[styles.itemPrice, styles.good]}>{t('phone.cart.minus', { amount: money(saved) })}</Text></View>
          ) : null}
          <View style={[styles.itemRow, styles.totalRow]}><Text style={[phoneText.title, phoneLayout.grow]}>{t('phone.cart.total')}</Text><Text style={styles.total}>{money(total)}</Text></View>
        </View>

        {vm.checkoutError ? (
          <Note tone="danger" testID="checkout-error">{vm.checkoutErrorText ? `${t(vm.checkoutError)} ${vm.checkoutErrorText}` : t(vm.checkoutError)}</Note>
        ) : null}
        <Text style={phoneText.meta}>{t('pay.formNote')}</Text>
      </ScrollView>
      <View style={styles.cta}>
        <Button label={t('phone.checkout.pay', { total: money(total) })} size="cta" fullWidth busy={vm.placing}
          disabled={cart.lines.length === 0} onPress={() => void vm.placeOrder(cart)} testID="checkout-pay" />
      </View>

      <Sheet visible={sheet === 'address'} title={t('phone.checkout.whereTitle')} subtitle={t('phone.checkout.whereSub')} onClose={() => setSheet(null)} testID="checkout-address-sheet">
        <View style={styles.sheetBody}>
          <View role="radiogroup" accessibilityLabel={t('cart.howGet')} style={styles.sheetBody}>
            <ChoiceRow label={t('cart.pickup')} meta={t('phone.checkout.pickupMeta')} selected={d.mode === 'pickup'} onPress={() => vm.setDelivery({ mode: 'pickup' })} testID="mode-pickup" />
            <ChoiceRow label={t('cart.delivery')} meta={t('phone.checkout.deliveryMeta')} selected={d.mode === 'delivery'} onPress={() => vm.setDelivery({ mode: 'delivery' })} testID="mode-delivery" />
          </View>
          {d.mode === 'delivery' ? (
            <TextField label={t('cart.address')} hint={t('cart.addressHint')} value={d.address} onChangeText={(v) => vm.setDelivery({ address: v })} maxLength={300} />
          ) : null}
          <TextField label={t('cart.city')} value={d.city} onChangeText={(v) => vm.setDelivery({ city: v })} maxLength={100} />
          <TextField label={t('cart.pincode')} value={d.pincode} onChangeText={(v) => vm.setDelivery({ pincode: v.replace(/\D/g, '') })} keyboardType="numeric" maxLength={6} mono />
          <Button label={t('phone.checkout.useAddress')} size="cta" fullWidth disabled={!vm.addressReady} onPress={() => setSheet(null)} testID="address-confirm" />
          <Text style={phoneText.meta}>{t('phone.checkout.whereNote')}</Text>
        </View>
      </Sheet>

      <Sheet visible={sheet === 'slot'} title={t('phone.checkout.whenTitle')} subtitle={t('phone.checkout.whenSub')} onClose={() => setSheet(null)} testID="checkout-slot-sheet">
        <View style={styles.sheetBody}>
          <TextField label={t('phone.checkout.date')} mono value={vm.slotDate} onChangeText={(v) => vm.setSlot(v.trim(), vm.slotTime)} maxLength={10} />
          <TextField label={t('phone.checkout.time')} mono value={vm.slotTime} onChangeText={(v) => vm.setSlot(vm.slotDate, v.trim())} maxLength={5} />
          {vm.slotDate && vm.slotTime && !vm.slotReady(cart) ? <Text style={styles.warn} role="alert">{t('phone.checkout.badTime')}</Text> : null}
          <Button label={t('phone.checkout.confirmTime')} size="cta" fullWidth disabled={!vm.slotReady(cart)} onPress={() => setSheet(null)} testID="slot-confirm" />
          <Text style={phoneText.meta}>{t('phone.checkout.whenNote')}</Text>
        </View>
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: space.s8, paddingHorizontal: space.gutterPhone, paddingBottom: space.s8 },
  seg: { flex: 1, height: 5, borderRadius: radius.full, backgroundColor: color.surface3 },
  segOn: { backgroundColor: color.action },
  line: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s14, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  lineLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
  lineValue: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s2 },
  lineNeeded: { color: color.attention },
  items: { gap: space.s8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  itemPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  good: { color: color.positive },
  totalRow: { paddingTop: space.s8, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  total: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cta: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, backgroundColor: color.canvas },
  sheetBody: { gap: space.s10 },
  warn: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.danger },
});
