import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of WebProduct — the web
 * counterpart of M2Product. Content from
 * design/screens/briefs/WebProduct.md (Tier 2). Not wired, not replacing
 * anything. See NOTES.md.
 */
export function WebProductPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="shop">
      <View style={styles.body}>
        <View style={styles.row}>
          <GlossTile icon="flask" hue="indigo" size={96} />
          <View style={styles.flexShrink}>
            <Text style={styles.name}>{t('preview.paracetamol650MgTablet')}</Text>
            <Text style={m2Text.meta}>{t('preview.genericStripOf15Tablets')}</Text>
            <View style={styles.badgeRow}>
              <M2Pill label="Verified listing" tone="positive" icon="star-filled" />
              <View style={styles.badge}><Icon name="truck-2" size={13} color={color.text3} /><Text style={styles.badgeText}>{t('preview.deliveredToYourCampus')}</Text></View>
              <View style={styles.badge}><Icon name="rotate-cw" size={13} color={color.text3} /><Text style={styles.badgeText}>{t('preview.easyReturns')}</Text></View>
            </View>
            <View style={styles.footerRow}>
              <Text style={styles.price}>₹18</Text>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('shop.add')} onPress={noop} style={({ focused }: PressState) => [styles.cartBtn, focused ? focusRing : null]}>
                <Icon name="sparkle" size={14} color={color.onAction} /><Text style={styles.cartBtnText}>{t('shop.add')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.accordion}>
          {['What it is used for', 'Common side effects', 'Do not take with'].map((section) => (
            <Pressable key={section} role="button" accessibilityRole="button" accessibilityLabel={section} onPress={noop} style={({ focused }: PressState) => [styles.accordionRow, focused ? focusRing : null]}>
              <Text style={styles.accordionTitle}>{section}</Text>
              <Icon name="arrow-right" size={16} color={color.text3} />
            </Pressable>
          ))}
        </View>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 880 },
  row: { flexDirection: 'row', gap: space.s20 },
  flexShrink: { flex: 1, minWidth: 0, gap: space.s6 },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10, marginTop: space.s4 },
  badge: { flexDirection: 'row', gap: space.s6, alignItems: 'center' },
  badgeText: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: space.s16, marginTop: space.s12 },
  price: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cartBtn: { flexDirection: 'row', gap: space.s8, height: 44, paddingHorizontal: space.s20, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  cartBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  accordion: { marginTop: space.s8 },
  accordionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.s14, borderTopWidth: 1, borderTopColor: color.ruleSoft, maxWidth: 480 },
  accordionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
