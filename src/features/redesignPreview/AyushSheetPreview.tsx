import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of AyushSheet ("Ayush — phone
 * bottom sheet"), built from the real design/screens/briefs/AyushSheet.md,
 * its screenshot and HTML source (canvas page 9, Tier 1, SK-020). The
 * source's own logic branches on a crisis-language regex and shows a
 * "You don't have to handle this alone" panel with Tele-MANAS/counsellor
 * numbers — that is DESIGN.md's "Crisis support, SOS" Tier-1 safety
 * bullet verbatim, not just a Tier-1 board placement. Per Krishna's
 * explicit call this still ships only as a flat preview: there is no
 * crisis-detection logic here, no live chat, and the input/send controls
 * do nothing. The sample exchange below is a fixed, hard-coded
 * illustration of the non-crisis path only (reusing real translated
 * copy) — it never runs the source's regex and never shows the crisis
 * panel, so nothing here can be mistaken for working crisis support. If
 * a working version of this sheet is wanted, it needs a named reviewer
 * and clinical/legal sign-off before any real crisis-detection code, same
 * as CrisisSupport itself. Not wired, not replacing anything. See
 * NOTES.md.
 */
export function AyushSheetPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-ayush-sheet">
      <View style={styles.scrim} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Icon name="sparkles" size={18} color={color.onAction} />
          </View>
          <View style={styles.flexShrink}>
            <Text style={styles.name}>{t('preview.ayushAi')}</Text>
            <Text style={styles.scope}>{t('preview.answersOnlyFromApprovedSources')}</Text>
          </View>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.makeSmaller')} onPress={noop} style={({ focused }: PressState) => [styles.iconBtn, focused ? focusRing : null]}>
            <Icon name="chevron-down" size={16} color={color.text2} />
          </Pressable>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.makeTaller')} onPress={noop} style={({ focused }: PressState) => [styles.iconBtn, focused ? focusRing : null]}>
            <Icon name="chevron-up" size={16} color={color.text2} />
          </Pressable>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.close')} onPress={noop} style={({ focused }: PressState) => [styles.iconBtn, focused ? focusRing : null]}>
            <Icon name="x" size={16} color={color.text2} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={styles.contextChip}>{t('preview.aboutCampusCare')}</Text>
          <View style={styles.bubbleIn}>
            <Text style={m2Text.body}>{t('preview.askMeAboutCampusCareBookingsOrHow')}</Text>
          </View>
          <View style={styles.sourcePill}>
            <Icon name="check" size={12} color={color.positive} />
            <Text style={styles.sourcePillText}>{t('preview.sourcePrefix')}</Text>
          </View>
          <Text style={styles.tryAsking}>{t('preview.tryAsking')}</Text>
          <Pressable role="button" accessibilityRole="button" onPress={noop} style={({ focused }: PressState) => [styles.chip, focused ? focusRing : null]}>
            <Text style={styles.chipText}>{t('preview.isFeverGoingAroundMyHostel')}</Text>
          </Pressable>
          <Pressable role="button" accessibilityRole="button" onPress={noop} style={({ focused }: PressState) => [styles.chip, focused ? focusRing : null]}>
            <Text style={styles.chipText}>{t('preview.howDoIBookABloodTestAtMyHostel')}</Text>
          </Pressable>
        </View>
        <View style={styles.footer}>
          <View style={styles.inputRow}>
            <View style={styles.input}><Text style={styles.inputPlaceholder}>{t('preview.askAboutYourCare')}</Text></View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.send')} onPress={noop} style={({ focused }: PressState) => [styles.sendBtn, focused ? focusRing : null]}>
              <Icon name="arrow-right" size={16} color={color.onAction} />
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>{t('preview.ayushCantDiagnoseOrPrescribe')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden', justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,10,24,0.45)' },
  sheet: { height: '64%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: color.surface, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: radius.full, backgroundColor: color.rule, marginTop: space.s8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s16, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  avatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scope: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  iconBtn: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: color.ruleSoft, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: space.s16, gap: space.s8 },
  contextChip: { alignSelf: 'center', paddingHorizontal: space.s12, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.neutralBg, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.action },
  bubbleIn: { alignSelf: 'flex-start', maxWidth: '86%', padding: space.s12, borderRadius: radius.md, backgroundColor: color.neutralBg },
  sourcePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s8, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.positiveBg },
  sourcePillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  tryAsking: { marginTop: space.s8, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, color: color.text3 },
  chip: { alignSelf: 'flex-start', paddingVertical: space.s8, paddingHorizontal: space.s12, borderRadius: radius.md, borderWidth: 1, borderColor: color.actionSoft },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  footer: { padding: space.s12, gap: space.s4, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  inputRow: { flexDirection: 'row', gap: space.s8 },
  input: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.actionSoft, paddingHorizontal: space.s12, justifyContent: 'center' },
  inputPlaceholder: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
  sendBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
});
