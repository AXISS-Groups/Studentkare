import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2FacilityDetail. Krishna
 * asked to extend the canvas's style past the 12 already built. Content
 * from design/screens/briefs/M2FacilityDetail.md (Tier 2). Honest-data rule
 * kept as-is: no beds, ratings, reviews, wait times or "open now" claim.
 * Not wired, not replacing the real screen. See NOTES.md.
 */
export function M2FacilityDetailPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-facility-detail">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <View style={styles.typeTile}><Icon name="hospital" size={26} color={color.action} /></View>
          <Text style={styles.name}>{t('preview.campusHealthCentre')}</Text>
          <Text style={m2Text.meta}>{t('preview.hospitalArea')}</Text>
          <View style={styles.chipRow}>
            <M2Pill label="24×7" tone="positive" />
            <M2Pill label="Your campus" tone="action" />
            <M2Pill label="StudentKare partner" tone="neutral" />
          </View>
          <View style={styles.actionRow}>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('ebar.call')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
              <Icon name="phone" size={16} color={color.onAction} /><Text style={styles.fillBtnText}>{t('ebar.call')}</Text>
            </Pressable>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('fc.directions')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
              <Icon name="directions" size={16} color={color.action} /><Text style={styles.outlineBtnText}>{t('fc.directions')}</Text>
            </Pressable>
          </View>

          <M2Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="map-pin-2" size={18} color={color.text3} />
              <Text style={styles.infoText}>{t('preview.addressLineArea')}</Text>
              <Icon name="arrow-up-right" size={14} color={color.action} />
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Icon name="clock" size={18} color={color.text3} />
              <Text style={styles.infoText}>{t('fc.chip247')}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Icon name="stethoscope" size={18} color={color.text3} />
              <Text style={styles.infoText}>{t('preview.generalMedicineEmergencyPharmacy')}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Icon name="shield-check" size={18} color={color.positive} />
              <Text style={styles.checkedText}>{t('preview.checkedOn12Oct2026CalledTheFront')}</Text>
            </View>
          </M2Card>

          <M2Note tone="info" icon="info">{t('fc.d.callFirst')}</M2Note>

          <View style={styles.emergencyRow}>
            <View style={styles.emergencyCard}>
              <Icon name="phone" size={16} color={color.dangerFill} />
              <Text style={styles.emergencyText}>{t('crisis.call112')}</Text>
            </View>
            <View style={styles.emergencyCard}>
              <Icon name="ambulance" size={16} color={color.dangerFill} />
              <Text style={styles.emergencyText}>{t('fc.call108')}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.gutterPhone, gap: space.s12 },
  typeTile: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  actionRow: { flexDirection: 'row', gap: space.s12, marginTop: space.s4 },
  fillBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 44, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  outlineBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 44, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  infoCard: { gap: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: color.ruleSoft },
  infoText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  checkedText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  emergencyRow: { flexDirection: 'row', gap: space.s12 },
  emergencyCard: { flex: 1, flexDirection: 'row', gap: space.s6, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: radius.full, borderWidth: 1, borderColor: color.dangerRule },
  emergencyText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
});
