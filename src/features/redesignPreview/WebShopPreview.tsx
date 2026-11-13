import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2SearchField, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;
const CATEGORIES: ReadonlyArray<{ icon: 'bottle-2' | 'jar' | 'pipette' | 'cup'; label: string }> = [
  { icon: 'bottle-2', label: 'Syrups' }, { icon: 'jar', label: 'Tablets' }, { icon: 'pipette', label: 'Drops' }, { icon: 'cup', label: 'Supplements' },
];

/**
 * Flat, non-functional 1mg-inspired preview of WebShop — the web
 * counterpart of M2Medicines, inside the real `StudentWebShell`. Content
 * from design/screens/briefs/WebShop.md (Tier 2). Not wired, not
 * replacing anything. See NOTES.md.
 */
export function WebShopPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="shop">
      <View style={styles.body}>
        <M2SearchField placeholder={t('m2.med.searchLabel')} label="Search medicines" onPress={noop} />
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.label} role="button" accessibilityRole="button" accessibilityLabel={c.label} onPress={noop} style={({ focused }: PressState) => [styles.catTile, focused ? focusRing : null]}>
              <Icon name={c.icon} size={22} color={color.action} />
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('preview.lowerPricesThisWeek')}</Text>
        <View style={styles.productGrid}>
          {[{ name: '[Generic] paracetamol 650mg', price: '₹18', mrp: '₹35' }, { name: '[Generic] ORS sachets', price: '₹20', mrp: '₹40' }, { name: '[Vitamin D3 60K]', price: '₹89', mrp: '₹149' }].map((p) => (
            <M2Card key={p.name} style={styles.productCard}>
              <GlossTile icon="pill-alt" hue="indigo" size={48} />
              <Text style={styles.productName}>{p.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{p.price}</Text>
                <Text style={styles.productMrp}>{p.mrp}</Text>
              </View>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.addName', { name: p.name })} onPress={noop} style={({ focused }: PressState) => [styles.cartBtn, focused ? focusRing : null]}>
                <Icon name="shopping-bag" size={14} color={color.onAction} /><Text style={styles.cartBtnText}>{t('ident.badge.add')}</Text>
              </Pressable>
            </M2Card>
          ))}
        </View>
        <Text style={m2Text.meta}>{t('preview.pricesShownAreCheckedAtYourCurrentCampus')}</Text>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 920 },
  catRow: { flexDirection: 'row', gap: space.s16 },
  catTile: { flex: 1, gap: space.s6, alignItems: 'center', padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface },
  catLabel: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  productGrid: { flexDirection: 'row', gap: space.s16 },
  productCard: { flex: 1, gap: space.s6, alignItems: 'flex-start' },
  productName: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  priceRow: { flexDirection: 'row', gap: space.s8, alignItems: 'center' },
  productPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  productMrp: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textDecorationLine: 'line-through' },
  cartBtn: { flexDirection: 'row', gap: space.s6, height: 34, paddingHorizontal: space.s12, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center', marginTop: space.s4 },
  cartBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
