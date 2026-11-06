import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2HeroPanel, M2Note, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;
const BARS = [4200, 3100, 5600, 2800, 4900, 0, 0];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX = 6000;

/**
 * Flat, non-functional 1mg-inspired preview of M2Steps. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Steps.md (Tier 2, wellness — not a clinical
 * value). Per the brief's rules, kept here too: no goal, ring, streak or
 * score; a day with no number is an empty dashed track, not a zero bar.
 * Not wired, not replacing the real screen. See NOTES.md.
 */
export function M2StepsPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-steps">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="My health" title="4,210 steps today" sub="From this phone's motion sensor" icon="walk" hue="teal" compact />
        <View style={styles.body}>
          <Text style={m2Text.meta}>Steps are here for you to look at. No goals, scores or streaks.</Text>

          <M2Card>
            <Text style={styles.sectionTitle}>This week</Text>
            <View style={styles.chartRow}>
              {BARS.map((val, i) => (
                <View key={i} style={styles.barCol}>
                  {val > 0
                    ? <View style={[styles.bar, { height: Math.max(8, (val / MAX) * 80) }]} />
                    : <View style={styles.barEmpty} />}
                  <Text style={styles.barLabel}>{DAYS[i]}</Text>
                </View>
              ))}
            </View>
            <Text style={m2Text.meta}>Average on the days with a number: 4,120 steps</Text>
          </M2Card>

          <Text style={styles.sectionTitle}>Count steps automatically</Text>
          {[{ icon: 'heart-plus' as const, name: 'Apple Health', state: 'Connected' }, { icon: 'devices' as const, name: "This phone's motion sensor", state: 'Not connected' }].map((src) => (
            <View key={src.name} style={styles.sourceRow}>
              <Icon name={src.icon} size={18} color={color.text3} />
              <View style={styles.flexShrink}>
                <Text style={styles.sourceName}>{src.name}</Text>
                <Text style={m2Text.meta}>Never writes</Text>
              </View>
              <Text style={styles.sourceState}>{src.state}</Text>
            </View>
          ))}
          <M2Note tone="info" icon="info">Most trusted source first. Numbers are never added together.</M2Note>

          <View style={styles.typeRow}>
            <Icon name="pencil" size={16} color={color.text3} />
            <Text style={styles.typeText}>Add today's steps yourself</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginBottom: space.s8 },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, marginBottom: space.s8 },
  barCol: { alignItems: 'center', gap: space.s6, width: 32 },
  bar: { width: 16, borderRadius: radius.sm, backgroundColor: color.serviceTealInk },
  barEmpty: { width: 16, height: 80, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: color.rule },
  barLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s10, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  flexShrink: { flex: 1, minWidth: 0 },
  sourceName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  sourceState: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, padding: space.s14, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.actionSoft },
  typeText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
});
