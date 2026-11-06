import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2HeroPanel, PillNav, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Reminders. Krishna asked
 * to extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Reminders.md (Tier 1: medicine names and doses).
 * Per the brief's own rules, kept here too: no adherence score or streak,
 * a skip is never shown as taken, a reminder never names the medicine.
 * Not wired, not replacing the real screen. See NOTES.md.
 */
export function M2RemindersPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-reminders">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="My health" title="Medicines today" sub="1 of 2 doses left today." icon="pill-3" hue="teal" compact />
        <View style={styles.body}>
          <Text style={m2Text.meta}>Nothing here is scored, and no one is told if you miss one.</Text>

          <M2Card>
            <View style={styles.medRow}>
              <GlossTile icon="pill-3" hue="teal" size={44} />
              <View style={styles.flexShrink}>
                <Text style={styles.medName}>[Paracetamol 650 mg]</Text>
                <Text style={m2Text.meta}>1 of 2 taken today</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="Taken" onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
                <Icon name="check" size={16} color={color.onAction} /><Text style={styles.fillBtnText}>Taken</Text>
              </Pressable>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="Skip" onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="skip-forward" size={16} color={color.action} /><Text style={styles.outlineBtnText}>Skip</Text>
              </Pressable>
            </View>
            <View style={styles.remindRow}>
              {[{ icon: 'bell-off' as const, label: 'Off' }, { icon: 'bell' as const, label: '8 AM' }, { icon: 'bell' as const, label: '2 PM' }].map((chip) => (
                <View key={chip.label} style={styles.remindChip}>
                  <Icon name={chip.icon} size={13} color={color.text3} /><Text style={styles.remindChipText}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </M2Card>

          <Pressable role="link" accessibilityRole="link" accessibilityLabel="Water reminders" onPress={noop} style={({ focused }: PressState) => [styles.waterRow, focused ? focusRing : null]}>
            <Icon name="glass" size={18} color={color.serviceSkyInk} />
            <Text style={styles.waterText}>Water reminders</Text>
            <Icon name="chevron-right" size={16} color={color.text3} />
          </Pressable>
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="health" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  medName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  actionRow: { flexDirection: 'row', gap: space.s12, marginTop: space.s12 },
  fillBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 40, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  outlineBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 40, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  remindRow: { flexDirection: 'row', gap: space.s8, marginTop: space.s12 },
  remindChip: { flexDirection: 'row', gap: space.s4, alignItems: 'center', paddingHorizontal: space.s10, height: 28, borderRadius: radius.full, backgroundColor: color.surface2 },
  remindChipText: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface },
  waterText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  navBar: { height: 72 },
});
