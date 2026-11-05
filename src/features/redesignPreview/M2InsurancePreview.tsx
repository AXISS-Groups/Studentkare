import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2HeroPanel, PillNav, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';

const noop = () => undefined;

const MORE_COVER: ReadonlyArray<{ icon: SkIconName; title: string; note: string }> = [
  { icon: 'heart-pulse-2', title: 'Diabetes cover', note: 'From ~₹[amount]/yr' },
  { icon: 'droplet', title: 'Cancer cover', note: 'From ~₹[amount]/yr' },
  { icon: 'plus', title: 'Personal accident', note: 'From ~₹[amount]/yr' },
  { icon: 'plane', title: 'Travel abroad', note: 'From ~₹[amount]/trip' },
];

/** General "what's usually included" info, deliberately generic — per the
 * brief's own 2026-11-04 founder note, no partner is chosen yet, so this
 * stays non-numeric and makes no claim about a specific policy. No
 * step-by-step "buy now" funnel either, for the same reason. */
const INCLUDED: ReadonlyArray<{ icon: SkIconName; title: string; note: string }> = [
  { icon: 'home-2', title: 'Hospital stays', note: 'Planned admissions and emergencies, once a partner is confirmed' },
  { icon: 'heart-pulse-2', title: 'Ongoing treatment', note: 'Day-care and follow-up support for covered conditions' },
  { icon: 'card-lines', title: 'Simple claims', note: 'One claim process, no separate paperwork per visit' },
  { icon: 'shield-alert', title: "We'll tell you first", note: "You're notified the moment a partner and pricing are live" },
];

/**
 * Flat, non-functional 1mg-inspired preview of M2Insurance. Krishna asked to
 * extend the canvas's style (2026-11-05) past its 4 screens. Content from
 * design/screens/briefs/M2Insurance.md (Tier 2). "More cover" cards are
 * deliberately "Notify me" per the real brief (2026-11-04 note): no partner
 * is chosen yet, so nothing here can be a real purchase flow. Not wired, not
 * replacing the real screen. See NOTES.md.
 */
export function M2InsurancePreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-insurance">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="Insurance" title="Your cover" sub="Policy, claims and your e-card, in one place." icon="shield-check-2" hue="green" compact />
        <View style={styles.body}>
          <M2Card>
            <Text style={m2Text.eyebrow}>CURRENT POLICY</Text>
            <Text style={styles.policyName}>[Student health cover, 2026–27]</Text>
            <Text style={m2Text.body}>Policy no. [number] · Valid till [date]</Text>
            <View style={styles.policyRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="E-card" onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Text style={styles.outlineBtnText}>E-card</Text>
              </Pressable>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="Start a claim" onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
                <Text style={styles.fillBtnText}>Start a claim</Text>
              </Pressable>
            </View>
          </M2Card>

          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>What's usually included</Text>
            {INCLUDED.map((item, i) => (
              <View key={item.title} style={[styles.includedRow, i < INCLUDED.length - 1 ? styles.includedRule : null]}>
                <View style={styles.includedIconTile}><Icon name={item.icon} size={18} color={color.action} /></View>
                <View style={styles.flexShrink}>
                  <Text style={styles.includedTitle}>{item.title}</Text>
                  <Text style={m2Text.meta}>{item.note}</Text>
                </View>
              </View>
            ))}
          </View>

          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>More cover</Text>
            <Text style={[m2Text.meta, styles.sectionGap]}>We're still choosing a partner for these. Register interest — nothing is on sale yet.</Text>
            <View style={styles.grid}>
              {MORE_COVER.map((item) => (
                <M2Card key={item.title} style={styles.coverCard}>
                  <GlossTile icon={item.icon} hue="indigo" size={40} />
                  <Text style={styles.coverTitle}>{item.title}</Text>
                  <Text style={m2Text.meta}>{item.note}</Text>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel={`Notify me — ${item.title}`} onPress={noop}
                    style={({ focused }: PressState) => [styles.notifyBtn, focused ? focusRing : null]}>
                    <Text style={styles.notifyBtnText}>Notify me</Text>
                  </Pressable>
                </M2Card>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="health" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s20 },
  policyName: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  policyRow: { flexDirection: 'row', gap: space.s12, marginTop: space.s12 },
  outlineBtn: { flex: 1, height: 44, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  fillBtn: { flex: 1, height: 44, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  sectionGap: { marginBottom: space.s12 },
  includedRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10 },
  includedRule: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  includedIconTile: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  includedTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  flexShrink: { flex: 1, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  coverCard: { width: '47%', gap: space.s6 },
  coverTitle: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  notifyBtn: { marginTop: space.s6, height: 36, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  notifyBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  navBar: { height: 72 },
});
