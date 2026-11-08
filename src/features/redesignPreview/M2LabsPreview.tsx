import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2SearchField, M2Tabs, M2Pill, PillNav, m2Text } from '@/design-system/m2';
import type { M2Tab, PressState } from '@/design-system/m2';

const noop = () => undefined;
type Audience = 'everyone' | 'women' | 'men' | 'fitness' | 'concern';
const TABS: readonly M2Tab<Audience>[] = [
  { key: 'everyone', label: 'Everyone' }, { key: 'women', label: 'Women' }, { key: 'men', label: 'Men' },
  { key: 'fitness', label: 'Fitness' }, { key: 'concern', label: 'By concern' },
];

/**
 * Flat, non-functional 1mg-inspired preview of M2Labs' package list (the
 * main lab-tests store screen). Krishna asked to extend the canvas's style
 * past the 12 already built. Content from design/screens/briefs/M2Labs.md
 * (Tier 2 catalogue; the doctor-ordered repeat test is Rule-L'd off this
 * board and lives on M2Insights instead). Not wired, not replacing the real
 * screen. See NOTES.md. (LabComparePreview already covers the "Comparing 2
 * packages" table this screen can open — this is the list above it.)
 */
export function M2LabsPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-labs">
      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2SearchField placeholder={t('preview.searchTestsAndPackages')} label="Search tests and packages" onPress={noop} />
          <M2Tabs label="Packages for" tabs={TABS} current="women" onChange={noop} />
          {[
            { name: "Women's wellness", tests: '58 tests', price: '₹1,299', fasting: 'No fasting' },
            { name: 'PCOS panel', tests: '32 tests', price: '₹1,799', fasting: 'Fasting 10h' },
            { name: 'Iron and anaemia', tests: '6 tests', price: '₹499', fasting: 'No fasting' },
          ].map((pkg) => (
            <M2Card key={pkg.name} style={styles.pkgCard}>
              <View style={styles.pkgRow}>
                <View style={styles.pkgTile}><Icon name="flask" size={22} color={color.action} /></View>
                <View style={styles.flexShrink}>
                  <Text style={styles.pkgName}>{pkg.name}</Text>
                  <Text style={m2Text.meta}>{pkg.tests}</Text>
                </View>
                <Text style={styles.pkgPrice}>{pkg.price}</Text>
              </View>
              <View style={styles.chipRow}>
                <M2Pill label={pkg.fasting} tone="neutral" />
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.compareName', { name: pkg.name })} onPress={noop} style={({ focused }: PressState) => [styles.compareBtn, focused ? focusRing : null]}>
                  <Text style={styles.compareBtnText}>{t('preview.compare')}</Text>
                </Pressable>
              </View>
            </M2Card>
          ))}
          <Text style={m2Text.meta}>{t('m2.labs.note')}</Text>
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="health" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  pkgCard: { gap: space.s12 },
  pkgRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  pkgTile: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  pkgName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  pkgPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareBtn: { height: 32, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  compareBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  navBar: { height: 72 },
});
