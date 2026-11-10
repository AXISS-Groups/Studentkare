import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2HeroPanel, M2Note, M2Pill, PillNav, m2Text } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Camps. Krishna asked to
 * extend the canvas's style (2026-11-05) past its 4 screens. Content from
 * design/screens/briefs/M2Camps.md (Tier 2; the pass, check-in, results and
 * drives are Tier 1 and are not drawn here, per the brief). Not wired, not
 * replacing the real screen. See NOTES.md.
 */
export function M2CampsPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-camps">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="Campus health" title="Health camps" sub="Slots can be changed or cancelled up to the cutoff." icon="calendar-2" hue="sky" compact />
        <View style={styles.body}>
          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>Your bookings</Text>
            <M2Card>
              <View style={styles.bookingRow}>
                <View style={styles.dateTile}>
                  <Text style={styles.dateDay}>12</Text>
                  <Text style={styles.dateMon}>NOV</Text>
                </View>
                <View style={styles.flexShrink}>
                  <Text style={styles.campName}>[Camp name]</Text>
                  <Text style={m2Text.meta}>10:00 AM · [Place]</Text>
                  <Text style={styles.ref}>Ref [ABCD1234]</Text>
                </View>
                <M2Pill label="Booked" tone="positive" />
              </View>
            </M2Card>
          </View>

          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>Upcoming camps</Text>
            {[
              { name: '[Dental checkup camp]', chips: ['Dental'], left: '14 left' },
              { name: '[Blood donation drive]', chips: ['Blood donation'], left: 'Every slot is full' },
            ].map((camp) => (
              <M2Card key={camp.name} style={styles.campCard}>
                <View style={styles.campRow}>
                  <View style={styles.dateTile}><Text style={styles.dateDay}>18</Text><Text style={styles.dateMon}>NOV</Text></View>
                  <View style={styles.flexShrink}>
                    <Text style={styles.campName}>{camp.name}</Text>
                    <Text style={m2Text.meta}>[Place] · Free</Text>
                    <View style={styles.chipRow}>
                      {camp.chips.map((c) => <M2Pill key={c} label={c} tone="action" />)}
                      <View style={styles.usersRow}>
                        <Icon name="users" size={14} color={camp.left.includes('full') ? color.attention : color.text3} />
                        <Text style={[m2Text.meta, camp.left.includes('full') ? styles.full : null]}>{camp.left}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </M2Card>
            ))}
          </View>

          <M2Note tone="neutral" icon="lock" title="Private by design">
            The campus and the partner see counts per slot, never who booked.
          </M2Note>
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="home" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s20 },
  sectionGap: { marginBottom: space.s12 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  dateTile: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.action, lineHeight: font.size.titleSm },
  dateMon: { fontFamily: font.family.sans, fontSize: 9, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.6, color: color.text3 },
  flexShrink: { flex: 1, minWidth: 0, gap: space.s2 },
  campName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  ref: { fontFamily: font.family.mono, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2, marginTop: space.s2 },
  campCard: { marginBottom: space.s12 },
  campRow: { flexDirection: 'row', gap: space.s12 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s6, flexWrap: 'wrap' },
  usersRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  full: { color: color.attention, fontWeight: fontWeight(font.weight.strong) },
  navBar: { height: 72 },
});
