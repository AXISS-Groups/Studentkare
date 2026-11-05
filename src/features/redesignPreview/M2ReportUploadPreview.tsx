import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Note, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';

const noop = () => undefined;
const KINDS: ReadonlyArray<{ icon: SkIconName; label: string; hint: string }> = [
  { icon: 'flask', label: 'Lab report', hint: 'Blood tests and more' },
  { icon: 'prescription', label: 'Prescription', hint: "What your doctor wrote" },
  { icon: 'syringe', label: 'Vaccination record', hint: 'Doses and dates' },
  { icon: 'hospital', label: 'Discharge summary', hint: 'From a hospital stay' },
];

/**
 * Flat, non-functional 1mg-inspired preview of M2ReportUpload's "Kind"
 * step. Krishna asked to extend the canvas's style past the 12 already
 * built. Content from design/screens/briefs/M2ReportUpload.md (Tier 1).
 * The brief is explicit that the wider-document-kinds direction is a
 * design concept, not yet built this way — the real app has no document
 * reader at all, by deliberate Tier-1 decision; this preview carries the
 * same "design concept, not yet built this way" banner rather than
 * implying it already reads documents. Not wired, not replacing the real
 * screen. See NOTES.md.
 */
export function M2ReportUploadPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-report-upload">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel="Back" onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
          <Text style={styles.title}>Add a document</Text>
        </View>
        <View style={styles.body}>
          <M2Note tone="attention" icon="alert-triangle" title="Design concept, not yet built this way">
            The real app has no document reader — you type the values yourself, so it never pretends to read something it isn't. This step is a concept, pending the same review before any of it is real.
          </M2Note>

          <Text style={styles.question}>What are you adding?</Text>
          <View style={styles.grid}>
            {KINDS.map((kind) => (
              <Pressable key={kind.label} role="button" accessibilityRole="button" accessibilityLabel={kind.label} onPress={noop} style={({ focused }: PressState) => [styles.kindTile, focused ? focusRing : null]}>
                <Icon name={kind.icon} size={24} color={color.action} />
                <Text style={styles.kindLabel}>{kind.label}</Text>
                <Text style={m2Text.meta}>{kind.hint}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={m2Text.meta}>Nothing is saved until you confirm.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s16 },
  question: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  kindTile: { width: '47%', gap: space.s6, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface, alignItems: 'flex-start' },
  kindLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
