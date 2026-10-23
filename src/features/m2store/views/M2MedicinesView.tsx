import React, { useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { ErrorState, Rise, Skeleton } from '@/design-system';
import {
  cardLabel,
  Gradient, LiftCard, M2Card, M2Header, M2ListRow, M2ProductCard, M2SearchField, M2SectionHead, M2_NAV_CLEARANCE, NAVY_STOPS, NotYetTile, RoundButton, SERVICE_HUES, SoftTileGrid, floatTransform, heroStops, m2Text, useAmbientMotion, useLift, useLoop, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, font, fontWeight, motion, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { FirewallNote } from '@/features/phoneKit/phoneParts';
import { MEDICINE_CATEGORIES, productArt } from '../data/storeArt';
import type { ShopFilter } from '../data/storeArt';
import { orderLinePhone } from '../data/orderLine';
import { GenericsCompare } from './GenericsCompare';

/**
 * Mobile 2.0 Medicines (canvas page 9 M2Medicines, Tier 2; replaces the
 * phone ShopHome and leads into the shop's list, product, cart and checkout).
 *
 * Rule L (founder 2026-10-21): no personal health data here. The refills card
 * is a plain link to My health; nothing on this board is chosen from the
 * health record. Every price is the catalogue's.
 *
 * Honest gaps: "Chat to order" says soon (as on the board); "Call to order"
 * says not available until an order line is configured; the pickup and
 * delivery cards say the time is chosen at checkout (no ready-by or delivery
 * window estimate exists); "Lower prices this week" is the catalogue's own
 * first shelf, filtered to what sells below MRP (no "deals" selection exists).
 */
export type Phase = 'idle' | 'loading' | 'ready' | 'error';

export interface M2MedicinesLinks {
  back: () => void;
  cart: () => void;
  /** Search the catalogue for what was typed. */
  search: (query: string) => void;
  /** Order with a prescription (the prescription upload). */
  rx: () => void;
  category: (filter: ShopFilter) => void;
  /** The generics card: medicines, where each product shows its same-composition options. */
  generics: () => void;
  /** Refills live in My health (no personal data on this board). */
  refills: () => void;
  product: (item: LiveCatalogItem) => void;
  seeAll: () => void;
  rewards?: () => void;
  labs?: () => void;
  /** Medicine information: reviewed label information, by name or photo (plan tier1-medicine-info-2026-10-22). */
  medicineInfo?: () => void;
}

export interface M2MedicinesViewProps {
  links: M2MedicinesLinks;
  cartCount: number;
  shelf: { phase: Phase; items: readonly LiveCatalogItem[]; retry: () => void };
  /** Kare points, kept from the shop home (null: could not be read). */
  points?: { value: number | null; ready: boolean };
  labFromPaise?: number | null;
  /** Add to the cart, where the platform has one, and whether an item can go in (no Rx items, no empty stock). */
  cart?: { add: (item: LiveCatalogItem) => void; canAdd: (item: LiveCatalogItem) => boolean };
}


function Coin() {
  const ambient = useAmbientMotion();
  const turn = useLoop(ambient, motion.duration.ambient);
  const rotate = turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-8deg', '8deg', '-8deg'] });
  return (
    <Animated.View pointerEvents="none" style={[styles.coin, { transform: [...floatTransform(turn, space.s8), { rotate }] }]}>
      <Gradient colors={[SERVICE_HUES.amber.soft, SERVICE_HUES.amber.light]} style={styles.coinFace}>
        <Text style={styles.coinText}>₹</Text>
      </Gradient>
    </Animated.View>
  );
}

/** A "Below MRP" listing: the shared Mobile 2.0 product card (the web shop's grid draws the same card). */
function DealCard({ item, onOpen, cart }: { item: LiveCatalogItem; onOpen: () => void; cart?: M2MedicinesViewProps['cart'] }) {
  const t = useT();
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const canAdd = cart ? cart.canAdd(item) : false;
  return (
    <M2ProductCard
      testID={`m2-med-deal-${item.id}`}
      style={styles.deal}
      art={productArt(item)}
      off={off > 0 ? t('m2.med.off', { percent: off }) : undefined}
      name={item.name}
      pack={item.pack}
      notes={item.requiresPrescription ? [{ text: t('m2.med.rxNeeded'), tone: 'attention' }] : []}
      price={money(item.pricePaise)}
      mrp={off > 0 ? money(item.mrpPaise) : undefined}
      onOpen={onOpen}
      label={`${item.name}, ${item.pack}, ${money(item.pricePaise)}`}
      action={cart && canAdd ? { label: t('m2.add'), spoken: t('m2.addSpoken', { name: item.name }), onPress: () => cart.add(item) } : undefined}
    />
  );
}

export function M2MedicinesView({ links, cartCount, shelf, points, labFromPaise = null, cart }: M2MedicinesViewProps): React.ReactElement {
  const t = useT();
  useOwnPhoneChrome();
  const [query, setQuery] = useState('');
  const phone = orderLinePhone();
  const lift = useLift();
  const below = shelf.items.filter((item) => discountPercent(item.mrpPaise, item.pricePaise) > 0);
  const cartLabel = cartCount > 0 ? t(cartCount === 1 ? 'm2.cartOne' : 'm2.cartCount', { count: cartCount }) : t('m2.cart');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-medicines">
      <Gradient colors={[SERVICE_HUES.teal.soft, color.canvas]} radial={{ x: 0.5, y: 0.5 }} style={styles.glow} pointerEvents="none" />
      <Rise>
        <M2Header backLabel={t('m2.backHome')} onBack={links.back} eyebrow={t('m2.med.eyebrow')} title={t('m2.med.title')}
          trailing={<RoundButton icon="cart" label={cartLabel} badge={cartCount} onPress={links.cart} testID="m2-med-cart" />} />
      </Rise>

      <Rise index={1} style={styles.gutter}>
        <M2SearchField placeholder={t('m2.med.search')} label={t('m2.med.searchLabel')} value={query} onChangeText={setQuery}
          onSubmit={() => { if (query.trim()) links.search(query.trim()); }} testID="m2-med-search" />
      </Rise>

      <Rise index={2} style={[styles.gutter, styles.row3]}>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.med.rx')} aria-label={t('m2.med.rx')} onPress={links.rx} testID="m2-med-rx"
          style={(state: PressState) => [styles.third, styles.wide, lift(state)]}>
          <Gradient colors={NAVY_STOPS} style={styles.rxCard}>
            <Icon name="doc-upload" size={22} color={color.onHero} strokeWidth={2.1} />
            <Text style={styles.rxText}>{t('m2.med.rx')}</Text>
          </Gradient>
        </Pressable>
        {phone ? (
          <LiftCard label={t('m2.callOrderSpoken', { number: phone })} onPress={() => void Linking.openURL(`tel:${phone}`)} testID="m2-med-call" style={[styles.third, styles.whiteCard]}>
            <Icon name="phone" size={22} color={color.action} strokeWidth={2.1} />
            <Text style={styles.callText}>{t('m2.callOrder')}</Text>
          </LiftCard>
        ) : (
          <NotYetTile icon="phone" title={t('m2.callOrder')} note={t('m2.notYet')} style={styles.third} testID="m2-med-call-unavailable" />
        )}
        <NotYetTile icon="message-circle" title={t('m2.med.chat')} note={t('m2.soon')} style={styles.third} testID="m2-med-chat" />
      </Rise>

      <Rise index={3} style={[styles.gutter, styles.heroRow]}>
        <Pressable role="link" accessibilityRole="link" {...cardLabel(`${t('m2.med.genericsTitle')}. ${t('m2.med.genericsCta')}`)}
          onPress={links.generics} testID="m2-med-generics" style={(state: PressState) => [styles.genericsPress, lift(state)]}>
          <Gradient colors={heroStops('green')} style={styles.generics}>
            <View pointerEvents="none" style={styles.genericsRing} />
            <Coin />
            <Text style={styles.genericsEyebrow}>{t('m2.med.genericsEyebrow')}</Text>
            <Text style={styles.genericsTitle}>{t('m2.med.genericsTitle')}</Text>
            <View style={styles.genericsCta}>
              <Text style={styles.genericsCtaText}>{t('m2.med.genericsCta')}</Text>
              <Icon name="arrow-right" size={14} color={color.onHero} strokeWidth={2.6} />
            </View>
          </Gradient>
        </Pressable>
        <View style={styles.infoCol}>
          <M2Card style={styles.info} testID="m2-med-pickup">
            <Text style={[styles.infoEyebrow, { color: color.positive }]}>{t('m2.med.pickup')}</Text>
            <Text style={m2Text.cardTitle}>{t('m2.med.pickupBody')}</Text>
          </M2Card>
          <M2Card style={styles.info} testID="m2-med-block">
            <Text style={[styles.infoEyebrow, { color: color.action }]}>{t('m2.med.block')}</Text>
            <Text style={m2Text.cardTitle}>{t('m2.med.blockBody')}</Text>
          </M2Card>
        </View>
      </Rise>

      <Rise index={4} style={styles.gutter}>
        <M2SectionHead title={t('m2.med.cats')} />
        <SoftTileGrid testID="m2-med-cat" items={MEDICINE_CATEGORIES.map((c) => ({ key: c.key, label: t(c.label), icon: c.icon, hue: c.hue, neutral: c.neutral, onPress: () => links.category(c.filter) }))} />
      </Rise>

      <Rise index={5} style={styles.gutter}>
        <M2ListRow icon="refresh" hue="indigo" title={t('m2.med.refills')} meta={t('m2.med.refillsBody')} onPress={links.refills} testID="m2-med-refills" />
        {links.medicineInfo ? (
          <M2ListRow icon="pill" hue="teal" title={t('mi.entryTitle')} meta={t('mi.entryBody')} onPress={links.medicineInfo} testID="m2-med-info" style={styles.infoCard} />
        ) : null}
      </Rise>

      <Rise index={6}>
        <View style={styles.gutter}>
          <M2SectionHead title={t('m2.med.deals')} action={{ label: t('m2.seeAll'), spoken: t('m2.med.seeAllSpoken'), onPress: links.seeAll }} />
          {shelf.phase === 'loading' || shelf.phase === 'idle' ? <Skeleton label={t('m2.med.dealsLoading')} lines={['60%', '100%', '80%']} /> : null}
          {shelf.phase === 'error' ? <ErrorState title={t('m2.med.dealsFailedTitle')} body={t('m2.med.dealsFailedBody')} retryLabel={t('common.tryAgain')} onRetry={shelf.retry} /> : null}
          {shelf.phase === 'ready' && below.length === 0 ? <Text style={m2Text.body} testID="m2-med-deals-empty">{t('m2.med.dealsEmpty')}</Text> : null}
        </View>
        {below.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} testID="m2-med-deals">
            {below.map((item) => <DealCard key={item.id} item={item} cart={cart} onOpen={() => links.product(item)} />)}
          </ScrollView>
        ) : null}
      </Rise>

      <Rise index={7} style={styles.gutter}>
        <GenericsCompare />
      </Rise>

      {points || (labFromPaise !== null && links.labs) ? (
        <View style={[styles.gutter, styles.extras]}>
          {points && links.rewards ? (
            <M2ListRow icon="star" hue="amber" title={points.value === null ? t('phone.shop.pointsTitle') : t('phone.shop.points', { count: points.value })}
              meta={points.ready && points.value === null ? t('phone.shop.pointsUnavailable') : t('phone.shop.pointsNote')} onPress={links.rewards} testID="m2-med-points" />
          ) : null}
          {labFromPaise !== null && links.labs ? (
            <M2ListRow icon="lab" hue="violet" title={t('phone.shop.labsFrom', { price: money(labFromPaise) })} onPress={links.labs} testID="m2-med-labs" />
          ) : null}
        </View>
      ) : null}
      {/* Rule L made visible (DESIGN.md §2.3), kept from the shop home this board replaces. */}
      <View style={styles.gutter}><FirewallNote text={t('phone.shop.firewall')} /></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -140, left: -100, width: 320, height: 320, borderRadius: radius.full },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0 },
  row3: { flexDirection: 'row', gap: space.s10 },
  third: { flex: 1, minWidth: 0, minHeight: 86 },
  /** "Order with prescription" needs the room for its long word. */
  wide: { flex: 1.25 },
  rxCard: { flex: 1, borderRadius: radius.xl, padding: space.s12, gap: space.s8 },
  rxText: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption + space.s4, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  callText: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption + space.s4, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  whiteCard: { borderRadius: radius.xl, padding: space.s12, gap: space.s8, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  heroRow: { flexDirection: 'row', gap: space.s12 },
  genericsPress: { flex: 1.25, borderRadius: 26, ...shadowStyle(shadow.float) },
  generics: { minHeight: 176, borderRadius: 26, padding: space.s16, justifyContent: 'space-between', gap: space.s6, overflow: 'hidden' },
  genericsRing: { position: 'absolute', right: -36, bottom: -40, width: 140, height: 140, borderRadius: radius.full, borderWidth: 22, borderColor: color.onHeroRule },
  coin: { position: 'absolute', right: space.s16, top: space.s14 },
  coinFace: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  coinText: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: SERVICE_HUES.amber.end },
  genericsEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHero },
  genericsTitle: { maxWidth: 170, fontFamily: font.family.sans, fontSize: font.size.titleSm, lineHeight: 22, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  genericsCta: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  genericsCtaText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  infoCol: { flex: 1, gap: space.s12 },
  info: { flex: 1, padding: space.s12, justifyContent: 'space-between', gap: space.s6 },
  infoEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, textTransform: 'uppercase' },
  infoCard: { marginTop: space.s12 },
  rail: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s8, gap: space.s12 },
  deal: { width: 156 },
  extras: { gap: space.s12 },
});
