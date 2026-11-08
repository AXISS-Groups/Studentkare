import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Product. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Product.md — Tier 1 (clinical content: dosage,
 * side effects, interactions, generic substitution; a plan + named-reviewer
 * step is required before any of this is real, same caution as
 * M2MedicineInfoPreview). Not wired, not replacing the real screen. See
 * NOTES.md.
 */
export function M2ProductPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-product">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <GlossTile icon="flask" hue="indigo" size={64} />
          <Text style={styles.name}>{t('preview.paracetamol650MgTablet')}</Text>
          <Text style={m2Text.meta}>{t('preview.genericStripOf15Tablets')}</Text>

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>{t('clinRx.f.quantity')}</Text>
            <View style={styles.stepper}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.prod.fewer')} onPress={noop} style={({ focused }: PressState) => [styles.stepBtn, focused ? focusRing : null]}>
                <Icon name="minus" size={16} color={color.action} />
              </Pressable>
              <Text style={styles.qtyValue}>1</Text>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.prod.more')} onPress={noop} style={({ focused }: PressState) => [styles.stepBtn, focused ? focusRing : null]}>
                <Icon name="plus" size={16} color={color.action} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t('preview.oftenAddedWithThis')}</Text>
          <Text style={m2Text.meta}>{t('preview.nothingHereIsSuggestedFromYourReports')}</Text>
          {[{ name: '[ORS rehydration sachet]', price: '₹20' }, { name: '[Vitamin C effervescent]', price: '₹99' }].map((item) => (
            <M2Card key={item.name} style={styles.companionCard}>
              <GlossTile icon="flask" hue="teal" size={36} />
              <Text style={styles.companionName}>{item.name}</Text>
              <Text style={styles.companionPrice}>{item.price}</Text>
            </M2Card>
          ))}

          {['What it is used for', 'Common side effects', 'Do not take with'].map((section) => (
            <Pressable key={section} role="button" accessibilityRole="button" accessibilityLabel={section} onPress={noop} style={({ focused }: PressState) => [styles.accordionRow, focused ? focusRing : null]}>
              <Text style={styles.accordionTitle}>{section}</Text>
              <Icon name="chevron-down" size={16} color={color.text3} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerPrice}>₹18</Text>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('shop.add')} onPress={noop} style={({ focused }: PressState) => [styles.cartBtn, focused ? focusRing : null]}>
          <Icon name="cart" size={16} color={color.onAction} />
          <Text style={styles.cartBtnText}>{t('shop.add')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.gutterPhone, gap: space.s12 },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  stepBtn: { width: 32, height: 32, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, minWidth: 16, textAlign: 'center' },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s8 },
  companionCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  companionName: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text },
  companionPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  accordionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.s14, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  accordionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  footerPrice: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cartBtn: { flex: 1, flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  cartBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
