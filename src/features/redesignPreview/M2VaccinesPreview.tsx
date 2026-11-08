import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2HeroPanel, M2Pill, PillNav, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;
const VACCINES = ['Influenza', 'HPV', 'Hepatitis B', 'Typhoid'] as const;

/**
 * Flat, non-functional 1mg-inspired preview of M2Vaccines. Krishna asked to
 * extend the canvas's visual language (2026-11-05) past its 4 screens.
 * M2Vaccines is Tier 1 (design/screens/briefs/M2Vaccines.md): "Your vaccine
 * record" is the student's own clinical record and stays exactly as
 * described there — no invented doses or dates, the single sample row below
 * is labelled as a placeholder the way the real screen never would be.
 * Booking (the vaccine picker, slot card) is the Tier-2 part. Not wired, not
 * replacing the real screen. See NOTES.md.
 */
export function M2VaccinesPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-vaccines">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="Preventive care" title={t('assist.prev.topic.vaccines')} sub="Your record, and booking the next one." icon="syringe" hue="amber" compact />
        <View style={styles.body}>
          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>{t('m2.ins.vaccineRecord')}</Text>
            <M2Card>
              <View style={styles.recordRow}>
                <View style={styles.recordTile}><Icon name="check" size={18} color={color.positive} /></View>
                <View style={styles.flexShrink}>
                  <Text style={styles.recordName}>{t('preview.vaccineDoseN')}</Text>
                  <Text style={m2Text.meta}>{t('preview.givenAtClinicDateAPlaceholderRowThe')}</Text>
                </View>
              </View>
            </M2Card>
          </View>

          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.bookTheNextOne')}</Text>
            <View style={styles.chipRow}>
              {VACCINES.map((label, i) => (
                <Pressable key={label} role="button" accessibilityRole="button" accessibilityLabel={label} onPress={noop}
                  style={({ focused }: PressState) => [styles.chip, i === 0 ? styles.chipOn : null, focused ? focusRing : null]}>
                  <Text style={[styles.chipText, i === 0 ? styles.chipTextOn : null]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <M2Card style={styles.bookingCard}>
              <View style={styles.bookingHead}>
                <Text style={styles.bookingTitle}>{t('preview.influenza')}</Text>
                <M2Pill label="Given at the clinic" tone="action" />
              </View>
              <Text style={m2Text.body}>{t('preview.pickASlotAtTheCampusClinicA')}</Text>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('camps.pickSlot')} onPress={noop}
                style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
                <Text style={styles.fillBtnText}>{t('camps.pickSlot')}</Text>
              </Pressable>
            </M2Card>
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
  sectionGap: { marginBottom: space.s12 },
  recordRow: { flexDirection: 'row', gap: space.s12, alignItems: 'flex-start' },
  recordTile: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: color.positiveBg, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  recordName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  chipRow: { flexDirection: 'row', gap: space.s8, marginBottom: space.s12 },
  chip: { height: 44, paddingHorizontal: space.s16, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderWidth: 0, backgroundColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  chipTextOn: { color: color.onAction, fontWeight: fontWeight(font.weight.heavy) },
  bookingCard: { gap: space.s12 },
  bookingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  fillBtn: { height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  navBar: { height: 72 },
});
