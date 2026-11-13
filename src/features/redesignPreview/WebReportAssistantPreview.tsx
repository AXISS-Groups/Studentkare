import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph, Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { WebShellPreview } from './WebShellPreview';

const noop = () => undefined;

interface SystemRow { icon: SkIconName; label: string; ratio: string }
const OUT_OF_RANGE: ReadonlyArray<SystemRow> = [
  { icon: 'heart-pulse', label: '[Heart & lipids]', ratio: '3/9' },
  { icon: 'droplet-half', label: '[Vitamins]', ratio: '2/3' },
  { icon: 'lens', label: '[Liver]', ratio: '1/11' },
];
const WITHIN_RANGE: ReadonlyArray<SystemRow> = [
  { icon: 'kidney', label: '[Kidney]', ratio: '8' },
  { icon: 'kidneys', label: '[Thyroid]', ratio: '3' },
];

/**
 * Flat, non-functional 1mg-inspired preview of WebReportAssistant — "Ayush
 * report explainer", per design/screens/briefs/WebReportAssistant.md
 * (**Tier 1** — clinical content). Per AGENTS.md/CLAUDE.md, a Tier-1 screen
 * needs a named reviewer's sign-off before real code; this is a flat,
 * display-only mockup of the brief's exact copy, not that sign-off — same
 * caveat as every other Tier-1 preview in this folder.
 *
 * This is the one screen in the batch that is also clinical-AI content, the
 * same caution class as M2MedicineInfo's "no AI writes monograph text"
 * rule. The real brief's own copy already draws that line and is kept
 * verbatim, not softened or extended: Ayush explains a clinician-reviewed
 * report ("From your report and Dr. Reddy's summary. I explain; I don't
 * diagnose or prescribe.") and routes anything that needs a decision to a
 * real consult ("Book a consult to go over it") rather than answering it
 * itself. No new clinical claim, numeric range, or recommendation is
 * invented beyond what the brief's screenshot already shows. Not wired,
 * not replacing anything, no chat logic implied as working. See NOTES.md.
 */
export function WebReportAssistantPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="report-insights">
      <View style={styles.banner}>
        <View style={styles.flexShrink}>
          <Text style={styles.bannerTitle}>{t('preview.completeHealthPanelDate', { date: '[22 Sep 2026]' })}</Text>
          <M2Pill label={t('preview.reviewedByDoctorName', { doctor: '[Dr. name]' })} tone="positive" icon="check" />
        </View>
        <Text style={styles.bannerStat}>{t('preview.xOfYSystemsToDiscuss', { x: 5, y: 13 })}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={m2Text.eyebrow}>{t('preview.outOfRangeCount', { count: OUT_OF_RANGE.length })}</Text>
          {OUT_OF_RANGE.map((s) => (
            <View key={s.label} style={styles.sysRow}>
              <Icon name={s.icon} size={18} color={color.attention} />
              <Text style={[styles.sysLabel, styles.flexShrink]}>{s.label}</Text>
              <Text style={m2Text.meta}>{s.ratio}</Text>
            </View>
          ))}
          <Text style={[m2Text.eyebrow, styles.sectionGap]}>{t('preview.withinRangeCount', { count: WITHIN_RANGE.length })}</Text>
          {WITHIN_RANGE.map((s) => (
            <View key={s.label} style={styles.sysRow}>
              <Icon name={s.icon} size={18} color={color.positive} />
              <Text style={[styles.sysLabel, styles.flexShrink]}>{s.label}</Text>
              <Text style={m2Text.meta}>{s.ratio}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chatPanel}>
          <View style={styles.chatHead}>
            <Glyph name="ayush-orb-5" size={28} />
            <Text style={styles.chatTitle}>{t('preview.ayushLabel')}</Text>
            <M2Pill label={t('preview.ready')} tone="positive" />
          </View>
          <View style={styles.userBubble}>
            <Text style={styles.userBubbleText}>{t('preview.whyAreHdlAndTriglyceridesFlagged')}</Text>
          </View>
          <View style={styles.ayushBubble}>
            <Text style={styles.ayushBubbleText}>{t('preview.hdlTriglyceridesExplainerSample')}</Text>
            <Text style={[styles.ayushBubbleMeta, styles.sourceLine]}>{t('preview.fromYourReportAndDoctorsSummary')}</Text>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.bookAConsultToGoOverIt')} onPress={noop}
              style={({ focused }: PressState) => [styles.consultBtn, focused ? focusRing : null]}>
              <Text style={styles.consultBtnText}>{t('preview.bookAConsultToGoOverIt')}</Text>
            </Pressable>
          </View>
          <M2Note tone="neutral" icon="shield-half">
            {t('preview.betaCrisisSupportIsFree')}
          </M2Note>
        </View>
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.s20, backgroundColor: color.heroBg, margin: space.s24, marginBottom: 0, borderRadius: radius.lg, gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  bannerTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, marginBottom: space.s6 },
  bannerStat: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  row: { flexDirection: 'row', gap: space.s20, padding: space.s24, alignItems: 'flex-start' },
  main: { flex: 1, gap: space.s6 },
  sectionGap: { marginTop: space.s16 },
  sysRow: { flexDirection: 'row', gap: space.s10, alignItems: 'center', paddingVertical: space.s10, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  sysLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  chatPanel: { width: 360, gap: space.s12, padding: space.s20, borderRadius: radius.lg, backgroundColor: color.heroBg },
  chatHead: { flexDirection: 'row', gap: space.s8, alignItems: 'center' },
  chatTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', padding: space.s12, borderRadius: radius.md, backgroundColor: color.heroCurrent },
  userBubbleText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
  ayushBubble: { gap: space.s8, padding: space.s14, borderRadius: radius.md, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  ayushBubbleText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.onHero },
  ayushBubbleMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  sourceLine: { fontStyle: 'italic' },
  consultBtn: { alignSelf: 'flex-start', height: 36, paddingHorizontal: space.s14, borderRadius: radius.full, backgroundColor: color.heroCurrent, alignItems: 'center', justifyContent: 'center' },
  consultBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
});
