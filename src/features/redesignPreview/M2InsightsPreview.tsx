import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, PillNav, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Insights. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Insights.md (Tier 1: lab values, doctor's note,
 * refills due). "Need a look" state shown. The "Recommended for your HDL
 * result" rail is a founder-approved, named Rule L exception per the brief —
 * kept here with the same calm framing (no urgency copy), not invented.
 * Not wired, not replacing the real screen. See NOTES.md.
 */
export function M2InsightsPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-insights">
      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>MY HEALTH</Text>
          <Text style={styles.h1}>Insights</Text>

          <View style={styles.todayRow}>
            <M2Card style={styles.todayCard}>
              <GlossTile icon="pill-3" hue="teal" size={36} />
              <Text style={styles.todayTitle}>Medicines today</Text>
              <Text style={m2Text.meta}>[1] of [2] taken</Text>
              <View style={styles.todayActions}>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel="Taken" onPress={noop} style={({ focused }: PressState) => [styles.miniBtn, focused ? focusRing : null]}>
                  <Icon name="check" size={14} color={color.action} />
                </Pressable>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel="Skip" onPress={noop} style={({ focused }: PressState) => [styles.miniBtn, focused ? focusRing : null]}>
                  <Icon name="skip-forward" size={14} color={color.text3} />
                </Pressable>
              </View>
            </M2Card>
            <M2Card style={styles.todayCard}>
              <GlossTile icon="glass" hue="sky" size={36} />
              <Text style={styles.todayTitle}>Water</Text>
              <Text style={m2Text.meta}>[600] of [2000] ml</Text>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="Add a glass" onPress={noop} style={({ focused }: PressState) => [styles.miniBtn, focused ? focusRing : null]}>
                <Icon name="plus" size={14} color={color.action} />
              </Pressable>
            </M2Card>
          </View>

          <M2Card style={styles.needLookCard}>
            <Text style={m2Text.eyebrow}>LATEST REPORT</Text>
            <Text style={styles.needLookTitle}>Needs a look</Text>
            <Text style={m2Text.meta}>2 values outside range · [Lipid profile], 14 Oct 2026</Text>
            <View style={styles.needLookRow}>
              {['HbA1c 6.4', 'HDL 38', 'Vitamin B12 412'].map((v) => (
                <M2Pill key={v} label={v} tone={v.startsWith('Vitamin') ? 'positive' : 'attention'} />
              ))}
            </View>
          </M2Card>

          <M2Note tone="neutral" icon="stetho" title="Your doctor's note">
            Keep up the walk after meals. Repeat the lipid panel in 3 months.
          </M2Note>

          <View style={styles.dueRow}>
            <M2Card style={styles.dueCard}>
              <GlossTile icon="refresh" hue="orange" size={36} />
              <Text style={styles.dueTitle}>Refills due</Text>
              <Text style={m2Text.meta}>[Paracetamol] in 5 days</Text>
            </M2Card>
            <M2Card style={styles.dueCard}>
              <GlossTile icon="flask" hue="violet" size={36} />
              <Text style={styles.dueTitle}>Repeat test ordered</Text>
              <Text style={m2Text.meta}>Lipid profile</Text>
            </M2Card>
          </View>

          <View>
            <Text style={styles.sectionTitle}>Recommended for your HDL result</Text>
            <Text style={m2Text.meta}>A pharmacist checks anything new against your existing medicines. Why these? Ask Ayush.</Text>
            {[{ name: '[Omega-3 fish oil]', icon: 'droplet' as const, price: '₹399' }].map((p) => (
              <M2Card key={p.name} style={styles.productCard}>
                <GlossTile icon={p.icon} hue="rose" size={40} />
                <View style={styles.flexShrink}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={m2Text.meta}>May help support HDL, per general guidance</Text>
                </View>
                <Text style={styles.productPrice}>{p.price}</Text>
              </M2Card>
            ))}
          </View>

          <View style={styles.bodySystemRow}>
            <M2Card style={styles.bodyCard}>
              <Icon name="kidney" size={20} color={color.text3} />
              <Text style={styles.bodyTitle}>Kidney function</Text>
              <M2Pill label="Get this tested" tone="action" />
            </M2Card>
            <M2Card style={styles.bodyCard}>
              <Icon name="brain" size={20} color={color.text3} />
              <Text style={styles.bodyTitle}>Brain and nerves</Text>
              <M2Pill label="Get this tested" tone="action" />
            </M2Card>
          </View>

          <M2Card style={styles.stepsCard}>
            <Icon name="walk" size={22} color={color.serviceTealInk} />
            <Text style={styles.stepsTitle}>Steps today</Text>
            <Text style={m2Text.meta}>[4,210] · From this phone's motion sensor</Text>
          </M2Card>
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
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text3, letterSpacing: 0.6 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: -space.s4 },
  todayRow: { flexDirection: 'row', gap: space.s12 },
  todayCard: { flex: 1, gap: space.s4, alignItems: 'flex-start' },
  todayTitle: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  todayActions: { flexDirection: 'row', gap: space.s6, marginTop: space.s4 },
  miniBtn: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  needLookCard: { gap: space.s6 },
  needLookTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  needLookRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s4 },
  dueRow: { flexDirection: 'row', gap: space.s12 },
  dueCard: { flex: 1, gap: space.s4, alignItems: 'flex-start' },
  dueTitle: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginBottom: space.s2 },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginTop: space.s8 },
  flexShrink: { flex: 1, minWidth: 0 },
  productName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  productPrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  bodySystemRow: { flexDirection: 'row', gap: space.s12 },
  bodyCard: { flex: 1, gap: space.s6, alignItems: 'flex-start' },
  bodyTitle: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  stepsCard: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  stepsTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  navBar: { height: 72 },
});
