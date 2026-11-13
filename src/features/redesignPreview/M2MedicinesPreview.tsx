import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2SearchField, SoftTileGrid, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Medicines (the pharmacy
 * store home). Krishna asked to extend the canvas's style past the 12
 * already built. Content from design/screens/briefs/M2Medicines.md (Tier 2
 * shop; Rule L: refills live on M2Insights, not here — kept as a plain
 * link, not personal data). Not wired, not replacing the real screen. See
 * NOTES.md.
 */
export function M2MedicinesPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-medicines">
      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2SearchField placeholder={t('m2.med.searchLabel')} label="Search medicines" onPress={noop} />

          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.med.rx')} onPress={noop} style={({ focused }: PressState) => [styles.rxCard, focused ? focusRing : null]}>
            <Icon name="doc-upload" size={22} color={color.action} />
            <Text style={styles.rxText}>{t('m2.med.rx')}</Text>
            <Icon name="chevron-right" size={16} color={color.text3} />
          </Pressable>

          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('preview.refillsForYourRegularMedicinesTheyLiveIn')} onPress={noop} style={({ focused }: PressState) => [styles.refillCard, focused ? focusRing : null]}>
            <Icon name="refresh" size={18} color={color.text3} />
            <Text style={m2Text.meta}>{t('preview.refillsForYourRegularMedicinesTheyLiveIn161')}</Text>
            <Icon name="chevron-right" size={16} color={color.text3} />
          </Pressable>

          <Text style={styles.sectionTitle}>{t('m2.med.cats')}</Text>
          <SoftTileGrid items={[
            { key: 'ayurveda', icon: 'sprout', hue: 'green', label: 'Ayurveda', onPress: noop },
            { key: 'stomach', icon: 'stomach', hue: 'amber', label: 'Stomach care', onPress: noop },
            { key: 'sports', icon: 'trend-arrow', hue: 'blue', label: 'Sports and rehab', onPress: noop },
            { key: 'sexual-health', icon: 'heart-3', hue: 'rose', label: 'Sexual health', onPress: noop },
          ]} />

          <Text style={styles.sectionTitle}>{t('preview.lowerPricesThisWeek')}</Text>
          {[{ name: '[Generic] paracetamol 650mg', price: '₹18', mrp: '₹35' }].map((p) => (
            <M2Card key={p.name} style={styles.dealCard}>
              <GlossTile icon="pill-alt" hue="indigo" size={40} />
              <View style={styles.flexShrink}>
                <Text style={styles.dealName}>{p.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.dealPrice}>{p.price}</Text>
                  <Text style={styles.dealMrp}>{p.mrp}</Text>
                </View>
              </View>
              <Icon name="cart" size={18} color={color.action} />
            </M2Card>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  rxCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.actionSoft },
  rxText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  refillCard: { flexDirection: 'row', alignItems: 'center', gap: space.s10, padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface2 },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  dealCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  dealName: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  priceRow: { flexDirection: 'row', gap: space.s8, alignItems: 'center', marginTop: space.s2 },
  dealPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  dealMrp: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textDecorationLine: 'line-through' },
});
