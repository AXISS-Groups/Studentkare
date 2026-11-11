import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { Pressable } from 'react-native';

const noop = () => undefined;

interface PlanProgram {
  id: string;
  icon: SkIconName;
  category: string;
  name: string;
  partner: string;
  price: string;
  blurb: string;
}

const PROGRAMS: readonly PlanProgram[] = [
  { id: 'diabetes', icon: 'droplet', category: '[Diabetes care]', name: '[12-Week Sugar Balance Program]', partner: '[Partner name — not yet chosen]', price: '₹[2,499]/mo', blurb: '[Coach check-ins, a glucose log reviewed weekly, and a diet plan — not a substitute for your prescribed care.]' },
  { id: 'weight', icon: 'activity', category: '[Weight management]', name: '[Guided Weight Program]', partner: '[Partner name — not yet chosen]', price: '₹[1,999]/mo', blurb: '[Weekly coach calls and a tracked plan. No crash diets, no promised number.]' },
  { id: 'stress', icon: 'brain-2', category: '[Mental wellbeing]', name: '[Student Stress Support Program]', partner: '[Partner name — not yet chosen]', price: '₹[1,499]/mo', blurb: '[Structured sessions with a counsellor, not a one-off chat.]' },
  { id: 'heart', icon: 'heart-plus', category: '[Heart health]', name: '[Heart Risk Reduction Program]', partner: '[Partner name — not yet chosen]', price: '₹[2,999]/mo', blurb: '[For a family history of heart disease — lifestyle coaching alongside your doctor, not instead of them.]' },
];

/**
 * ============================================================================
 * PREVIEW ONLY — NOT A REQUEST TO BUILD A HEALTH-PLANS MARKETPLACE
 * ============================================================================
 * This file previews the UI SHAPE of a "Health Plans" marketplace tab — a
 * pattern from 1mg's reference recording (condition-management programs,
 * Twin Health/Care24-style) flagged as a genuine gap in the 2026-11-11
 * video-reference re-audit (see `NOTES.md`). Flat, non-functional, static
 * mockup — no enrollment, no partner integration, no payment, no real
 * program content. "[Learn more]" / "[Enroll]" are `noop`.
 *
 * (a) UI-shape preview only. This is distinct from `InsurancePlanBuilderPreview.tsx`
 * (that one is insurance underwriting/coverage comparison; this one is
 * third-party condition-management coaching programs — a different business
 * relationship). Standing this up for real means picking and vetting actual
 * partners, defining what StudentKare is liable for in a coaching
 * relationship it doesn't directly deliver, and deciding how/whether this
 * interacts with the existing teleconsult and chronic-care flows — a
 * product + business-development + clinical-governance decision, not a UI
 * one. Same weight as the caution already carried by
 * `PhysiotherapyAtHomeLandingPreview.tsx` and `AISkinScanPreview.tsx`.
 *
 * (b) No real partner, price, or outcome claim anywhere. Every partner name
 * is explicitly bracketed "[Partner name — not yet chosen]", matching the
 * same "no partner is chosen yet" discipline already used on
 * `M2InsurancePreview`. No program promises a number (no "lose X kg", no
 * "lower HbA1c by Y%") — per AGENTS.md's no-gamification-of-body-metrics
 * rule, which extends naturally to not overpromising outcomes from a program
 * StudentKare doesn't clinically run itself.
 *
 * (c) Built only from approved pieces: `GlossTile`, `M2Card`, `M2Note`,
 * `M2Pill`, `RoundButton`, `m2Text` from `@/design-system/m2`; `Icon` from
 * `@/design-system/icons`, limited to `droplet`, `activity`, `brain-2`,
 * `heart-plus`, `arrow-left`, `chevron-right` — all confirmed in
 * `design/icons/icon-manifest.json` before use. Tokens only, no hex values.
 *
 * (d) A sibling gap from the same re-audit — a loyalty/rewards coin-balance
 * card (Tata 1mg's NeuCoins pattern) — is NOT built here or anywhere else.
 * `design/icons/icon-manifest.json` has no coin/reward/medal/token icon at
 * all (checked across `icons`, `icons3d` and `other`/illustrations), and
 * CLAUDE.md's rule is explicit: never invent an icon, never substitute a
 * look-alike silently. That one stays blocked until a real coin/reward icon
 * is added to the manifest in its own PR, per CLAUDE.md's icon-addition
 * rule — not solved here.
 *
 * Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
 * data anywhere — every name, price and claim is bracketed placeholder
 * copy. No `check-icons.mjs --screen` run and no
 * `design/screens/implementation-map.json` entry, since there is no brief
 * or ticket yet. Not committed, pushed, or opened as a PR.
 */
export function HealthPlansMarketplacePreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-health-plans-marketplace">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>[Health Plans]</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Note tone="attention" icon="alert-circle-3" testID="preview-health-plans-caution-note">
            This is a concept preview. No program here is real, and nothing can be enrolled in yet.
          </M2Note>

          <Text style={styles.heroSubtitle}>[Structured, coach-led programs for ongoing conditions — alongside your doctor, never instead of them.]</Text>

          {PROGRAMS.map((program) => (
            <M2Card key={program.id} testID={`preview-health-plan-${program.id}`}>
              <View style={styles.programRow}>
                <GlossTile icon={program.icon} hue="teal" size={44} iconSize={22} />
                <View style={styles.programInfo}>
                  <M2Pill label={program.category} tone="neutral" />
                  <Text style={styles.programName}>{program.name}</Text>
                  <Text style={styles.programPartner}>{program.partner}</Text>
                  <Text style={styles.programBlurb}>{program.blurb}</Text>
                </View>
              </View>
              <View style={styles.programFooter}>
                <Text style={styles.programPrice}>{program.price}</Text>
                <View style={styles.ctaRow}>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel={`Learn more about ${program.name}`} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                    <Text style={styles.outlineBtnText}>[Learn more]</Text>
                  </Pressable>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel={`Enroll in ${program.name}`} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
                    <Text style={styles.fillBtnText}>[Enroll]</Text>
                    <Icon name="chevron-right" size={14} color={color.onAction} />
                  </Pressable>
                </View>
              </View>
            </M2Card>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1180, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s20, gap: space.s12 },
  heroSubtitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  programRow: { flexDirection: 'row', gap: space.s12 },
  programInfo: { flex: 1, gap: space.s4 },
  programName: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  programPartner: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3, fontStyle: 'italic' },
  programBlurb: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2, marginTop: space.s2 },
  programFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s12 },
  programPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  ctaRow: { flexDirection: 'row', gap: space.s8 },
  outlineBtn: { height: 36, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.ruleStrong, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  fillBtn: { height: 36, paddingHorizontal: space.s12, borderRadius: radius.full, backgroundColor: color.action, flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
