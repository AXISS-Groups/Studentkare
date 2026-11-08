import React from 'react';
import { useT } from '@/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { Illustration } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';

const noop = () => undefined;

const CARDS: ReadonlyArray<{
  illustration: 'illustration-sparkline-bpm' | 'illustration-sparkline-steady' | 'illustration-sparkline-readings' | 'illustration-sparkline-average';
  title: string;
  provenance: string;
  value: string;
  note: string;
}> = [
  { illustration: 'illustration-sparkline-bpm', title: 'Resting heart rate', provenance: 'MEASURED · band', value: '68 bpm', note: 'Down 4 bpm since August' },
  { illustration: 'illustration-sparkline-steady', title: 'SpO₂', provenance: 'MEASURED · oximeter', value: '98%', note: 'Steady, all readings 96–99%' },
  { illustration: 'illustration-sparkline-readings', title: 'Blood pressure', provenance: 'MANUAL · you entered', value: '118 / 76', note: '3 readings only — too few for a trend' },
  { illustration: 'illustration-sparkline-average', title: 'Sleep', provenance: 'ESTIMATE · phone', value: '6h 20m', note: 'Below your own average on exam weeks' },
];

/**
 * Flat, non-functional 1mg-inspired preview of VitalTrends ("Your readings
 * over time") — built from the real design/screens/briefs/VitalTrends.md,
 * its screenshot and HTML source (Tier 1). Part of the illustration-
 * coverage pass Krishna asked for (2026-11-06) after finding this screen
 * genuinely has no built equivalent anywhere in the app yet (checked
 * src/ — AccountDetails/WebAccount/WebMyLabTests/WebPlans/WebReportInsights
 * from the same batch all turned out to already be real screens; this one
 * didn't). Uses all 4 of the brief's sparkline illustrations, one per
 * card, matched to each card's own line shape (bpm trending down,
 * oxygen steady, blood-pressure manual readings, sleep vs. your average).
 * Per AGENTS.md rule 4 (no gamification of body metrics), there is no
 * streak, score, goal or comparison to other people — only the brief's own
 * MEASURED/MANUAL/ESTIMATE provenance labels and its own caution note that
 * a trend is not a diagnosis. Not wired, not replacing anything. See
 * NOTES.md.
 */
export function VitalTrendsPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-vital-trends">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>{t('m2v.tr.title')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={styles.h1}>{t('preview.yourReadingsOverTime')}</Text>
          <Text style={styles.intro}>{t('preview.everyNumberCarriesWhereItCameFromA')}</Text>

          <Text style={[m2Text.eyebrow, styles.sectionGap]}>{t('preview.last90Days')}</Text>

          {CARDS.map((c) => (
            <View key={c.title} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <M2Pill label={c.provenance} tone="neutral" />
              </View>
              <Text style={styles.cardValue}>{c.value}</Text>
              <Illustration name={c.illustration} width={280} height={65} withoutText />
              <Text style={m2Text.meta}>{c.note}</Text>
            </View>
          ))}

          <M2Note tone="attention" icon="shield-alert" title={t('preview.aTrendIsNotADiagnosis')}>{t('preview.theseLinesShowChangeNotCauseNothingHere')}</M2Note>

          <View style={styles.shareBtn}><Text style={styles.shareBtnText}>{t('preview.shareTheseWithAClinician')}</Text></View>

          <Text style={styles.footNote}>{t('preview.measuredComesFromADeviceReadingManualIs')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1560, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s14 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  intro: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * 1.5, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  sectionGap: { marginTop: space.s4 },
  card: { padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface, gap: space.s6, alignItems: 'stretch' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardValue: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  shareBtn: { height: 50, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center', marginTop: space.s4 },
  shareBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  footNote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * 1.5, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
});
