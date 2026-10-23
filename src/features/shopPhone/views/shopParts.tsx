import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { BackButton, RoundIconButton } from '@/features/phoneKit/phoneParts';
import { plural } from '@/features/phoneKit/plural';
import type { CartPort } from '../viewmodel/PhoneShopViewModel';

type Pressed = { pressed: boolean; focused?: boolean };

export const cartCount = (cart: CartPort) => cart.lines.reduce((n, l) => n + l.quantity, 0);
export const cartTotal = (cart: CartPort) => cart.lines.reduce((n, l) => n + l.item.pricePaise * l.quantity, 0);
export const cartMrp = (cart: CartPort) => cart.lines.reduce((n, l) => n + Math.max(l.item.mrpPaise, l.item.pricePaise) * l.quantity, 0);

/** Where the shop hands off outside its own boards. */
export interface ShopLinks {
  /** Leave the shop from its home (the tab bar is the usual way out). */
  exit?: () => void;
  openSearch: () => void;
  openRewards: () => void;
  openRefill: () => void;
  /** My health, where refills for regular medicines live (Mobile 2.0 Medicines; Rule L keeps them off the shop). */
  openMyHealth?: () => void;
  openPrescriptions: () => void;
  /** The records vault, where a prescription document is added (M2Product "Add Rx"). */
  openRecords?: () => void;
  openLabTests: () => void;
  /** Medicine information (plan tier1-medicine-info-2026-10-22): the lookup, or one medicine when an id is given. */
  openMedicineInfo?: (medicineId?: string) => void;
  bookLab: (itemId: string) => void;
  trackOrder: (orderId: string) => void;
  openOrders: () => void;
}

/** The light top bar of a shop board: back, title, and a trailing control. */
export function ShopTopBar({ title, onBack, trailing, sub }: { title: string; onBack: () => void; trailing?: React.ReactNode; sub?: string }) {
  const t = useT();
  return (
    <View style={styles.top}>
      <BackButton label={t('common.back')} onPress={onBack} />
      <View style={styles.titles}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

/** The bag with the cart count (the shop header and product list). */
export function BagButton({ count, onPress, onHero = false }: { count: number; onPress: () => void; onHero?: boolean }) {
  const t = useT();
  return (
    <RoundIconButton icon="shopping-bag" label={plural(t, count, 'phone.shop.openCartOne', 'phone.shop.openCart')} onPress={onPress} badge={count || undefined}
      tone={onHero ? 'hero' : 'surface'} testID="shop-bag" />
  );
}

/** The floating "2 items · ₹578 — View cart" bar under a product list. */
export function CartBar({ cart, onPress }: { cart: CartPort; onPress: () => void }) {
  const t = useT();
  const count = cartCount(cart);
  if (!count) return null;
  return (
    <View style={styles.barWrap}>
      <Pressable role="link" accessibilityRole="link" accessibilityLabel={plural(t, count, 'phone.shop.viewCartSpokenOne', 'phone.shop.viewCartSpoken', { total: money(cartTotal(cart)) })}
        onPress={onPress} testID="cart-bar" style={({ focused }: Pressed) => [styles.bar, focused ? focusRing : null]}>
        <View style={styles.barWords}>
          <Text style={styles.barTitle}>{plural(t, count, 'phone.shop.cartLineOne', 'phone.shop.cartLine', { total: money(cartTotal(cart)) })}</Text>
          <Text style={styles.barSub}>{t('phone.shop.cartLineSub')}</Text>
        </View>
        <View style={styles.barCta}>
          <Text style={styles.barCtaText}>{t('phone.shop.viewCart')}</Text>
          <Icon name="arrow-right" size={16} color={color.onHeroCurrent} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12,
    backgroundColor: color.canvas,
  },
  titles: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  sub: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  barWrap: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s10, backgroundColor: color.canvas },
  bar: {
    minHeight: size.controlLg + space.s12, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10,
    paddingHorizontal: space.s16, borderRadius: radius.xl, backgroundColor: color.heroBg,
  },
  barWords: { flex: 1 },
  barTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  barSub: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  barCta: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.s16,
    borderRadius: radius.full, backgroundColor: color.heroCurrent,
  },
  barCtaText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
});
