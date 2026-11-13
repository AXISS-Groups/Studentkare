import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Accordion } from '@/design-system/Accordion';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

const WHY_RECOMMENDED: ReadonlyArray<{ id: string; title: string; content: string }> = [
  { id: 'why', title: '[Why is this recommended?]', content: '[Your last report flagged a value worth re-checking — this package covers that panel plus the usual annual screens, so one booking covers both.]' },
];

/**
 * Flat, non-functional preview of a lab-package SELECTION screen — the
 * picker/browse page shown BEFORE `LabPackageDetailPreview.tsx`, modelled
 * on Tata 1mg's "Full Body Packages" and Apollo 24|7's "Lab Tests"
 * package-list screens (reference-app screen recordings reviewed
 * 2026-11-11). `LabPackageDetailPreview.tsx` is the detail page after a
 * package is picked; this screen is the grid a student sees first, plus a
 * personalised recommendation card. This repo had no screen covering that
 * browse/compare moment. Built from this gap-analysis pass, not from a
 * `design/screens/briefs/*` entry — this screen has no brief yet.
 *
 * Per AGENTS.md rule 4 (commerce firewall), the "Recommended for you" copy
 * is deliberately bracketed placeholder text, not a real clinical
 * inference, and the "why" explanation never states a diagnosis or a real
 * lab value. Like the other Tier-1-adjacent previews in this folder, this
 * repo treats lab/package content as Tier 1 (safety, consent, identity,
 * clinical values) even on a commerce-adjacent page — flat and non-wired
 * here, but a named-reviewer plan-first pass is required before any of
 * this is built for real. Not wired, not replacing anything. See
 * NOTES.md.
 */
export function LabPackageSelectionPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-lab-package-selection">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <RoundButton icon="arrow-left" label="Back" onPress={noop} />
          <Text style={styles.title}>{t('preview.chooseAHealthPackage')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.grid}>
            <M2Card style={styles.packageCard} testID="preview-lab-package-select-popular">
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

            <M2Card style={styles.packageCard} testID="preview-lab-package-select-custom">
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

            <M2Card style={styles.packageCard} testID="preview-lab-package-select-advanced">
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
          <M2Card style={styles.recommendCard} testID="preview-lab-package-recommended">
            <View style={styles.cardTop}>
              <GlossTile icon="clock" hue="amber" size={44} />
              <Text style={styles.packageName}>{t('preview.basedOnYourLastReportWeSuggestA')}</Text>
            </View>
            <Accordion items={WHY_RECOMMENDED} testID="preview-lab-package-recommend-why" />
            <M2Note tone="info" icon="check-circle-2" title={t('preview.notADiagnosis')}>
              {t('preview.thisSuggestionIsPlaceholderCopyOnlyItDoes')}
            </M2Note>
          </M2Card>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.continue')} onPress={noop}
          style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
          <Text style={styles.fillBtnText}>{t('preview.continue')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1240, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s20, gap: space.s12 },
  grid: { gap: space.s12 },
  packageCard: { gap: space.s8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8 },
  packageName: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  testCount: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  priceStrike: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text3, textDecorationLine: 'line-through' },
  selectBtn: { height: 40, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  selectBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  sectionGap: { marginTop: space.s8 },
  recommendCard: { gap: space.s12 },
  footer: { padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  fillBtn: { height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
