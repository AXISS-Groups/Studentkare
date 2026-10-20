import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, ErrorState, Note, Rise, Sheet, Skeleton } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BackButton, ChoiceRow, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { listingIcon } from '@/features/phoneKit/catalogArt';
import { plural } from '@/features/phoneKit/plural';
import type { CartPort, PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import { cannotAdd } from '../viewmodel/PhoneShopViewModel';
import { cartCount } from './shopParts';

type Pressed = { pressed: boolean; focused?: boolean };

/**
 * Product detail (canvas ProductDetail, SK-062): what it is, the price before
 * anything is added, and — for a medicine with a master record — the other
 * brands and packs with the same composition, cheapest first (the board's
 * pack sheet). A prescription medicine shows no alternatives and cannot be
 * added here: substitution and dispensing are the prescriber's and the
 * pharmacist's decisions.
 *
 * Left out from the board: the licence number and the delivery promise, which
 * the catalogue does not carry.
 */
export const ProductDetailView = observer(function ProductDetailView({ vm, cart }: { vm: PhoneShopViewModel; cart: CartPort }) {
  const t = useT();
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const item = vm.detail;
  const count = cartCount(cart);
  const top = (
    <View style={styles.top}>
      <BackButton label={t('common.back')} onPress={() => vm.back()} />
      <View style={phoneLayout.grow} />
      <Pressable role="link" accessibilityRole="link" accessibilityLabel={plural(t, count, 'phone.shop.openCartOne', 'phone.shop.openCart')} onPress={() => vm.push({ name: 'cart' })}
        testID="detail-cart" style={({ focused }: Pressed) => [styles.cartLink, focused ? focusRing : null]}>
        <Text style={phoneText.link}>{count ? t('phone.detail.cartCount', { count }) : t('phone.detail.cart')}</Text>
      </Pressable>
    </View>
  );
  if (!item) {
    return (
      <View style={phoneLayout.screen} testID="product-detail-missing">
        {top}
        <View style={phoneLayout.content}>
          {vm.detailPhase === 'loading' ? <Skeleton label={t('phone.shop.loading')} lines={['100%', '60%', '80%', '40%']} /> : (
            <ErrorState title={t('phone.detail.missingTitle')} body={t('phone.detail.missingBody')} retryLabel={t('phone.list.backToShop')} onRetry={vm.home} />
          )}
        </View>
      </View>
    );
  }
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const blocked = cannotAdd(item);
  const facts: { label: MessageKey; value: string }[] = [
    { label: 'phone.detail.whatItIs', value: item.description },
    { label: 'phone.detail.howToTake', value: item.preparation },
    { label: 'phone.detail.contains', value: vm.composition ?? '' },
  ].filter((f): f is { label: MessageKey; value: string } => Boolean(f.value));
  const chosen = vm.alternatives.find((a) => a.id === pick) ?? null;

  return (
    <View style={phoneLayout.screen} testID="product-detail">
      {top}
      <ScrollView contentContainerStyle={phoneLayout.content}>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name={listingIcon(item)} size={44} color={color.action} />
        </View>
        <View style={styles.head}>
          {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
          <Text accessibilityRole="header" style={phoneText.display}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{money(item.pricePaise)}</Text>
            {off > 0 ? <Text style={phoneText.mrp}>{money(item.mrpPaise)}</Text> : null}
            {off > 0 ? <Text style={phoneText.off}>{t('phone.shop.percentOff', { percent: off })}</Text> : null}
          </View>
        </View>

        {vm.alternatives.length > 0 ? (
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.detail.otherPacks', { count: vm.alternatives.length })}
            onPress={() => { setPick(null); setSheet(true); }} testID="detail-packs"
            style={({ focused }: Pressed) => [styles.pack, focused ? focusRing : null]}>
            <View style={phoneLayout.grow}>
              <Text style={styles.factLabel}>{t('phone.detail.packSize')}</Text>
              <Text style={phoneText.title}>{item.pack}</Text>
              <Text style={phoneText.meta}>{t('phone.detail.otherPacks', { count: vm.alternatives.length })}</Text>
            </View>
            <Text style={styles.change}>{t('phone.detail.change')}</Text>
            <Icon name="chevron-right" size={18} color={color.text3} />
          </Pressable>
        ) : (
          <View style={styles.pack}>
            <View style={phoneLayout.grow}>
              <Text style={styles.factLabel}>{t('phone.detail.packSize')}</Text>
              <Text style={phoneText.title}>{item.pack}</Text>
            </View>
          </View>
        )}

        {facts.map((f, i) => (
          <Rise key={f.label} index={i}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>{t(f.label)}</Text>
              <Text style={phoneText.body}>{f.value}</Text>
            </View>
          </Rise>
        ))}

        <View style={styles.caution}>
          <Icon name="alert-circle-2" size={18} color={color.attention} />
          <Text style={[phoneText.body, phoneLayout.grow]}>{t('phone.detail.caution')}</Text>
        </View>
        {item.requiresPrescription ? <Note tone="attention" title={t('phone.detail.rxTitle')}>{t('shop.needsRx')}</Note> : null}

        <Button
          label={blocked ? (item.requiresPrescription ? t('phone.detail.rxTitle') : t('shop.outOfStock')) : t('phone.detail.add', { price: money(item.pricePaise) })}
          size="cta" fullWidth disabled={blocked} testID="detail-add"
          onPress={() => { cart.add(item); vm.push({ name: 'cart' }); }}
        />
      </ScrollView>

      <Sheet visible={sheet} title={t('phone.detail.chooseTitle')} subtitle={t('phone.detail.chooseSub')} onClose={() => setSheet(false)} testID="detail-pack-sheet">
        <View role="radiogroup" accessibilityLabel={t('phone.detail.chooseTitle')} style={styles.sheetBody}>
          {vm.alternatives.map((a) => (
            <ChoiceRow key={a.id} label={a.name} meta={[a.pack, a.brand, money(a.pricePaise)].filter(Boolean).join(' · ')}
              selected={pick === a.id} onPress={() => setPick(a.id)} testID={`alt-${a.id}`} />
          ))}
          <Button label={chosen ? t('phone.detail.showThis', { name: chosen.name }) : t('phone.detail.pickOne')} size="cta" fullWidth disabled={!chosen}
            onPress={() => { if (chosen) { vm.chooseAlternative(chosen); setSheet(false); } }} testID="alt-confirm" />
          <Button label={t('phone.close')} variant="ghost" fullWidth onPress={() => setSheet(false)} />
        </View>
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12 },
  cartLink: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s8 },
  art: { height: 150, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  head: { gap: space.s6 },
  brand: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.action },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s10, flexWrap: 'wrap' },
  price: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  pack: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.ruleSoft,
  },
  change: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.action },
  fact: { gap: space.s4 },
  factLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
  caution: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, padding: space.s14, borderRadius: radius.md, backgroundColor: color.attentionBg },
  sheetBody: { gap: space.s10 },
});
