import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StepDiagram } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';

const noop = () => undefined;

const STEPS: ReadonlyArray<{ title: string; description: string }> = [
  { title: '[Tell us what hurts]', description: '[A short form — area, how long, and how it affects your day.]' },
  { title: '[Matched with a physiotherapist]', description: '[Based on what you shared, not a general queue.]' },
  { title: '[Session at your hostel or home]', description: '[They bring what they need; you pick the slot.]' },
];

const BENEFITS: ReadonlyArray<{ icon: SkIconName; title: string; body: string }> = [
  { icon: 'home', title: '[No travel]', body: '[The session comes to your room or a common area on campus.]' },
  { icon: 'person-badge', title: '[Licensed physiotherapists]', body: '[Credentials checked before anyone is matched to you.]' },
  { icon: 'activity', title: '[A plan, not just one visit]', body: '[Exercises between sessions, tracked so nothing is guessed at.]' },
  { icon: 'clock', title: '[Evening and weekend slots]', body: '[Built around a class schedule, not a clinic’s.]' },
];

/**
 * ============================================================================
 * PREVIEW ONLY — NOT A REQUEST TO BUILD A PHYSIOTHERAPY-AT-HOME SERVICE
 * ============================================================================
 * This file previews the UI SHAPE of a "Physiotherapy at Home" landing
 * concept — a pattern that turned up, uncatalogued, in a second close
 * re-watch of the Blinkit/Apollo reference recordings (2026-11-11
 * gap-analysis pass, round 4; see `NOTES.md`). It is a flat,
 * non-functional, static mockup — no booking logic, no physiotherapist
 * matching, no real scheduling, and no clinical content anywhere in this
 * file. "[Book a session]" is `noop`.
 *
 * (a) UI-shape preview only. Nothing here implements, proposes, or
 * commits to StudentKare actually offering a physiotherapy-at-home
 * service. Standing up a new allied-health service line is a product,
 * clinical-governance and compliance decision bigger than this screen —
 * who the physiotherapists are, how their licences are verified, what
 * liability StudentKare carries for an in-person home visit, and how
 * this interacts with the existing Consult/teleconsult flow are all
 * unanswered here. This needs its own named-reviewer decision and a
 * dedicated product/clinical review before any of it is built for real
 * — the same caution already carried by `AISkinScanPreview.tsx` and
 * `SecondOpinionPreview.tsx`, and heavier than the ordinary Tier 1
 * named-reviewer design check CLAUDE.md asks for on an already-approved
 * service.
 *
 * (b) No invented credentials. "[Licensed physiotherapists]" and
 * "[Credentials checked]" are bracketed placeholder copy demonstrating
 * what a real verification claim would need to say, not a claim that any
 * verification exists — same discipline as the "ID verified" badge in
 * `HomeCollectionStatusPreview.tsx`, which is flagged the same way.
 *
 * (c) Built only from approved pieces: `StepDiagram` from
 * `@/design-system` (shared primitive, not re-drawn here); `GlossTile`,
 * `M2Card`, `M2Note`, `RoundButton`, `m2Text` from `@/design-system/m2`;
 * `Icon` from `@/design-system/icons`, limited to `home`, `person-badge`,
 * `activity`, `clock` and `dumbbell` — all confirmed in
 * `design/icons/icon-manifest.json` before use. Tokens only, no hex
 * values.
 *
 * Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No
 * real data anywhere — every name, price and claim is bracketed
 * placeholder copy. No `check-icons.mjs --screen` run and no
 * `design/screens/implementation-map.json` entry, since there is no
 * brief or ticket yet. Not committed, pushed, or opened as a PR.
 */
export function PhysiotherapyAtHomeLandingPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-physiotherapy-at-home-landing">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>[Physiotherapy at Home]</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Note tone="attention" icon="alert-circle-3" testID="preview-physiotherapy-caution-note">
            This is a concept preview, not a live service. Nothing on this screen can be booked yet.
          </M2Note>

          <View style={styles.hero}>
            <GlossTile icon="dumbbell" hue="teal" size={56} iconSize={28} />
            <Text style={styles.heroTitle}>[Recover without leaving campus]</Text>
            <Text style={styles.heroSubtitle}>[A physiotherapist comes to your hostel or a common area — no clinic visit needed.]</Text>
          </View>

          <Text style={m2Text.section}>[How it works]</Text>
          <M2Card>
            <StepDiagram steps={STEPS} testID="preview-physiotherapy-steps" />
          </M2Card>

          <Text style={[m2Text.section, styles.sectionGap]}>[Why students use it]</Text>
          <View style={styles.benefitGrid} testID="preview-physiotherapy-benefit-grid">
            {BENEFITS.map((b) => (
              <M2Card key={b.title} style={styles.benefitCard} testID={`preview-physiotherapy-benefit-${b.title}`}>
                <Icon name={b.icon} size={22} color={color.action} strokeWidth={1.8} />
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitBody}>{b.body}</Text>
              </M2Card>
            ))}
          </View>

          <View style={styles.bookBtn} testID="preview-physiotherapy-book-btn">
            <Text style={styles.bookBtnText}>[Book a session]</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1100, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s20, gap: space.s16 },
  hero: { alignItems: 'center', gap: space.s8, paddingVertical: space.s12 },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  heroSubtitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text2, textAlign: 'center' },
  sectionGap: { marginTop: space.s4 },
  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  benefitCard: { width: '47%', gap: space.s6 },
  benefitTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  benefitBody: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  bookBtn: { height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
