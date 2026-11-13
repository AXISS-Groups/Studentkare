import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Tabs, M2Pill, m2Text } from '@/design-system/m2';
import type { M2Tab, PressState } from '@/design-system/m2';

const noop = () => undefined;
type ViewMode = 'graph' | 'table';
const TABS: readonly M2Tab<ViewMode>[] = [{ key: 'graph', label: 'Graph' }, { key: 'table', label: 'Table' }];
const POINTS = [5.9, 6.1, 6.0, 6.4];

/**
 * Flat, non-functional 1mg-inspired preview of M2Trends. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Trends.md (Tier 1: lab values over time, range
 * bar, doctor's steps). The "Recommended for this result" rail is the same
 * founder-approved, named Rule L exception as on M2InsightsPreview — shown
 * only because HbA1c is out of range, with the same calm framing. Not
 * wired, not replacing the real screen. See NOTES.md.
 */
export function M2TrendsPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-trends">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
          <Text style={styles.title}>{t('preview.hba1c')}</Text>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.bookmark')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="bookmark" size={18} color={color.text2} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <M2Tabs label="View" tabs={TABS} current="graph" onChange={noop} segmented />
          <M2Card>
            <View style={styles.chartRow}>
              {POINTS.map((p, i) => (
                <View key={i} style={[styles.dot, { bottom: ((p - 5.5) / 1.5) * 70 }]} />
              ))}
            </View>
            <View style={styles.badgeRow}>
              <M2Pill label="Above range" tone="attention" />
              <Text style={m2Text.meta}>{t('preview.latest64')}</Text>
            </View>
          </M2Card>

          <M2Card>
            <Text style={styles.sectionTitle}>{t('preview.yourDoctorS3Steps')}</Text>
            <View style={styles.stepRow}><Icon name="walk" size={16} color={color.text3} /><Text style={styles.stepText}>{t('preview.walkAfterLunchAndDinner')}</Text></View>
            <View style={styles.stepRow}><Icon name="bowl" size={16} color={color.text3} /><Text style={styles.stepText}>{t('preview.cutDownOnRefinedSugar')}</Text></View>
            <View style={styles.stepRow}><Icon name="flask" size={16} color={color.text3} /><Text style={styles.stepText}>{t('preview.repeatThePanelIn3Months')}</Text></View>
          </M2Card>

          <View>
            <Text style={styles.sectionTitle}>{t('preview.recommendedForThisResult')}</Text>
            <Text style={m2Text.meta}>{t('preview.shownBecauseHba1cIsOutOfRangeWhy')}</Text>
            <M2Card style={styles.productCard}>
              <GlossTile icon="bottle" hue="green" size={40} />
              <View style={styles.flexShrink}>
                <Text style={styles.productName}>{t('preview.sugarFreeSweetener')}</Text>
                <Text style={m2Text.meta}>{t('preview.aPharmacistChecksAnythingNewAgainstYourMedicines')}</Text>
              </View>
              <Text style={styles.productPrice}>₹149</Text>
            </M2Card>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s16 },
  chartRow: { flexDirection: 'row', justifyContent: 'space-around', height: 90, position: 'relative' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.action },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, marginTop: space.s8 },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginBottom: space.s8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s6 },
  stepText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginTop: space.s8 },
  flexShrink: { flex: 1, minWidth: 0 },
  productName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  productPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
