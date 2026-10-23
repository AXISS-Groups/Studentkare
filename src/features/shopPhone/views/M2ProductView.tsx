import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { ErrorState, Rise, Skeleton } from '@/design-system';
import { Gradient, M2Card, M2Heading, RoundButton, floatTransform, m2Text, useAmbientMotion, useLoop, useOwnPhoneChrome, webAttrs, M2HeaderSos } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MedicineAlternative } from '@/features/marketplace/data/MedicineRepository';
import type { M2ProductViewModel } from '../viewmodel/M2ProductViewModel';

/**
 * Mobile 2.0 medicine page (canvas page 9 M2Product, Tier 1; plan package A,
 * approved by Krishna Chintakayala 2026-10-21). See M2ProductViewModel for the
 * rules. Left out from the board, on purpose: the clinic pickup and delivery
 * times (no estimate API), "inclusive of taxes" (the catalogue does not record
 * it), the "About this medicine" section (no reviewed information yet, D-M2-1)
 * and, for a prescription medicine, other makers, the stepper and "Add to cart"
 * (D-M2-2: the server refuses them).
 */
export interface M2ProductLinks {
  back: () => void;
  cart: () => void;
  /** Open another maker's listing. */
  open: (alt: MedicineAlternative) => void;
  /** Add `quantity` of this listing to the cart (then the route shows the cart). */
  add: (quantity: number) => void;
  /** Add a prescription document (the vault upload). */
  addRx?: () => void;
  /** Send a prescription to a pharmacy (the dispense flow). */
  sendRx?: () => void;
  /** Medicine information for this listing's medicine (reviewed label information; plan tier1-medicine-info-2026-10-22). */
  info?: (medicineId: string) => void;
}

const SHOWN = 3;

function Blister({ strength }: { strength: string }) {
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  return (
    <Animated.View pointerEvents="none" style={[styles.blisterWrap, { transform: floatTransform(float, space.s8) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Gradient colors={[color.surface, color.serviceTealSoft]} angle={150} style={styles.blister}>
        <View style={styles.pills}>
          {Array.from({ length: 10 }, (_, i) => <View key={i} style={styles.pill} />)}
        </View>
        {strength ? <Text numberOfLines={1} style={styles.strength}>{strength}</Text> : null}
      </Gradient>
    </Animated.View>
  );
}

/** The strength printed on the art ("650 mg"), from the composition's first strength. */
export function strengthOf(composition: string | null): string {
  const m = composition?.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|IU|%))/i);
  return m?.[1] ?? '';
}

