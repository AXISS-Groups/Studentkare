import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

const SLOTS = ['[6 AM – 4 PM]', '[4 – 6 PM]', '[6 – 10 PM]'] as const;

const STEPS = [
  { n: 1, attention: false, text: '[Fasting instruction for this test, from the lab’s own preparation notes.]' },
  { n: 2, attention: false, text: '[What to avoid before collection.]' },
  { n: 3, attention: false, text: '[How to give the sample, if you collect it yourself.]' },
  { n: 4, attention: true, text: 'Keep taking your regular medicines unless your doctor says otherwise.' },
] as const;

/**
 * Flat, non-functional redesign preview of
 * https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2's LabPrep.dc.html — a lab
 * test detail with a "Before your sample" bottom sheet of numbered prep
 * steps. No existing screen matches this one: LabCollection (the brief name
 * closest in spirit) is the Tier-1 partner/staff web run sheet
 * (src/screens/vendor/LabCollectionScreen.tsx), not a student-facing screen,
 * so this preview sits alongside M2Labs/LabPackages' domain instead and has
 * no existing screen to replace. See NOTES.md — this one needs its own brief
 * before it becomes a real ticket.
 */
export function LabPrepPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-lab-prep">
      <View style={styles.base}>
        <View style={styles.header}>
          <RoundButton icon="arrow-left" label="Back" onPress={noop} testID="preview-lab-prep-back" />
        </View>
        <View style={styles.body}>
          <View>
            <Text style={m2Text.eyebrow}>{t('preview.labTest')}</Text>
            <Text style={styles.h1}>{t('preview.testOrPackageName')}</Text>
            <Text style={[m2Text.body, styles.metaGap]}>{t('preview.nTestsSamplesUrineBlood')}</Text>
          </View>
          <View style={styles.slotBlock}>
            <Text style={m2Text.eyebrow}>{t('preview.sampleCollectionBetween')}</Text>
            <View style={styles.slotRow}>
              {SLOTS.map((slot, index) => (
                <Pressable key={slot} role="button" accessibilityRole="button" accessibilityLabel={slot} onPress={noop}
                  style={({ focused }: PressState) => [styles.slot, index === 0 ? styles.slotOn : null, focused ? focusRing : null]}>
                  <Text style={[styles.slotText, index === 0 ? styles.slotTextOn : null]}>{slot}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={m2Text.body}>{t('preview.reportReadyInHoursYouCanChangeThe')}</Text>
          </View>
          <View style={styles.infoRow}>
            <M2Card style={styles.infoCard}>
              <Text style={m2Text.eyebrow}>{t('partner.vlab.camp.col.samples')}</Text>
              <Text style={styles.infoValue}>{t('preview.urineBlood')}</Text>
            </M2Card>
            <M2Card style={styles.infoCard}>
              <Text style={m2Text.eyebrow}>{t('partner.vreg.run.thPrep')}</Text>
              <Text style={styles.infoValue}>{t('preview.fasting812H')}</Text>
            </M2Card>
          </View>
        </View>
      </View>

      <View pointerEvents="none" style={styles.scrim} />

      <View role="dialog" accessibilityLabel={t('preview.preparations')} style={styles.sheet} testID="preview-lab-prep-sheet">
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{t('preview.beforeYourSample')}</Text>
          <RoundButton icon="x" label="Close" onPress={noop} testID="preview-lab-prep-close" />
        </View>
        <View>
          {STEPS.map((step, index) => (
            <View key={step.n} style={[styles.stepRow, index === STEPS.length - 1 ? styles.stepRowLast : null]}>
              <View style={[styles.stepBadge, step.attention ? styles.stepBadgeAttention : null]}>
                <Text style={[styles.stepBadgeText, step.attention ? styles.stepBadgeTextAttention : null]}>{step.n}</Text>
              </View>
              <Text style={[m2Text.body, styles.stepText, step.attention ? styles.stepTextAttention : null]}>{step.text}</Text>
            </View>
          ))}
        </View>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('partner.vrx.returns.policy.understood')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
          <Text style={styles.fillBtnText}>{t('partner.vrx.returns.policy.understood')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  base: { height: '100%' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s16 },
  h1: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: font.size.heading, lineHeight: font.size.heading * font.lineHeight.tight, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.text },
  metaGap: { marginTop: space.s6 },
  slotBlock: { gap: space.s8 },
  slotRow: { flexDirection: 'row', gap: space.s8 },
  slot: { height: 44, paddingHorizontal: space.s14, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  slotOn: { borderWidth: 0, backgroundColor: color.action },
  slotText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text },
  slotTextOn: { fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  infoRow: { flexDirection: 'row', gap: space.s12 },
  infoCard: { flex: 1 },
  infoValue: { marginTop: space.s2, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(19,27,46,0.32)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: space.gutterPhone, paddingTop: space.s20, paddingBottom: space.s24, gap: space.s16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  stepRow: { flexDirection: 'row', gap: space.s12, paddingVertical: space.s14, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  stepRowLast: { borderBottomWidth: 0 },
  stepBadge: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  stepBadgeAttention: { backgroundColor: color.attentionBg },
  stepBadgeText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  stepBadgeTextAttention: { color: color.attention },
  stepText: { flex: 1 },
  stepTextAttention: { color: color.attention },
  fillBtn: { height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
