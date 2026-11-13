import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional, net-new concept: a "refer a friend" screen, in the
 * same 1mg-inspired visual language. There is no existing brief or screen
 * for this — it's a common Tata 1mg pattern this canvas didn't cover.
 * Deliberately Tier 3 / promotional only: no personal health data, no
 * clinical content, no invented reward amounts beyond a placeholder. If
 * this direction is wanted for real, it needs its own brief and ticket
 * first, same caution as LabPrepPreview/DoctorComparePreview. Not wired,
 * not replacing anything. See NOTES.md.
 */
export function ReferFriendPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-refer-friend">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('preview.inviteAFriend')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <View style={styles.hero}>
            <Icon name="heart-3" size={28} color={color.action} />
            <Text style={styles.heroTitle}>{t('preview.helpAFriendGetTheirRecordsInOrder')}</Text>
            <Text style={m2Text.meta}>{t('preview.whenTheySignUpWithYourLinkA')}</Text>
          </View>

          <M2Card style={styles.codeCard}>
            <Text style={m2Text.eyebrow}>{t('preview.yourLink')}</Text>
            <Text style={styles.codeText}>{t('preview.studentkareCoYourCode')}</Text>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('news.copyLink')} onPress={noop} style={({ focused }: PressState) => [styles.copyBtn, focused ? focusRing : null]}>
              <Icon name="copy" size={14} color={color.action} /><Text style={styles.copyBtnText}>{t('preview.copy')}</Text>
            </Pressable>
          </M2Card>

          <View style={styles.shareRow}>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('member.records.share')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
              <Icon name="share" size={16} color={color.onAction} /><Text style={styles.fillBtnText}>{t('member.records.share')}</Text>
            </Pressable>
          </View>

          <Text style={m2Text.meta}>{t('preview.noPersonalHealthInformationIsEverPartOf')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s16 },
  hero: { gap: space.s8, alignItems: 'flex-start', padding: space.s4 },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  codeCard: { gap: space.s8 },
  codeText: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  copyBtn: { flexDirection: 'row', gap: space.s6, alignSelf: 'flex-start', height: 32, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  copyBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  shareRow: { flexDirection: 'row' },
  fillBtn: { flex: 1, flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