export const M2ProductView = observer(function M2ProductView({ vm, cartCount, links, navClearance = 0 }: {
  vm: M2ProductViewModel; cartCount: number; links: M2ProductLinks;
  /** Room under the action bar for the floating pill nav (web phone frame). */
  navClearance?: number;
}) {
  const t = useT();
  useOwnPhoneChrome();
  const [all, setAll] = useState(false);
  const item = vm.item;
  const cartLabel = cartCount === 0 ? t('m2.cart') : cartCount === 1 ? t('m2.cartOne') : t('m2.cartCount', { count: cartCount });

  const hero = (
    <Gradient colors={[color.serviceTealSoft, color.serviceTeal]} angle={160} style={styles.hero}>
      <View pointerEvents="none" style={styles.heroRing} />
      <View style={styles.heroHead}>
        <RoundButton icon="arrow-left" label={t('m2.prod.back')} onPress={links.back} testID="m2-prod-back" />
        <RoundButton icon="cart" label={cartLabel} badge={cartCount || undefined} onPress={links.cart} testID="m2-prod-cart" />
        <M2HeaderSos />
      </View>
      {item ? <Blister strength={strengthOf(vm.composition)} /> : null}
    </Gradient>
  );

  if (!item) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-product-missing">
        {hero}
        <View style={styles.gutter}>
          {vm.phase === 'loading' ? <Skeleton label={t('phone.shop.loading')} lines={['60%', '100%', '80%', '40%']} /> : (
            <ErrorState title={t('phone.detail.missingTitle')} body={t('phone.detail.missingBody')} retryLabel={t('phone.list.backToShop')} onRetry={links.back} />
          )}
        </View>
      </ScrollView>
    );
  }

  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const rx = vm.prescription;
  const alts = all ? vm.alternatives : vm.alternatives.slice(0, SHOWN);
  const stockText = vm.stockPhase === 'ready' ? (vm.available ? t('m2.prod.inStock') : t('shop.outOfStock')) : vm.stockPhase === 'error' ? t('m2.prod.stockUnknown') : '';

  return (
    <View style={styles.screen} testID="m2-product">
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {hero}
        <Rise index={1} style={styles.gutter}>
          <View style={styles.chips}>
            {rx ? <View style={[styles.chip, styles.rxChip]} testID="m2-prod-rx"><Text style={[styles.chipText, styles.rxChipText]}>{t('m2.prod.rxNeeded')}</Text></View> : null}
            {stockText ? (
              <View style={[styles.chip, vm.available ? styles.stockChip : styles.noStockChip]} testID="m2-prod-stock" aria-live="polite">
                {vm.available ? <View style={styles.stockDot} /> : null}
                <Text style={[styles.chipText, vm.available ? styles.stockChipText : styles.noStockText]}>{stockText}</Text>
              </View>
            ) : null}
          </View>
          <M2Heading level={1} style={styles.name}>{item.name}</M2Heading>
          <Text style={styles.pack}>{[item.pack, item.brand].filter(Boolean).join(' · ')}</Text>
          {vm.composition ? (
            <View style={styles.contains} testID="m2-prod-composition">
              <Icon name="flask" size={16} color={color.action} strokeWidth={2.2} />
              <Text style={styles.containsText}>{t('m2.prod.contains', { composition: vm.composition })}</Text>
            </View>
          ) : null}
          {item.medicineId && links.info ? (
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('mi.productLink')} aria-label={t('mi.productLink')}
              onPress={() => links.info?.(item.medicineId ?? '')} testID="m2-prod-info"
              style={({ focused }: PressState) => [styles.infoLink, focused ? focusRing : null]}>
              <Icon name="info" size={16} color={color.action} strokeWidth={2.2} />
              <Text style={[m2Text.link, styles.grow]}>{t('mi.productLink')}</Text>
              <Icon name="chevron-right" size={16} color={color.action} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </Rise>

        <Rise index={2} style={styles.gutter}>
          <M2Card style={styles.priceCard}>
            <View style={styles.grow}>
              <Text style={styles.price}>{money(item.pricePaise)}</Text>
              {off > 0 ? <Text style={m2Text.meta}>{t('m2.prod.mrp', { price: money(item.mrpPaise), percent: off })}</Text> : null}
            </View>
            {!rx && vm.canAdd ? (
              <View role="group" accessibilityRole="none" accessibilityLabel={t('m2.prod.quantity')} aria-label={t('m2.prod.quantity')} style={styles.stepper} testID="m2-prod-stepper">
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.prod.fewer')} aria-label={t('m2.prod.fewer')} disabled={vm.quantity <= 1}
                  accessibilityState={{ disabled: vm.quantity <= 1 }} onPress={() => vm.setQuantity(vm.quantity - 1)} testID="m2-prod-minus"
                  style={({ focused }: PressState) => [styles.step, vm.quantity <= 1 ? styles.stepOff : null, focused ? focusRing : null]}>
                  <Icon name="minus" size={18} color={color.onHero} strokeWidth={2.6} />
                </Pressable>
                <Text style={styles.qty} aria-live="polite" testID="m2-prod-qty">{vm.quantity}</Text>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.prod.more')} aria-label={t('m2.prod.more')} disabled={vm.quantity >= vm.maxQuantity}
                  accessibilityState={{ disabled: vm.quantity >= vm.maxQuantity }} onPress={() => vm.setQuantity(vm.quantity + 1)} testID="m2-prod-plus"
                  style={({ focused }: PressState) => [styles.step, vm.quantity >= vm.maxQuantity ? styles.stepOff : null, focused ? focusRing : null]}>
                  <Icon name="plus" size={18} color={color.onHero} strokeWidth={2.6} />
                </Pressable>
              </View>
            ) : null}
          </M2Card>
          {vm.stockPhase === 'error' ? (
            <Text accessibilityRole="button" onPress={vm.retryStock} style={[m2Text.link, styles.inlineLink]} testID="m2-prod-stock-retry">{t('m2.prod.stockRetry')}</Text>
          ) : null}
        </Rise>

        {rx ? (
          <Rise index={3} style={styles.gutter}>
            <M2Card style={styles.rxCard} testID="m2-prod-rx-note">
              <M2Heading style={m2Text.cardTitle}>{t('m2.prod.rxTitle')}</M2Heading>
              <Text style={m2Text.body}>{t('m2.prod.rxBody')}</Text>
            </M2Card>
          </Rise>
        ) : item.medicineId ? (
          <Rise index={3} style={styles.gutter}>
            <Gradient colors={[color.serviceTealSoft, color.surface]} angle={160} style={styles.alts} testID="m2-prod-alts">
              <M2Heading style={m2Text.cardTitle}>{t('m2.prod.altsTitle')}</M2Heading>
              <Text style={m2Text.meta}>{t('m2.prod.altsSub')}</Text>
              {vm.alternativesPhase === 'loading' ? <Skeleton label={t('m2.prod.altsTitle')} lines={['100%', '80%']} /> : null}
              {vm.alternativesPhase === 'error' ? <Text accessibilityRole="button" onPress={vm.retryAlternatives} style={[m2Text.link, styles.inlineLink]}>{t('m2.prod.altsRetry')}</Text> : null}
              {vm.alternativesPhase === 'ready' && vm.alternatives.length === 0 ? <Text style={[m2Text.body, styles.altsEmpty]}>{t('m2.prod.altsNone')}</Text> : null}
              <View aria-live="polite">
                {alts.map((a, i) => (
                  <Pressable key={a.id} role="link" accessibilityRole="link" accessibilityLabel={`${a.name}, ${a.pack}, ${money(a.pricePaise)}${i === 0 ? `, ${t('m2.prod.lowest')}` : ''}`}
                    aria-label={`${a.name}, ${a.pack}, ${money(a.pricePaise)}${i === 0 ? `, ${t('m2.prod.lowest')}` : ''}`} onPress={() => links.open(a)} testID={`m2-prod-alt-${a.id}`}
                    style={({ focused }: PressState) => [styles.alt, focused ? focusRing : null]}>
                    <View style={styles.grow}>
                      <Text style={m2Text.cardTitle}>{a.name}</Text>
                      <Text style={m2Text.meta}>{[a.pack, a.manufacturer || a.brand].filter(Boolean).join(' · ')}</Text>
                    </View>
                    {i === 0 ? <View style={styles.lowest}><Text style={styles.lowestText}>{t('m2.prod.lowest')}</Text></View> : null}
                    <Text style={styles.altPrice}>{money(a.pricePaise)}</Text>
                  </Pressable>
                ))}
              </View>
              {vm.alternatives.length > SHOWN ? (
                <Pressable role="button" accessibilityRole="button" aria-expanded={all} accessibilityState={{ expanded: all }}
                  accessibilityLabel={all ? t('m2.prod.altsFewer') : t('m2.prod.altsAll', { count: vm.alternatives.length })} aria-label={all ? t('m2.prod.altsFewer') : t('m2.prod.altsAll', { count: vm.alternatives.length })}
                  onPress={() => setAll(!all)} testID="m2-prod-alts-toggle" style={({ focused }: PressState) => [styles.more, focused ? focusRing : null]}>
                  <Text style={m2Text.link}>{all ? t('m2.prod.altsFewer') : t('m2.prod.altsAll', { count: vm.alternatives.length })}</Text>
                  <View style={[styles.chev, all ? styles.chevOpen : null]}><Icon name="chevron-down" size={16} color={color.action} strokeWidth={2.4} /></View>
                </Pressable>
              ) : null}
            </Gradient>
          </Rise>
        ) : null}

        <Rise index={4} style={styles.gutter}>
          <View style={styles.caution}>
            <Text style={m2Text.body}>{t('phone.detail.caution')}</Text>
          </View>
        </Rise>
      </ScrollView>

      <View style={[styles.bar, navClearance ? { paddingBottom: space.s16 + navClearance } : null]} {...webAttrs({ role: 'region', 'aria-label': t('m2.prod.actions') })}>
        {rx ? (
          <>
            {links.addRx ? (
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.prod.addRx')} aria-label={t('m2.prod.addRx')} onPress={links.addRx} testID="m2-prod-add-rx"
                style={({ focused }: PressState) => [styles.outline, focused ? focusRing : null]}>
                <Text style={styles.outlineText}>{t('m2.prod.addRx')}</Text>
              </Pressable>
            ) : null}
            {links.sendRx ? (
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.prod.sendRx')} aria-label={t('m2.prod.sendRx')} onPress={links.sendRx} testID="m2-prod-send-rx"
                style={({ focused }: PressState) => [styles.primaryWrap, focused ? focusRing : null]}>
                <Gradient colors={[color.brandNavyLight, color.brandNavy]} angle={150} style={styles.primary}>
                  <Text style={styles.primaryText}>{t('m2.prod.sendRx')}</Text>
                </Gradient>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable role="button" accessibilityRole="button" disabled={!vm.canAdd} accessibilityState={{ disabled: !vm.canAdd }}
            accessibilityLabel={vm.canAdd ? t('m2.prod.addN', { count: vm.quantity }) : stockText || t('shop.outOfStock')}
            aria-label={vm.canAdd ? t('m2.prod.addN', { count: vm.quantity }) : stockText || t('shop.outOfStock')}
            onPress={() => links.add(vm.quantity)} testID="m2-prod-add" style={({ focused }: PressState) => [styles.primaryWrap, !vm.canAdd ? styles.off : null, focused ? focusRing : null]}>
            <Gradient colors={[color.brandNavyLight, color.brandNavy]} angle={150} style={styles.primary}>
              <Text style={styles.primaryText}>{vm.canAdd ? t('m2.prod.addN', { count: vm.quantity }) : stockText || t('shop.outOfStock')}</Text>
            </Gradient>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: space.s24, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  hero: { height: 300, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  heroRing: { position: 'absolute', left: -60, bottom: -80, width: 240, height: 240, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroHead: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, flexDirection: 'row', justifyContent: 'space-between' },
  blisterWrap: { position: 'absolute', left: '50%', top: 92, marginLeft: -92, width: 184, height: 150 },
  blister: { flex: 1, borderRadius: 30, paddingVertical: 26, paddingHorizontal: 22, justifyContent: 'space-between', ...shadowStyle(shadow.float) },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10, justifyContent: 'space-between' },
  pill: { width: 20, height: 26, borderRadius: radius.full, backgroundColor: color.surface2, borderWidth: 1, borderColor: color.rule },
  strength: { textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.serviceTealInk },
  chips: { flexDirection: 'row', gap: space.s8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  chipText: { fontFamily: font.family.sans, fontSize: 11.5, fontWeight: fontWeight(font.weight.heavy) },
  rxChip: { backgroundColor: color.attentionBg },
  rxChipText: { color: color.attention },
  stockChip: { backgroundColor: color.positiveBg },
  stockChipText: { color: color.positive },
  noStockChip: { backgroundColor: color.neutralBg },
  noStockText: { color: color.text2 },
  stockDot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: color.positive },
  name: { marginTop: space.s12, fontFamily: font.family.sans, fontSize: 25, lineHeight: 30, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.7, color: color.text },
  pack: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: 13, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  contains: { marginTop: space.s12, paddingVertical: space.s10, paddingHorizontal: space.s12, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: space.s8, backgroundColor: color.surface2 },
  infoLink: { minHeight: size.touchTarget, marginTop: space.s4, flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  containsText: { flex: 1, fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.strong), color: color.action },
  priceCard: { borderRadius: 24, padding: space.s16, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  price: { fontFamily: font.family.sans, fontSize: 26, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.text, fontVariant: ['tabular-nums'] },
  stepper: { height: 52, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s4, backgroundColor: color.action },
  step: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  stepOff: { opacity: 0.45 },
  qty: { width: 36, textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, fontVariant: ['tabular-nums'] },
  inlineLink: { minHeight: size.touchTarget, paddingTop: space.s12 },
  rxCard: { borderRadius: 24, padding: space.s16, gap: space.s6, backgroundColor: color.attentionBg },
  alts: { borderRadius: 26, padding: space.s16, gap: space.s4, ...shadowStyle(shadow.card) },
  altsEmpty: { paddingVertical: space.s8 },
  alt: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  lowest: { paddingHorizontal: space.s8, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.serviceGreenDeep },
  lowestText: { fontFamily: font.family.sans, fontSize: 10.5, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  altPrice: { fontFamily: font.family.sans, fontSize: 14.5, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  more: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  chev: webOnly({ transitionProperty: 'transform', transitionDuration: `${motion.duration.fast}ms` }),
  chevOpen: { transform: [{ rotate: '180deg' }] },
  caution: { padding: space.s14, borderRadius: radius.md, backgroundColor: color.surface2 },
  bar: {
    paddingTop: space.s14, paddingBottom: space.s24, paddingHorizontal: space.gutterPhone, flexDirection: 'row', gap: space.s10,
    backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.ruleSoft, ...shadowStyle(shadow.sheet),
  },
  outline: { minHeight: size.controlLg, paddingHorizontal: space.s16, borderRadius: radius.full, borderWidth: 1.5, borderColor: color.action, justifyContent: 'center' },
  outlineText: { fontFamily: font.family.sans, fontSize: 14, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  primaryWrap: { flex: 1, borderRadius: radius.full },
  primary: { minHeight: size.controlLg, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s16 },
  primaryText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, textAlign: 'center' },
  off: { opacity: 0.5 },
});
