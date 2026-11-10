import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2HeroPanel, M2Note, PillNav, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;
const CONCERNS = ['Fever', 'Stress or anxiety', 'Skin', 'Period pain', 'Cold and cough', 'Sleep trouble'] as const;

/**
 * Flat, non-functional 1mg-inspired preview of M2Consults (doctor consults).
 * Krishna asked to extend the canvas's visual language (2026-11-05) to the
 * rest of Home's grid, beyond the 4 screens the canvas itself drew. Content
 * taken from design/screens/briefs/M2Consults.md (Tier 2; the
 * counsellor/Tele-MANAS note is the one Tier-1 part, kept as the brief
 * describes it). Built alongside the real M2Consults — not wired, not
 * replacing it. See NOTES.md.
 */
export function M2ConsultsPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-consults">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="Doctors" title="What's the concern?" sub="Video or in-person, same day when there's a slot." icon="video-2" hue="blue" compact />
        <View style={styles.body}>
          <View style={styles.chipRow}>
            {CONCERNS.map((label) => (
              <Pressable key={label} role="button" accessibilityRole="button" accessibilityLabel={label} onPress={noop}
                style={({ focused }: PressState) => [styles.chip, label === 'Stress or anxiety' ? styles.chipOn : null, focused ? focusRing : null]}>
                <Text style={[styles.chipText, label === 'Stress or anxiety' ? styles.chipTextOn : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <M2Note tone="positive" icon="heart-3" title="Free and private" testID="preview-consults-counsellor">
            The campus counsellor is free and private. Need someone right now? Call Tele-MANAS 14416, any time.
          </M2Note>

          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>Doctors available today</Text>
            {[
              { name: 'Dr. Ananya Rao', spec: 'General physician · 8 yrs · Telugu, English', slot: 'Next slot 11:40 AM' },
              { name: 'Dr. Vikram Shah', spec: 'Dermatology · 11 yrs · Hindi, English', slot: 'Next slot 2:15 PM' },
            ].map((doc) => (
              <M2Card key={doc.name} style={styles.docCard}>
                <View style={styles.docRow}>
                  <View style={styles.avatar}><Icon name="user-5" size={20} color={color.action} /></View>
                  <View style={styles.flexShrink}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={m2Text.meta}>{doc.spec}</Text>
                    <Text style={styles.docSlot}>{doc.slot}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={color.text3} />
                </View>
              </M2Card>
            ))}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  chip: { height: 40, paddingHorizontal: space.s16, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderWidth: 0, backgroundColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  chipTextOn: { color: color.onAction, fontWeight: fontWeight(font.weight.heavy) },
  sectionGap: { marginBottom: space.s12 },
  docCard: { marginBottom: space.s12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  docName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  docSlot: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.action, marginTop: space.s2 },
  navBar: { height: 72 },
});
