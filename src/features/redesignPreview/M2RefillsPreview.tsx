import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2HeroPanel, M2Note, M2Pill, PillNav, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Refills. Krishna asked to
 * extend the canvas's style (2026-11-05) past its 4 screens. Content from
 * design/screens/briefs/M2Refills.md (Tier 2 for what's built — a count, not
 * dosing advice; anything Tier 1 is explicitly not built per the brief, and
 * stays that way here too). Not wired, not replacing the real screen. See
 * NOTES.md.
 */
export function M2RefillsPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-refills">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="My health" title={t('m2.ins.refills')} sub="1 medicine runs out soon." icon="pill-3" hue="teal" compact />
        <View style={styles.body}>
          <M2Card>
            <View style={styles.row}>
              <GlossTile icon="pill-3" hue="teal" size={44} />
              <View style={styles.flexShrink}>
                <Text style={styles.medName}>{t('preview.paracetamol650Mg')}</Text>
                <Text style={m2Text.meta}>{t('refill.row.sourceOrder')}</Text>
              </View>
              <M2Pill label="5 days left" tone="attention" />
            </View>
            <View style={styles.metaRows}>
              <View style={styles.metaRow}>
                <Icon name="box" size={16} color={color.text3} />
                <Text style={m2Text.meta}>{t('preview.about6LeftRunsOutDate')}</Text>
              </View>
              <View style={styles.metaRow}>
                <Icon name="clock" size={16} color={color.text3} />
                <Text style={m2Text.meta}>{t('preview.1EachTime2TimesADayPack')}</Text>
              </View>
              <View style={styles.metaRow}>
                <Icon name="calendar" size={16} color={color.text3} />
                <Text style={m2Text.meta}>{t('preview.reminderOnDate3DaysBefore')}</Text>
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('refill.row.toggle')}</Text>
              <Switch value disabled trackColor={{ true: color.action, false: color.rule }} />
            </View>
            <View style={styles.actionRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('pb.yc.reorder')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
                <Icon name="repeat" size={16} color={color.onAction} />
                <Text style={styles.fillBtnText}>{t('pb.yc.reorder')}</Text>
              </Pressable>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('refill.row.snooze')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="bell-off" size={16} color={color.action} />
                <Text style={styles.outlineBtnText}>{t('refill.row.snooze')}</Text>
              </Pressable>
            </View>
          </M2Card>

          <M2Note tone="info" icon="info" title={t('preview.weOnlyCount')}>{t('preview.thisIsACountFromThePackSize')}</M2Note>

          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('refill.add')} onPress={noop} style={({ focused }: PressState) => [styles.trackBtn, focused ? focusRing : null]}>
            <Icon name="plus" size={18} color={color.action} />
            <Text style={styles.trackBtnText}>{t('refill.add')}</Text>
          </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  medName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  metaRows: { marginTop: space.s12, gap: space.s8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s12, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  switchLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  actionRow: { flexDirection: 'row', gap: space.s12, marginTop: space.s12 },
  fillBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 44, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  outlineBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 44, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  trackBtn: { flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  trackBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  navBar: { height: 72 },
});
