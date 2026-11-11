import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Illustration } from '@/design-system/icons';
import { Icon } from '@/design-system/icons';
import { StatusPill } from '@/design-system';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { SkTone } from '@/design-system';
import type { SkIconName } from '@/design-system/icons';

const noop = () => undefined;

const RESULTS: ReadonlyArray<{ metric: string; tone: SkTone; label: string; note: string }> = [
  { metric: '[Hydration]', tone: 'attention', label: '[Needs attention]', note: 'A pattern this photo shows: [drier-looking patches on the cheeks].' },
  { metric: '[Texture]', tone: 'positive', label: '[Looks typical]', note: 'A pattern this photo shows: [a mostly even surface in this lighting].' },
  { metric: '[Even tone]', tone: 'danger', label: '[Worth a closer look]', note: 'A pattern this photo shows: [uneven tone around the jawline].' },
  { metric: '[Visible pores]', tone: 'neutral', label: '[Not flagged]', note: 'A pattern this photo shows: [nothing notable at this resolution].' },
];

const ROUTINE: ReadonlyArray<{ icon: SkIconName; step: string; category: string; when: 'AM' | 'PM' }> = [
  { icon: 'clock', step: '[Step 1]', category: '[Gentle cleanser]', when: 'AM' },
  { icon: 'shield-check', step: '[Step 2]', category: '[Daily sunscreen]', when: 'AM' },
  { icon: 'clock', step: '[Step 3]', category: '[Moisturiser]', when: 'PM' },
];

/**
 * ============================================================================
 * PREVIEW ONLY — NOT A REQUEST TO BUILD CAMERA OR AI CAPABILITY
 * ============================================================================
 * This file previews the UI SHAPE of what a camera-based AI skin-analysis
 * flow (the kind seen in Apollo 24|7's "Clear Steps" feature) COULD look
 * like inside StudentKare. It is a flat, non-functional, static mockup —
 * no camera capture, no image upload, no AI/ML image analysis, and no real
 * scan logic exist anywhere in this file or elsewhere in the app. The
 * "[Start scan]" button is a non-interactive, disabled-looking `View`
 * (same `noop`/no-op convention this folder already uses for every other
 * non-functional control); the "Results" section is static placeholder
 * content staged as if a scan had already happened, not a working result.
 *
 * (a) UI-shape preview only. Nothing here implements, or proposes
 *     implementing, camera capture or AI image analysis.
 * (b) A REAL version of this feature would be a new biometric/AI-diagnostic
 *     product capability — not a restyle of an existing screen. Before any
 *     real engineering work starts it needs its own dedicated product
 *     review, its own clinical-safety review, and its own privacy review
 *     covering camera and biometric data capture specifically — this is
 *     more than the Tier-1 content-review process this repo uses for
 *     ordinary safety/consent/identity/clinical-value screens (CLAUDE.md),
 *     because the underlying capability (capturing and algorithmically
 *     reading a photo of someone's face) does not exist in this codebase
 *     today and raises its own biometric-data and AI-diagnostic-claim
 *     questions that no existing Tier-1 screen in this repo has had to
 *     answer yet.
 * (c) Built as part of the 2026-11-11 gap-analysis pass, per Krishna's
 *     explicit request to preview this one specific reference pattern —
 *     the request was to preview it, with the caveat above stated up
 *     front, not to build the real thing.
 *
 * Per AGENTS.md rule 4 (no gamification of body metrics) and DESIGN.md §2/§7
 * (never celebrate the body; honest states, no invented numbers, no fake "AI
 * diagnosis"): every result card below is framed as "a pattern this photo
 * shows," never as a diagnosis, a clinical finding, or a medical claim.
 * There is no numeric score out of 100, no comparison to other people, and
 * no streak/history framing. The `illustration-face-oval-guide` used for the
 * capture-guide step is the identity-verification face-framing illustration
 * reused here (it already exists; no skin-scan-specific illustration exists
 * in design/icons/icon-manifest.json, and per CLAUDE.md none was invented).
 * Not wired into navigation, not replacing anything, not committed. See
 * NOTES.md.
 */
export function AISkinScanPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-ai-skin-scan">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>{t('preview.skinCheck')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          {/* 1. Capture */}
          <Text style={m2Text.eyebrow}>{t('preview.capture')}</Text>
          <View style={styles.captureCard}>
            <Illustration name="illustration-face-oval-guide" width={220} height={220} />
            <Text style={styles.captureInstruction}>{t('preview.positionYourFaceInTheFrame')}</Text>
            <Text style={m2Text.meta}>{t('preview.goodEvenLightRemoveGlassesIfYouCan')}</Text>
            <View style={styles.startBtn}>
              <Icon name="camera" size={16} color={color.text3} />
              <Text style={styles.startBtnText}>{t('preview.startScan')}</Text>
            </View>
          </View>

          {/* 2. Results */}
          <Text style={[m2Text.eyebrow, styles.sectionGap]}>{t('preview.results')}</Text>

          <M2Note tone="attention" icon="shield-alert" announce title={t('preview.thisIsNotADiagnosis')}>
            {t('preview.aPhotoPatternIsNotAClinicalFinding')}
          </M2Note>

          {RESULTS.map((r) => (
            <M2Card key={r.metric} style={styles.resultCard}>
              <View style={styles.resultHead}>
                <Text style={styles.resultTitle}>{r.metric}</Text>
                <StatusPill tone={r.tone} small>{r.label}</StatusPill>
              </View>
              <Text style={m2Text.meta}>{r.note}</Text>
            </M2Card>
          ))}

          {/* 3. Suggested routine */}
          <Text style={[m2Text.eyebrow, styles.sectionGap]}>{t('preview.suggestedRoutine')}</Text>
          <Text style={m2Text.meta}>{t('preview.generalCategorySuggestionsOnlyNotAPrescription')}</Text>

          {ROUTINE.map((r) => (
            <M2Card key={r.step} style={styles.routineCard}>
              <GlossTile icon={r.icon} hue="teal" size={40} />
              <View style={styles.flexShrink}>
                <Text style={styles.routineStep}>{r.step}</Text>
                <Text style={styles.routineCategory}>{r.category}</Text>
              </View>
              <M2Pill label={r.when} tone="neutral" />
            </M2Card>
          ))}

          {/* 5. Share action */}
          <View style={styles.shareRow}>
            <Icon name="share-nodes" size={16} color={color.text} />
            <Text style={styles.shareRowText}>{t('preview.shareWithAClinician')}</Text>
          </View>

          <Text style={styles.footNote}>{t('preview.placeholderResultsShownForPreviewOnlyNoScan')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1720, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s14 },
  captureCard: { padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface, gap: space.s8, alignItems: 'center' },
  captureInstruction: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s6, height: 48, width: '100%', borderRadius: radius.full, backgroundColor: color.surface3, marginTop: space.s4 },
  startBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text3 },
  sectionGap: { marginTop: space.s4 },
  resultCard: { gap: space.s6 },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  resultTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  routineCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  routineStep: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  routineCategory: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, height: 50, borderRadius: radius.full, backgroundColor: color.surface3, marginTop: space.s4 },
  shareRowText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  footNote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * 1.5, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
});
