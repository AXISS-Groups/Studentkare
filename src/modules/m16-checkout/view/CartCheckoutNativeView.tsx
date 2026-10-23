import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, Eyebrow, Note, RadioGroup, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { useCheckoutViewModel } from '../viewmodel/useCheckoutViewModel';
import type { DeliveryMode } from '../domain/Checkout';
import { useT } from '@/i18n';


/**
 * Cart and order request (design page 2: Cart, Checkout, OrderSuccess).
 * The total is what the server charges; no payment is taken here, and a sent
 * order is a request until the provider accepts it.
 */
export const CartCheckoutNativeView = observer(function CartCheckoutNativeView() {
  const { state, actions } = useCheckoutViewModel();
  const t = useT();
  const modes: { value: DeliveryMode; label: string }[] = [
    { value: 'pickup', label: t('cart.pickup') },
    { value: 'delivery', label: t('cart.delivery') },
  ];

  if (state.completedOrder) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Eyebrow>{t('cart.sentEyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>{t('cart.sentTitle')}</Text>
        <Note tone="info" title={t('cart.waitingTitle')}>
          {t('cart.waitingBody', { id: state.completedOrder.id, total: money(state.completedOrder.totalPaise) })}
        </Note>
        <Button label={t('common.done')} variant="secondary" fullWidth onPress={actions.reset} />
      </ScrollView>
    );
  }

  if (state.cartItems.length === 0) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{t('cart.title')}</Text>
        <EmptyState title={t('cart.emptyTitle')} body={t('cart.emptyBody')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>{t('cart.title')}</Text>

      {state.cartItems.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.meta}>{item.brand}</Text>
              <Text style={styles.price}>{money(item.pricePaise * item.quantity)}</Text>
            </View>
            <View style={styles.quantity}>
              <Button label="−" variant="secondary" accessibilityLabel={item.quantity === 1 ? t('cart.remove', { name: item.name }) : t('cart.decrease', { name: item.name })} onPress={() => actions.updateQuantity(item.id, item.quantity - 1)} />
              <Text style={styles.quantityValue} accessibilityLabel={t('cart.inCart', { count: item.quantity })}>{item.quantity}</Text>
              <Button label="+" variant="secondary" accessibilityLabel={t('cart.increase', { name: item.name })} disabled={item.quantity >= Math.min(item.stock, 10)} onPress={() => actions.updateQuantity(item.id, item.quantity + 1)} />
            </View>
          </View>
        </Card>
      ))}

      <Card>
        <RadioGroup<DeliveryMode> label={t('cart.howGet')} options={modes} value={state.deliveryMode} onChange={actions.setDeliveryMode} />
        {state.deliveryMode === 'delivery' ? (
          <TextField label={t('cart.address')} value={state.address} onChangeText={actions.setAddress} hint={t('cart.addressHint')} />
        ) : null}
        <TextField label={t('cart.city')} value={state.city} onChangeText={actions.setCity} />
        <TextField label={t('cart.pincode')} value={state.pincode} onChangeText={actions.setPincode} mono />
        {state.needsSlot ? (
          <TextField label={t('cart.when')} value={state.slotDateTime} onChangeText={actions.setSlotDateTime} hint={t('cart.whenHint')} mono />
        ) : null}
      </Card>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('cart.itemsTotal')}</Text>
        <Text style={styles.total}>{money(state.totalPaise)}</Text>
      </View>
      <Text style={styles.meta}>{t('cart.paymentNote')}</Text>

      {state.error ? <Note tone="danger">{state.error}</Note> : null}

      <Button
        label={t('cart.send')}
        size="cta"
        fullWidth
        busy={state.submitting}
        disabled={!state.canSubmit && !state.submitting}
        onPress={() => void actions.submitOrder()}
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  itemInfo: { flex: 1, gap: space.s4 },
  itemTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  price: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.text },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  quantityValue: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.text, minWidth: 24, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2 },
  total: { fontFamily: font.family.mono, fontSize: font.size.title, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
