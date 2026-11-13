import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

type ShareRow = { title: string; note?: string; on: boolean; danger?: boolean };

const SHARED: ReadonlyArray<ShareRow> = [
  { title: 'Vaccination and immunisation status', note: 'They can see what is due', on: true },
  { title: 'Health camp attendance', note: 'Whether you turned up, not findings', on: true },
  { title: 'Emergency alerts', note: 'Told if you raise an SOS', on: true },
  { title: 'Plan and billing', note: 'They pay, so they see the invoice', on: true },
  { title: 'Lab results and reports', on: false },
  { title: 'Consult notes and diagnoses', on: false },
  { title: 'Prescriptions and medicines', on: false },
  { title: 'Mental health, anything at all', note: 'Never available, at any setting', on: false, danger: true },
];

/**
 * Flat, non-functional 1mg-inspired preview of FamilyCircle ("Care
 * circle") — this is StudentKare's own real, already-designed answer to
 * the "family" concept Krishna asked about after watching a Tata 1mg
 * reference video of their family-member switcher. That 1mg pattern (one
 * account seeing another member's full record) conflicts with this
 * product's 18+, student-owned-record architecture (AGENTS.md rule 8), so
 * this screen is built from the real design/screens/briefs/FamilyCircle.md
 * + its screenshot + HTML source instead of the video: a guardian who pays
 * for the plan sees a short, named list of what they're shown — never
 * clinical detail — and every switch is the student's own, never the
 * guardian's to flip. Tier 1 (consent/identity): this is a preview only,
 * not a ticket, so it has not been through the named-reviewer sign-off
 * CLAUDE.md requires before real code — same status as every other Tier-1
 * screen built this session. Not wired, not replacing anything. See
 * NOTES.md.
 */
export function M2FamilyCirclePreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-family-circle">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>{t('sf.fam.header')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <View style={styles.introGap}>
            <Text style={styles.h1}>{t('preview.whatAmmaCanSee')}</Text>
            <Text style={m2Text.body}>{t('preview.aGuardianOnYourPlanSeesThatYou')}</Text>
          </View>

          <M2Card style={styles.guardianCard}>
            <View style={styles.guardianAvatar}><Text style={styles.guardianAvatarText}>{t('preview.a')}</Text></View>
            <View style={styles.flexShrink}>
              <Text style={styles.guardianName}>{t('preview.amma')}</Text>
              <Text style={m2Text.meta}>{t('preview.guardianPaysForCareCircleAdded12Aug')}</Text>
            </View>
          </M2Card>

          <Text style={[m2Text.eyebrow, styles.sectionGap]}>{t('preview.sharedWithHer')}</Text>
          <M2Card style={styles.listCard}>
            {SHARED.map((row, i) => (
              <View key={row.title} style={[styles.row, i < SHARED.length - 1 ? styles.rowRule : null]}>
                <View style={styles.flexShrink}>
                  <Text style={[styles.rowTitle, row.danger ? styles.rowTitleDanger : null]}>{row.title}</Text>
                  {row.note ? <Text style={m2Text.meta}>{row.note}</Text> : null}
                </View>
                <Switch
                  value={row.on}
                  disabled
                  trackColor={{ true: row.danger ? color.dangerFill : color.positive, false: row.danger ? color.dangerRule : color.rule }}
                />
              </View>
            ))}
          </M2Card>

          <M2Note tone="info" icon="shield-check-2" title={t('sf.fam.paysTitle')}>{t('preview.youAreOver18SoTheseSwitchesAre')}</M2Note>

          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.leaveTheCareCircle')} onPress={noop}
            style={({ focused }: PressState) => [styles.leaveBtn, focused ? focusRing : null]}>
            <Text style={styles.leaveBtnText}>{t('preview.leaveTheCareCircle')}</Text>
          </Pressable>
          <Text style={styles.footNote}>{t('preview.leavingKeepsYourRecordsAndYourPlanUntil')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  introGap: { gap: space.s8 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, letterSpacing: -0.4 },
  guardianCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  guardianAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: color.attentionBg, alignItems: 'center', justifyContent: 'center' },
  guardianAvatarText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.attention },
  flexShrink: { flex: 1, minWidth: 0 },
  guardianName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  sectionGap: { marginTop: space.s4 },
  listCard: { paddingVertical: space.s4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  rowTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  rowTitleDanger: { color: color.danger },
  leaveBtn: { height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: color.dangerRule, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  leaveBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  footNote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * 1.5, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
});
