import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2HeroPanel, M2Tabs, PillNav, m2Text } from '@/design-system/m2';
import type { M2Tab, PressState } from '@/design-system/m2';

const noop = () => undefined;
type CareTab = 'hospitals' | 'pharmacies' | 'ambulance' | 'doctors';
const TABS: readonly M2Tab<CareTab>[] = [
  { key: 'hospitals', label: 'Hospitals' }, { key: 'pharmacies', label: 'Pharmacies' },
  { key: 'ambulance', label: 'Ambulance' }, { key: 'doctors', label: 'Doctors' },
];

/**
 * Flat, non-functional 1mg-inspired preview of M2FindCare. Krishna asked to
 * extend the canvas's style (2026-11-05) past its 4 screens. Content from
 * design/screens/briefs/M2FindCare.md (Tier 2 directory; the pinned 112/108
 * strip and campus SOS link are the Tier-1 parts, kept exactly as the brief
 * describes — protocol constants, never copy). Not wired, not replacing the
 * real screen. See NOTES.md.
 */
export function M2FindCarePreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-find-care">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="Find care" title={t('fc.title')} sub="Hospitals, pharmacies and doctors, checked by StudentKare or your campus." icon="map-pin-2" hue="blue" compact />
        <View style={styles.body}>
          <View style={styles.emergencyRow}>
            <View style={styles.emergencyCard}>
              <Icon name="phone" size={18} color={color.dangerFill} />
              <Text style={styles.emergencyTitle}>{t('crisis.call112')}</Text>
              <Text style={m2Text.meta}>{t('fc.call112Sub')}</Text>
            </View>
            <View style={styles.emergencyCard}>
              <Icon name="ambulance" size={18} color={color.dangerFill} />
              <Text style={styles.emergencyTitle}>{t('fc.call108')}</Text>
              <Text style={m2Text.meta}>{t('helpline.108.name')}</Text>
            </View>
          </View>

          <M2Tabs label="Care type" tabs={TABS} current="hospitals" onChange={noop} />

          {[
            { name: '[Campus health centre]', area: '[Area], 24×7', checked: 'Checked 12 Oct 2026' },
            { name: '[City general hospital]', area: '[Area] · 2.1 km', checked: 'Checked 12 Oct 2026' },
          ].map((place) => (
            <M2Card key={place.name} style={styles.placeCard}>
              <View style={styles.placeRow}>
                <View style={styles.placeTile}><Icon name="hospital" size={22} color={color.action} /></View>
                <View style={styles.flexShrink}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={m2Text.meta}>{place.area}</Text>
                  <View style={styles.checkedRow}>
                    <Icon name="shield-check" size={13} color={color.positive} />
                    <Text style={styles.checkedText}>{place.checked}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.placeActions}>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('campus.counsellor.call', { name: place.name })} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                  <Icon name="phone" size={15} color={color.action} /><Text style={styles.outlineBtnText}>{t('ebar.call')}</Text>
                </Pressable>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.directionsToName', { name: place.name })} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                  <Icon name="directions" size={15} color={color.action} /><Text style={styles.outlineBtnText}>{t('fc.directions')}</Text>
                </Pressable>
              </View>
            </M2Card>
          ))}
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="home" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  emergencyRow: { flexDirection: 'row', gap: space.s12 },
  emergencyCard: { flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.s14, borderWidth: 1, borderColor: color.dangerRule, gap: space.s2 },
  emergencyTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  placeCard: { gap: space.s12 },
  placeRow: { flexDirection: 'row', gap: space.s12 },
  placeTile: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0, gap: space.s2 },
  placeName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  checkedRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4, marginTop: space.s2 },
  checkedText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  placeActions: { flexDirection: 'row', gap: space.s8 },
  outlineBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 40, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  navBar: { height: 72 },
});
