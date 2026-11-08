import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2HeroPanel, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;
const DAY_BARS = [1200, 1800, 0, 2100, 1500, 900, 600];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const GOAL = 2000;

/**
 * Flat, non-functional 1mg-inspired preview of M2Water. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Water.md (Tier 2). Per the brief's rules, kept
 * here too: no streak, medal, score or comparison; a day with nothing
 * logged reads as "Nothing logged," never 0. Not wired, not replacing the
 * real screen. See NOTES.md.
 */
export function M2WaterPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-water">
      <View style={styles.scroll}>
        <M2HeroPanel eyebrow="My health" title={t('preview.600MlToday')} sub="of your 2,000 ml goal" icon="glass" hue="sky" compact />
        <View style={styles.body}>
          <View style={styles.actionRow}>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.addAGlass')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
              <Icon name="plus" size={16} color={color.onAction} /><Icon name="glass" size={16} color={color.onAction} /><Text style={styles.fillBtnText}>{t('preview.glass200Ml')}</Text>
            </Pressable>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.undoLast')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
              <Icon name="undo" size={16} color={color.action} /><Text style={styles.outlineBtnText}>{t('preview.undoLast')}</Text>
            </Pressable>
          </View>

          <M2Card>
            <Text style={styles.sectionTitle}>{t('campusBoards.camps.status.today')}</Text>
            {['8:40 AM · 200 ml', '11:15 AM · 200 ml', '1:30 PM · 200 ml'].map((entry) => (
              <Text key={entry} style={m2Text.meta}>{entry}</Text>
            ))}
          </M2Card>

          <View style={styles.goalRow}>
            <Text style={styles.goalText}>{t('preview.dailyGoal2000Ml')}</Text>
            <Text style={styles.changeLink}>{t('admin.accounts.colChange')}</Text>
          </View>

          <M2Card>
            <Text style={styles.sectionTitle}>{t('preview.last7Days')}</Text>
            <View style={styles.chartRow}>
              {DAY_BARS.map((val, i) => (
                <View key={i} style={styles.barCol}>
                  {val > 0
                    ? <View style={[styles.bar, { height: Math.max(8, (val / GOAL) * 80) }]} />
                    : <View style={styles.barEmpty} />}
                  <Text style={styles.barLabel}>{DAYS[i]}</Text>
                </View>
              ))}
            </View>
          </M2Card>

          <Text style={m2Text.meta}>{t('preview.waterIsnTScoredHereNoStreaksNo')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  actionRow: { flexDirection: 'row', gap: space.s12 },
  fillBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 44, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  outlineBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 44, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginBottom: space.s6 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s4 },
  goalText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  changeLink: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barCol: { alignItems: 'center', gap: space.s6, width: 32 },
  bar: { width: 16, borderRadius: radius.sm, backgroundColor: color.serviceSkyInk },
  barEmpty: { width: 16, height: 80, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: color.rule },
  barLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
