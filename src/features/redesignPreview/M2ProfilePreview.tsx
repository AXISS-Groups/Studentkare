import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, PillNav, m2Text } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

const SETTINGS: ReadonlyArray<{ icon: SkIconName; label: string }> = [
  { icon: 'map-pin-2', label: 'Addresses' },
  { icon: 'credit-card', label: 'Orders and payments' },
  { icon: 'devices', label: 'Connect a device' },
  { icon: 'lock-4', label: 'Privacy and data' },
  { icon: 'translate', label: 'Language' },
];

/**
 * Flat, non-functional 1mg-inspired preview of M2Profile. Krishna asked to
 * extend the canvas's style (2026-11-05) past its 4 screens. M2Profile is
 * Tier 1 in full (design/screens/briefs/M2Profile.md: identity, blood
 * group/vitals, the emergency card, and the consent switches) — every value
 * below is a bracketed placeholder for exactly that reason, and the switches
 * are shown off/disabled rather than defaulted to a state nobody chose. Not
 * wired, not replacing the real screen. See NOTES.md.
 */
export function M2ProfilePreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-profile">
      <View style={styles.scroll}>
        <View style={styles.body}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}><Icon name="user-5" size={28} color={color.action} /></View>
            <View style={styles.flexShrink}>
              <Text style={styles.name}>{t('preview.studentName')}</Text>
              <Text style={m2Text.meta}>{t('preview.bloodGroupCampus')}</Text>
            </View>
          </View>

          <M2Card>
            <Text style={m2Text.eyebrow}>{t('preview.consent')}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('m2.prof.ayush')}</Text>
              <Switch value={false} disabled trackColor={{ true: color.action, false: color.rule }} />
            </View>
            <View style={[styles.switchRow, styles.switchRowLast]}>
              <View>
                <Text style={styles.switchLabel}>{t('m2.prof.family')}</Text>
                <Text style={m2Text.meta}>{t('m2.soon')}</Text>
              </View>
              <Switch value={false} disabled trackColor={{ true: color.action, false: color.rule }} />
            </View>
          </M2Card>

          <View style={styles.grid}>
            <M2Card style={styles.docCard}>
              <GlossTile icon="doc" hue="green" size={36} />
              <Text style={styles.docCount}>{t('preview.n')}</Text>
              <Text style={m2Text.meta}>{t('m2.ins.documents')}</Text>
            </M2Card>
            <M2Card style={styles.docCard}>
              <GlossTile icon="flask" hue="orange" size={36} />
              <Text style={styles.docCount}>{t('preview.n')}</Text>
              <Text style={m2Text.meta}>{t('m2.prof.docLab')}</Text>
            </M2Card>
            <M2Card style={styles.docCard}>
              <GlossTile icon="syringe" hue="rose" size={36} />
              <Text style={styles.docCount}>{t('preview.n')}</Text>
              <Text style={m2Text.meta}>{t('assist.prev.topic.vaccines')}</Text>
            </M2Card>
          </View>

          <M2Card>
            {SETTINGS.map((row, i) => (
              <Pressable key={row.label} role="button" accessibilityRole="button" accessibilityLabel={row.label} onPress={noop}
                style={({ focused }: PressState) => [styles.settingRow, i === SETTINGS.length - 1 ? styles.settingRowLast : null, focused ? focusRing : null]}>
                <Icon name={row.icon} size={18} color={color.text2} />
                <Text style={styles.settingLabel}>{row.label}</Text>
                <Icon name="chevron-right" size={16} color={color.text3} />
              </Pressable>
            ))}
          </M2Card>
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="profile" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, paddingTop: space.s24, gap: space.s16 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginBottom: space.s4 },
  avatar: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  switchRowLast: { borderBottomWidth: 0 },
  switchLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  grid: { flexDirection: 'row', gap: space.s12 },
  docCard: { flex: 1, alignItems: 'center', gap: space.s4 },
  docCount: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s14, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  settingRowLast: { borderBottomWidth: 0 },
  settingLabel: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  navBar: { height: 72 },
});
