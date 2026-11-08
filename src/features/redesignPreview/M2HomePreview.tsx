import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import {
  M2Card, M2SearchField, PillNav, RoundButton, ServiceRail, SoftTileGrid, m2Text, webAttrs,
} from '@/design-system/m2';
import type { PressState, SoftTileItem } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional redesign preview of the "Student Kare — 1mg-inspired
 * screens" canvas (https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2),
 * Main.dc.html. Visual only — no data, no navigation, nothing wired — built
 * alongside the real M2Home (src/features/m2store/views/M2HomeView.tsx),
 * which this does not touch, for Krishna to review before any of it is
 * coded for real. See src/features/redesignPreview/NOTES.md for the icon
 * substitutions this screen makes and why.
 */
export function M2HomePreview(): React.ReactElement {
  const t = useT();
  const tiles: SoftTileItem[] = [
    { key: 'medicines', label: 'Medicines', icon: 'pill-3', hue: 'indigo', onPress: noop },
    { key: 'lab-tests', label: 'Lab tests', icon: 'lab', hue: 'violet', onPress: noop },
    { key: 'doctors', label: 'Doctors', icon: 'stethoscope', hue: 'teal', onPress: noop },
    { key: 'vaccines', label: 'Vaccines', icon: 'syringe', hue: 'rose', onPress: noop },
    { key: 'camps', label: 'Camps', icon: 'calendar-2', hue: 'amber', onPress: noop },
    { key: 'insurance', label: 'Insurance', icon: 'shield-check', hue: 'blue', onPress: noop },
    { key: 'refills', label: 'Refills', icon: 'refresh', hue: 'green', onPress: noop },
    { key: 'find-care', label: 'Find care', icon: 'map-pin-2', hue: 'sky', onPress: noop },
  ];

  return (
    <View style={styles.screen} testID="preview-m2-home">
      <View style={styles.topGutter}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={m2Text.eyebrow}>{t('preview.goodMorning')}</Text>
            <Text style={styles.name}>{t('preview.krishna')}</Text>
          </View>
          <RoundButton icon="bell" label="Notifications" onPress={noop} testID="preview-m2-home-bell" />
        </View>
        <M2SearchField placeholder={t('m2.home.search')} label="Search medicines, tests, doctors" onPress={noop} micUnavailable="Voice search isn't set up yet" />
      </View>

      <View style={styles.rail}>
        <ServiceRail
          label="Services"
          current="for-you"
          tiles={[
            { key: 'for-you', label: 'For you', icon: 'heart-pulse', hue: 'indigo', onPress: noop },
            { key: 'pharmacy', label: 'Pharmacy', icon: 'pill-3', hue: 'blue', onPress: noop },
            { key: 'labs', label: 'Labs', icon: 'lab', hue: 'violet', onPress: noop },
            { key: 'doctors', label: 'Doctors', icon: 'stethoscope', hue: 'teal', onPress: noop },
          ]}
        />
      </View>

      <View style={styles.body}>
        <M2Card testID="preview-m2-home-order" style={styles.orderCard}>
          <View style={styles.orderHead}>
            <Text style={m2Text.eyebrow}>{t('preview.sampleCollection')}</Text>
            <View style={styles.scheduledChip}>
              <Text style={styles.scheduledChipText}>{t('preview.scheduled')}</Text>
            </View>
          </View>
          <View style={styles.orderRow}>
            <View style={styles.orderTile}>
              <Icon name="box" size={24} color={color.action} />
            </View>
            <View style={styles.flexShrink}>
              <Text style={styles.orderTitle}>{t('preview.6Nov67Am')}</Text>
              <Text style={m2Text.meta}>{t('preview.aCollectorIsAssigned1HourBefore')}</Text>
            </View>
          </View>
          <Pressable
            role="button" accessibilityRole="button" accessibilityLabel={t('preview.viewOrderDetails')} onPress={noop}
            style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}
          >
            <Text style={styles.outlineBtnText}>{t('preview.viewOrderDetails')}</Text>
          </Pressable>
        </M2Card>

        <View>
          <Text style={[m2Text.section, styles.sectionGap]}>{t('camps.host.services')}</Text>
          <SoftTileGrid items={tiles} columns={4} testID="preview-m2-home-services" />
        </View>
      </View>

      <View style={styles.navBar} {...webAttrs({ role: 'navigation' })}>
        <PillNav current="home" onSelect={noop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  topGutter: { paddingHorizontal: space.gutterPhone, paddingTop: space.s20, gap: space.s14 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  rail: { marginTop: space.s16, backgroundColor: color.surface3, paddingVertical: space.s14 },
  body: { flex: 1, paddingHorizontal: space.gutterPhone, paddingTop: space.s20, gap: space.s20 },
  orderCard: { gap: space.s12 },
  orderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduledChip: { backgroundColor: color.attentionBg, borderRadius: radius.full, paddingHorizontal: space.s8, paddingVertical: space.s4 },
  scheduledChipText: { fontFamily: font.family.sans, fontSize: 10, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.4, color: color.attention },
  orderRow: { flexDirection: 'row', gap: space.s12, alignItems: 'center' },
  orderTile: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flexShrink: 1 },
  orderTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), letterSpacing: -0.2, color: color.text },
  outlineBtn: { height: 44, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  sectionGap: { marginBottom: space.s12 },
  navBar: { height: 72 },
});
