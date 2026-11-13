import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { StatusPill } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

const ESTIMATES: ReadonlyArray<{ name: string; range: string }> = [
  { name: '[Laparoscopic gallbladder removal]', range: '[₹85,000 – ₹1,40,000]' },
  { name: '[Knee arthroscopy]', range: '[₹1,10,000 – ₹1,90,000]' },
  { name: '[Appendix removal]', range: '[₹65,000 – ₹1,05,000]' },
];

/**
 * Flat, non-functional preview of a "surgery second opinion + cost
 * estimator" flow, modelled on the Surgery section of a reference app
 * (Apollo 24|7) per Krishna's explicit request (2026-11-11 gap-analysis
 * pass) to see what this COULD look like if StudentKare ever built it.
 *
 * Three things up front, stated plainly because this is a sensitive,
 * big-ticket preview:
 *
 * (a) This is a UI-shape preview only — layout, copy and component choices,
 *     nothing else. Nothing here is wired, nothing here reads or writes
 *     real data, and nothing here is a built feature.
 *
 * (b) A real "second opinion" / surgical cost-estimator feature is a NEW
 *     CLINICAL SERVICE LINE — surgical referrals and second-opinion review
 *     are not a UI pattern to restyle, they are a new category of clinical
 *     work this platform does not currently do. Before any real engineering
 *     starts this needs an explicit product + clinical-governance decision
 *     covering, at minimum: who reviews a submitted request (which
 *     clinician, what credentialing), what liability and consent language
 *     is required of the student before a request is even accepted, and
 *     how the cost ranges shown would actually be sourced (which hospitals,
 *     how current, who is accountable for them being right). That is a
 *     different, heavier bar than the named-reviewer content check that
 *     gates an ordinary Tier 1 screen — this screen does not claim that
 *     bar has been cleared.
 *
 * (c) Built 2026-11-11 as part of a gap-analysis pass, at Krishna's
 *     explicit request to preview this direction — this caveat is stated
 *     up front for exactly that reason. Not wired, not replacing anything,
 *     alongside the real screens. See NOTES.md.
 */
export function SecondOpinionPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-second-opinion">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('preview.getASecondOpinion')}</Text>
        </View>

        <View style={styles.body}>
          <M2Note tone="attention" icon="shield-check" title={t('preview.thisIsAPreviewNotABuiltFeature')}>
            {t('preview.aRealSecondOpinionAndCostEstimatorWould')}
          </M2Note>

          <View style={styles.introRow}>
            <GlossTile icon="doctor" hue="indigo" size={48} />
            <Text style={styles.introText}>{t('preview.ifADoctorHasRecommendedSurgeryASecond')}</Text>
          </View>

          <Text style={m2Text.section}>{t('preview.describeYourDiagnosisOrPlannedProcedure')}</Text>
          <M2Card style={styles.textareaCard}>
            <Text style={styles.textareaPlaceholder}>{t('preview.eGMyDoctorRecommendedGallbladderRemovalAfter')}</Text>
          </M2Card>

          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.uploadExistingReportsOptional')} onPress={noop} style={({ focused }: PressState) => [styles.uploadRow, focused ? focusRing : null]}>
            <Icon name="cloud-upload" size={20} color={color.action} />
            <View style={styles.uploadWords}>
              <Text style={styles.uploadLabel}>{t('preview.uploadExistingReportsOptional2')}</Text>
              <Text style={m2Text.meta}>{t('preview.scansLabResultsOrADoctorSNote')}</Text>
            </View>
            <Icon name="doc-upload" size={18} color={color.text3} />
          </Pressable>

          <View style={styles.submitBlock}>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.submitForReview')} onPress={noop} style={({ focused }: PressState) => [styles.submitBtn, focused ? focusRing : null]}>
              <Text style={styles.submitBtnText}>{t('preview.submitForReview2')}</Text>
            </Pressable>
            <M2Note tone="info" icon="doctor-alt">
              {t('preview.aHumanClinicianReviewsEveryRequestThisIs')}
            </M2Note>
          </View>

          <View style={styles.divider} />

          <Text style={m2Text.section}>{t('preview.estimateSurgeryCost')}</Text>
          <M2Note tone="info" icon="percent">
            {t('preview.theseAreIllustrativeRangesOnlyNotAQuote')}
          </M2Note>
          {ESTIMATES.map((item) => (
            <M2Card key={item.name} style={styles.estimateCard}>
              <GlossTile icon="hospital" hue="teal" size={40} />
              <View style={styles.estimateWords}>
                <Text style={styles.estimateName}>{item.name}</Text>
                <Text style={styles.estimateRange}>{item.range}</Text>
              </View>
            </M2Card>
          ))}

          <View style={styles.divider} />

          <Text style={m2Text.section}>{t('preview.yourRequest')}</Text>
          <M2Card style={styles.statusCard}>
            <View style={styles.statusTop}>
              <Icon name="stethoscope-2" size={18} color={color.text2} />
              <Text style={styles.statusProcedure}>{t('preview.laparoscopicGallbladderRemovalSubmitted')}</Text>
            </View>
            <StatusPill tone="attention">{t('preview.pendingReview')}</StatusPill>
            <View style={styles.statusEtaRow}>
              <Icon name="check-circle-2" size={14} color={color.text3} />
              <Text style={m2Text.meta}>{t('preview.typicallyReviewedWithin35BusinessDays')}</Text>
            </View>
          </M2Card>

          <RoundButton icon="stethoscope" label="View review status" onPress={noop} testID="second-opinion-status-shortcut" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { padding: space.gutterPhone },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s32, gap: space.s16 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface },
  introText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  textareaCard: { minHeight: 96, justifyContent: 'flex-start' },
  textareaPlaceholder: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  uploadWords: { flex: 1, gap: space.s2 },
  uploadLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  submitBlock: { gap: space.s12, marginTop: space.s4 },
  submitBtn: { height: 50, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  divider: { height: 1, backgroundColor: color.ruleSoft, marginVertical: space.s4 },
  estimateCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  estimateWords: { flex: 1, gap: space.s2 },
  estimateName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  estimateRange: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  statusCard: { gap: space.s10, alignItems: 'flex-start' },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  statusProcedure: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  statusEtaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
});
