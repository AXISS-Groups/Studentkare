import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Accordion } from '@/design-system/Accordion';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

const WHY_RECOMMENDED: ReadonlyArray<{ id: string; title: string; content: string }> = [
  { id: 'why', title: '[Why is this recommended?]', content: '[Your last report flagged a value worth re-checking — this package covers that panel plus the usual annual screens, so one booking covers both.]' },
];

/**
 * Flat, non-functional 1mg-inspired preview of WebLabPackageSelection —
 * the web counterpart of `LabPackageSelectionPreview.tsx` (mobile). Part
 * of the 2026-11-11 gap-analysis pass: the real `studentweb` screen
 * `WebMyLabTestsView.tsx` is Tier-1-approved for tracking the student's
 * OWN existing lab orders/results, not for browsing/picking a NEW package
 * — this preview covers that separate browse moment, laid out for desktop
 * inside the real `StudentWebShell` rather than a phone-frame stack. Not
 * wired, not replacing anything. No brief yet — same footing as the other
 * unticketed previews in this folder. See NOTES.md.
 */
export function WebLabPackageSelectionPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="lab-tests">
      <View style={styles.body}>
        <Text style={styles.title}>{t('preview.chooseAHealthPackage')}</Text>

        <View style={styles.grid}>
          <M2Card style={styles.packageCard} testID="preview-web-lab-package-select-popular">
            <View style={styles.cardTop}>
              <GlossTile icon="flask-2" hue="indigo" size={48} />
              <M2Pill label="[POPULAR]" tone="attention" icon="heart" />
            </View>
            <Text style={styles.packageName}>{t('preview.popularPackage')}</Text>
            <Text style={m2Text.meta}>{t('preview.theMostBookedAnnualScreenAmongStudentsOn')}</Text>
            <Text style={styles.testCount}>{t('preview.45Tests')}</Text>
            <View style={styles.priceRow}>
              <Text style={m2Text.price}>₹999</Text>
              <Text style={styles.priceStrike}>₹1,999</Text>
              <M2Pill label="[50% off]" tone="positive" icon="percent" />
            </View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.selectPopularPackage')} onPress={noop}
              style={({ focused }: PressState) => [styles.selectBtn, focused ? focusRing : null]}>
              <Text style={styles.selectBtnText}>{t('preview.select')}</Text>
            </Pressable>
          </M2Card>

          <M2Card style={styles.packageCard} testID="preview-web-lab-package-select-custom">
            <View style={styles.cardTop}>
              <GlossTile icon="scan" hue="teal" size={48} />
            </View>
            <Text style={styles.packageName}>{t('preview.buildYourOwn')}</Text>
            <Text style={m2Text.meta}>{t('preview.scanBuildPickOnlyTheTestsYouNeed')}</Text>
            <Text style={styles.testCount}>{t('preview.chooseFrom120Tests')}</Text>
            <View style={styles.priceRow}>
              <Text style={m2Text.price}>{t('preview.from199')}</Text>
            </View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.selectBuildYourOwn')} onPress={noop}
              style={({ focused }: PressState) => [styles.selectBtn, focused ? focusRing : null]}>
              <Text style={styles.selectBtnText}>{t('preview.select')}</Text>
            </Pressable>
          </M2Card>

          <M2Card style={styles.packageCard} testID="preview-web-lab-package-select-advanced">
            <View style={styles.cardTop}>
              <GlossTile icon="flask" hue="violet" size={48} />
              <M2Pill label="[NEW]" tone="action" icon="heart-plus" />
            </View>
            <Text style={styles.packageName}>{t('preview.fullBodyAdvanced')}</Text>
            <Text style={m2Text.meta}>{t('preview.aDeeperPanelForStudentsWithAFamily')}</Text>
            <Text style={styles.testCount}>{t('preview.78Tests')}</Text>
            <View style={styles.priceRow}>
              <Text style={m2Text.price}>₹1,499</Text>
              <Text style={styles.priceStrike}>₹2,799</Text>
              <M2Pill label="[46% off]" tone="positive" icon="percent" />
            </View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.selectFullBodyAdvanced')} onPress={noop}
              style={({ focused }: PressState) => [styles.selectBtn, focused ? focusRing : null]}>
              <Text style={styles.selectBtnText}>{t('preview.select')}</Text>
            </Pressable>
          </M2Card>
        </View>

        <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.recommendedForYou')}</Text>
        <M2Card style={styles.recommendCard} testID="preview-web-lab-package-recommended">
          <View style={styles.cardTop}>
            <GlossTile icon="clock" hue="amber" size={44} />
            <Text style={styles.packageName}>{t('preview.basedOnYourLastReportWeSuggestA')}</Text>
          </View>
          <Accordion items={WHY_RECOMMENDED} testID="preview-web-lab-package-recommend-why" />
          <M2Note tone="info" icon="check-circle-2" title={t('preview.notADiagnosis')}>
            {t('preview.thisSuggestionIsPlaceholderCopyOnlyItDoes')}
          </M2Note>
        </M2Card>

        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 880 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  grid: { flexDirection: 'row', gap: space.s16 },
  packageCard: { flex: 1, gap: space.s8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8 },
  packageName: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  testCount: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  priceStrike: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text3, textDecorationLine: 'line-through' },
  selectBtn: { height: 40, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  selectBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  sectionGap: { marginTop: space.s8 },
  recommendCard: { gap: space.s12 },
});
