import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Note, M2Pill, M2Tabs, RoundButton, m2Text } from '@/design-system/m2';
import type { M2Tab, PressState } from '@/design-system/m2';

const noop = () => undefined;

type InfoTab = 'uses' | 'benefits' | 'side-effects' | 'safety' | 'faqs';
const TABS: readonly M2Tab<InfoTab>[] = [
  { key: 'uses', label: 'Uses' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'side-effects', label: 'Side effects' },
  { key: 'safety', label: 'Safety advice' },
  { key: 'faqs', label: 'FAQs' },
];

const ASK_AYUSH_CHIPS = ['Directions to use', 'What to avoid', 'Interactions'] as const;

/**
 * Flat, non-functional redesign preview of
 * https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2's MedicineInfo.dc.html —
 * a tabbed single-medicine detail view. Visual only, placeholder copy in
 * brackets kept as the canvas drew it (no field has a real medicine behind
 * it). Built alongside the real M2MedicineInfo (Tier 1,
 * docs/plans/tier1-medicine-info-2026-10-22.md), which this does not touch
 * and does not replace; its actual search → photo → confirm → reviewed-label
 * flow is unrelated to this tab layout. See NOTES.md.
 */
export function M2MedicineInfoPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-medicine-info">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} testID="preview-mi-back" />
        <Text style={m2Text.eyebrow}>MEDICINE INFO</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>[Paracetamol 650 mg tablet]</Text>
          <Text style={m2Text.body}>[Salt name] · [Strip of 15] · [Manufacturer]</Text>
          <View style={styles.pillRow}>
            <M2Pill label="VERIFIED" tone="positive" icon="shield-check" />
            <M2Pill label="SCHEDULE: OTC" tone="neutral" />
          </View>
        </View>

        <M2Tabs label="Medicine information" tabs={TABS} current="side-effects" onChange={noop} testID="preview-mi-tabs" />

        <View>
          <View style={styles.sideEffectRow}>
            <Text style={m2Text.eyebrow}>COMMON</Text>
            <Text style={[m2Text.body, styles.sideEffectBody]}>[Reviewed text from the medicine master appears here, written in plain words.]</Text>
          </View>
          <View style={[styles.sideEffectRow, styles.sideEffectRowLast]}>
            <Text style={m2Text.eyebrow}>SERIOUS: GET HELP</Text>
            <Text style={[m2Text.body, styles.sideEffectBody]}>[Signs that need a doctor or emergency help.]</Text>
          </View>
        </View>

        <M2Note tone="info" icon="shield-check" title="Last verified by [reviewer name, qualification] on [date]" testID="preview-mi-note">
          Information only. Talk to a doctor before taking any medicine.
        </M2Note>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel="Report an error" onPress={noop} style={({ focused }: PressState) => [styles.reportLink, focused ? focusRing : null]}>
          <Text style={styles.reportLinkText}>Report an error</Text>
        </Pressable>

        <View style={styles.askAyush}>
          <Text style={m2Text.eyebrow}>ASK AYUSH</Text>
          <View style={styles.chipRow}>
            {ASK_AYUSH_CHIPS.map((label) => (
              <Pressable key={label} role="button" accessibilityRole="button" accessibilityLabel={label} onPress={noop}
                style={({ focused }: PressState) => [styles.chip, focused ? focusRing : null]}>
                <Text style={styles.chipText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>[₹ price]</Text>
          <Text style={m2Text.meta}>[Pack of 15] · from [partner pharmacy]</Text>
        </View>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel="Add" onPress={noop} style={({ focused }: PressState) => [styles.addBtn, focused ? focusRing : null]}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  body: { flex: 1, paddingHorizontal: space.gutterPhone, gap: space.s16 },
  titleBlock: { gap: space.s8 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.heading, lineHeight: font.size.heading * font.lineHeight.tight, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.text },
  pillRow: { flexDirection: 'row', gap: space.s8, flexWrap: 'wrap' },
  sideEffectRow: { paddingVertical: space.s14, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  sideEffectRowLast: { borderBottomWidth: 0 },
  sideEffectBody: { marginTop: space.s4 },
  reportLink: { alignSelf: 'flex-start' },
  reportLinkText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action, textDecorationLine: 'underline' },
  askAyush: { gap: space.s8 },
  chipRow: { flexDirection: 'row', gap: space.s8 },
  chip: { height: 44, paddingHorizontal: space.s16, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  footer: { height: 80, borderTopWidth: 1, borderTopColor: color.ruleSoft, backgroundColor: color.surface, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s16 },
  price: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), letterSpacing: -0.2, color: color.text },
  addBtn: { height: 48, paddingHorizontal: space.s32, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
