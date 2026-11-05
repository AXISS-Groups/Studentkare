import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of Devices ("Devices &
 * readings") — built from the real design/screens/briefs/Devices.md, its
 * screenshot and HTML source (Tier 1), one of the two real-brief screens
 * Krishna asked for (2026-11-05) after the "Select your wearable" pattern
 * in the 1mg reference video. The honest-provenance framing (every
 * reading says which device or person it came from) is the brief's own
 * content, not invented. Not wired, not replacing anything. See NOTES.md.
 */
export function DevicesPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-devices">
      <View style={styles.header}>
        <RoundButton icon="chevron-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>Devices & readings</Text>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel="Trends" onPress={noop}
          style={({ focused }: PressState) => [focused ? focusRing : null]}>
          <Text style={styles.trendsLink}>Trends</Text>
        </Pressable>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Note tone="info" icon="shield-check-2" title="We no longer take readings with your phone camera">
            Phone cameras can't measure heart rate, oxygen or blood pressure reliably enough for a doctor to use. Every reading here comes from a real device or from you — and says which.
          </M2Note>

          <Text style={[m2Text.eyebrow, styles.sectionGap]}>CONNECTED SOURCES</Text>
          {[
            { icon: 'devices' as const, hue: 'indigo' as const, title: 'Health Connect', note: 'Steps and sleep only — nothing else is read', on: true },
            { icon: 'stethoscope' as const, hue: 'sky' as const, title: 'Blood pressure cuff', note: 'Bluetooth · Omron, DrTrust and others', on: false },
            { icon: 'droplet' as const, hue: 'rose' as const, title: 'Glucometer', note: 'Bluetooth · Accu-Chek, Contour and others', on: false },
          ].map((src) => (
            <M2Card key={src.title} style={styles.sourceCard}>
              <View style={styles.row}>
                <GlossTile icon={src.icon} hue={src.hue} size={44} />
                <View style={styles.flexShrink}>
                  <Text style={styles.rowTitle}>{src.title}</Text>
                  <Text style={m2Text.meta}>{src.note}</Text>
                </View>
                <Switch value={src.on} disabled trackColor={{ true: color.action, false: color.rule }} />
              </View>
            </M2Card>
          ))}

          <View style={styles.sectionHeadRow}>
            <Text style={[m2Text.eyebrow, styles.sectionGapNoBottom]}>LATEST READINGS</Text>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel="Add by hand" onPress={noop}
              style={({ focused }: PressState) => [styles.addBtn, focused ? focusRing : null]}>
              <Text style={styles.addBtnText}>Add by hand</Text>
            </Pressable>
          </View>

          <M2Card style={styles.readingCard}>
            <View style={styles.readingHead}>
              <Text style={m2Text.meta}>Blood pressure</Text>
              <M2Pill label="Omron cuff · synced" tone="positive" />
            </View>
            <View style={styles.readingValueRow}>
              <Text style={styles.readingValue}>118/76 <Text style={styles.readingUnit}>mmHg</Text></Text>
              <Text style={m2Text.meta}>Today 8:02 am</Text>
            </View>
          </M2Card>
          <M2Card style={styles.readingCard}>
            <View style={styles.readingHead}>
              <Text style={m2Text.meta}>Steps</Text>
              <M2Pill label="Health Connect" tone="positive" />
            </View>
            <View style={styles.readingValueRow}>
              <Text style={styles.readingValue}>6,412 <Text style={styles.readingUnit}>today</Text></Text>
              <Text style={m2Text.meta}>Live</Text>
            </View>
          </M2Card>
          <M2Card style={styles.readingCard}>
            <View style={styles.readingHead}>
              <Text style={m2Text.meta}>Weight</Text>
              <M2Pill label="Typed by you" tone="neutral" />
            </View>
            <View style={styles.readingValueRow}>
              <Text style={styles.readingValue}>64.5 <Text style={styles.readingUnit}>kg</Text></Text>
              <Text style={m2Text.meta}>Mon</Text>
            </View>
          </M2Card>

          <Text style={styles.footNote}>Doctors see where each number came from. Readings are never shared with your college or partners.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 900, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  headerTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  trendsLink: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s14 },
  sectionGap: { marginTop: space.s2 },
  sectionGapNoBottom: {},
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s4 },
  sourceCard: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  addBtn: { height: 36, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.action, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  readingCard: { gap: space.s6 },
  readingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readingValueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  readingValue: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  readingUnit: { fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  footNote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * 1.5, fontWeight: fontWeight(font.weight.regular), color: color.text3, marginTop: space.s4 },
});
