import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, EmptyState, Rise, Sheet } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { FirewallNote, Tag, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { plural } from '@/features/phoneKit/plural';
import type { CartPort, PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import { ShopTopBar, cartMrp, cartTotal } from './shopParts';

type Pressed = { pressed: boolean; focused?: boolean };

const KIND: Record<LiveCatalogItem['kind'], MessageKey> = {
  product: 'phone.cart.kind.product', lab: 'phone.search.kind.lab', consultation: 'phone.search.kind.consultation', vaccine: 'phone.search.kind.vaccine',
};

/** POST /api/orders takes 1 to 10 of one product per line (its `quantity` field); a service is always 1. */
const ORDER_LINE_MAX = 10;
/** The stepper's signs, drawn as text as on the canvas (the icon set has no minus). */
const MINUS = '\u2212';
const PLUS = '+';
/** The most of one line the cart takes (the same rule as LiveCartContext): the stock, within the API's bound. */
const lineMax = (item: LiveCatalogItem) => (item.kind === 'product' ? Math.min(item.stock, ORDER_LINE_MAX) : 1);

/**
 * Cart (canvas Cart, SK-062): what is in it, at the catalogue's prices, the
 * saving against MRP, and one tap to change a quantity or remove a line.
 * The quantity sheet says when a line is at its limit and why.
 *
 * Left out from the board: the prescription-course note (prescription items
 * cannot be put in the cart, and a cart never shows anything from a
 * prescription — Rule L) and the delivery fee line (the provider confirms any
 * charge; none is invented here).
 */
export const CartView = observer(function CartView({ vm, cart }: { vm: PhoneShopViewModel; cart: CartPort }) {
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const line = cart.lines.find((l) => l.item.id === editing) ?? null;
  const total = cartTotal(cart);
  const saved = cartMrp(cart) - total;
  const max = line ? lineMax(line.item) : 1;
  const open = (id: string, quantity: number) => { setEditing(id); setQty(quantity); };

  return (
    <View style={phoneLayout.screen} testID="cart">
      <ShopTopBar title={t('phone.cart.title')} onBack={() => vm.back()} />
      {cart.lines.length === 0 ? (
        <View style={phoneLayout.content}>
          <EmptyState title={t('cart.emptyTitle')} body={t('phone.cart.emptyBody')} action={{ label: t('phone.list.backToShop'), onPress: vm.home }} animation="anim-shopping-cart" />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={phoneLayout.content}>
            <View>
              <Text style={styles.eyebrow}>{t('phone.cart.eyebrow')}</Text>
              <Text accessibilityRole="header" style={phoneText.display}>{plural(t, cart.lines.length, 'phone.cart.itemsOne', 'phone.cart.items')}</Text>
            </View>
            {cart.lines.map((l, i) => (
              <Rise key={l.item.id} index={i}>
                <View style={styles.row} testID={`cart-line-${l.item.id}`}>
                  <View style={phoneLayout.grow}>
                    <View style={styles.nameRow}>
                      <Text style={phoneText.title}>{l.item.name}</Text>
                      <Tag label={t(KIND[l.item.kind])} tone="positive" />
                    </View>
                    <Text style={phoneText.meta}>{l.item.pack}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{money(l.item.pricePaise * l.quantity)}</Text>
                      {l.item.mrpPaise > l.item.pricePaise ? <Text style={phoneText.mrp}>{money(l.item.mrpPaise * l.quantity)}</Text> : null}
                    </View>
                  </View>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.cart.changeQty', { name: l.item.name, count: l.quantity })}
                    onPress={() => open(l.item.id, l.quantity)} testID={`cart-qty-${l.item.id}`}
                    style={({ focused }: Pressed) => [styles.qty, focused ? focusRing : null]}>
                    <Text style={styles.qtyText}>{t('phone.cart.qty', { count: l.quantity })}</Text>
                  </Pressable>
                </View>
              </Rise>
            ))}
            <View style={styles.summary}>
              <View style={styles.sumRow}><Text style={phoneText.body}>{t('phone.cart.subtotal')}</Text><Text style={styles.sumValue}>{money(total)}</Text></View>
              {saved > 0 ? (
                <View style={styles.sumRow}><Text style={phoneText.body}>{t('phone.cart.saved')}</Text><Text style={[styles.sumValue, styles.good]}>{t('phone.cart.minus', { amount: money(saved) })}</Text></View>
              ) : null}
              <View style={[styles.sumRow, styles.totalRow]}><Text style={phoneText.title}>{t('phone.cart.total')}</Text><Text style={styles.total}>{money(total)}</Text></View>
              <Text style={phoneText.meta}>{t('phone.cart.chargeNote')}</Text>
            </View>
            <FirewallNote text={t('phone.cart.firewall')} />
          </ScrollView>
          <View style={styles.cta}>
            <Button label={t('phone.cart.checkout', { total: money(total) })} size="cta" fullWidth onPress={() => vm.push({ name: 'checkout' })} testID="cart-checkout" />
          </View>
        </>
      )}

      <Sheet visible={line !== null} title={line?.item.name ?? ''} subtitle={line ? t('phone.cart.each', { pack: line.item.pack, price: money(line.item.pricePaise) }) : undefined}
        onClose={() => setEditing(null)} testID="cart-sheet">
        {line ? (
          <View style={styles.sheetBody}>
            <View style={styles.stepper}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('cart.decrease', { name: line.item.name })} disabled={qty <= 1}
                onPress={() => setQty((q) => Math.max(1, q - 1))} testID="cart-dec" style={({ focused }: Pressed) => [styles.step, qty <= 1 ? styles.stepOff : null, focused ? focusRing : null]}>
                <Text style={styles.stepGlyph}>{MINUS}</Text>
              </Pressable>
              <Text style={styles.stepValue} accessibilityLiveRegion="polite" testID="cart-qty-value">{qty}</Text>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('cart.increase', { name: line.item.name })} disabled={qty >= max}
                onPress={() => setQty((q) => Math.min(max, q + 1))} testID="cart-inc" style={({ focused }: Pressed) => [styles.step, qty >= max ? styles.stepOff : null, focused ? focusRing : null]}>
                <Text style={styles.stepGlyph}>{PLUS}</Text>
              </Pressable>
            </View>
            {qty >= max ? (
              <View style={styles.cap} role="status" testID="cart-cap">
                <Icon name="alert-circle-2" size={18} color={color.attention} />
                <Text style={[styles.capText, phoneLayout.grow]}>
                  {line.item.kind !== 'product' ? t('phone.cart.capService') : max < ORDER_LINE_MAX ? t('phone.cart.capStock', { count: max }) : t('phone.cart.capMax', { count: max })}
                </Text>
              </View>
            ) : null}
            <Button label={t('phone.cart.update')} size="cta" fullWidth onPress={() => { cart.setQuantity(line.item.id, qty); setEditing(null); }} testID="cart-update" />
            <Button label={t('phone.cart.remove')} variant="ghost" fullWidth onPress={() => { cart.setQuantity(line.item.id, 0); setEditing(null); }} testID="cart-remove" />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8, marginTop: space.s4 },
  price: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  qty: { minWidth: size.touchTarget + space.s10, minHeight: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface2 },
  qtyText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  summary: { gap: space.s8, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s12 },
  sumValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  good: { color: color.positive },
  totalRow: { paddingTop: space.s8, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  total: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cta: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, backgroundColor: color.canvas },
  sheetBody: { gap: space.s14 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { width: size.controlLg, height: size.controlLg, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: 1, borderColor: color.rule },
  stepOff: { opacity: 0.4 },
  stepGlyph: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  stepValue: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cap: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, padding: space.s14, borderRadius: radius.md, backgroundColor: color.attentionBg },
  capText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.attention },
});
