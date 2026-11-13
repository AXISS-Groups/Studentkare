import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, Illustration } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

type TransferRow = { label: string; done: boolean };

/**
 * Flat, non-functional 1mg-inspired preview of NewDevice ("New phone —
 * move your account") — built from the real design/screens/briefs/NewDevice.md,
 * its screenshot and HTML source (canvas page 1, Tier 1, SK-033). Its own
 * content is a selfie-match identity-verification step ("Capture" /
 * "Matches your verified photo"), which is exactly DESIGN.md's "identity
 * verification and the gate" Tier-1 safety bullet, not just a Tier-1
 * board placement — so, per Krishna's explicit call, this stays a flat
 * preview only: no camera is opened, no match is run, "Capture" and
 * "All set" do nothing. If this flow is wanted for real, it still needs
 * a named reviewer before any live camera/match code, same as every
 * other Tier-1 safety screen. Not wired, not replacing anything. See
 * NOTES.md.
 */
export function NewDevicePreview(): React.ReactElement {
  const t = useT();
  const rows: readonly TransferRow[] = [
    { label: t('preview.checkInPassIssuedToThisPhone'), done: true },
    { label: t('preview.offlineEmergencyCardDownloaded'), done: true },
    { label: t('preview.medicineRemindersRestored'), done: false },
    { label: t('preview.recordsAndReportsSynced'), done: false },
  ];
  return (
    <View style={styles.screen} testID="preview-new-device">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="chevron-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('preview.newPhoneMoveYourAccount')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={styles.welcome}>{t('preview.welcomeBackKrishna')}</Text>
          <View style={styles.stepRow}>
            <Icon name="check" size={16} color={color.positive} />
            <Text style={m2Text.body}>{t('preview.emailCodeConfirmed')}</Text>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepLabel}>{t('preview.step1QuickSelfieMatch')}</Text>
            <View style={styles.selfieCircle}>
              <Illustration name="illustration-face-oval-guide-2" size={96} withoutText />
            </View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.takeASelfie')} onPress={noop}
              style={({ focused }: PressState) => [styles.captureBtn, focused ? focusRing : null]}>
              <Text style={styles.captureBtnText}>{t('preview.capture')}</Text>
            </Pressable>
            <Text style={m2Text.meta}>{t('preview.matchesYourVerifiedPhoto')}</Text>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepLabel}>{t('preview.step2YourOldPhoneIphone13')}</Text>
            <Text style={m2Text.body}>{t('preview.moveEverythingToThisPhone')}</Text>
            <View style={styles.transferList}>
              {rows.map((r) => (
                <View key={r.label} style={[styles.transferRow, r.done ? styles.transferRowDone : null]}>
                  {r.done ? (
                    <Icon name="check" size={16} color={color.positive} />
                  ) : (
                    <Icon name="circle" size={16} color={color.text3} />
                  )}
                  <Text style={[m2Text.body, r.done ? styles.transferTextDone : null]}>{r.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.allSetOpenStudentKare')} onPress={noop}
          style={({ focused }: PressState) => [styles.primaryBtn, focused ? focusRing : null]}>
          <Text style={styles.primaryBtnText}>{t('preview.allSetOpenStudentKare')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  welcome: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, letterSpacing: -0.4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  stepCard: { borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16, gap: space.s12, alignItems: 'center' },
  stepLabel: { alignSelf: 'flex-start', fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  selfieCircle: { width: 96, height: 96, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  captureBtn: { height: 48, paddingHorizontal: space.s24, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  captureBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  transferList: { width: '100%', gap: space.s8 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, borderRadius: radius.md, padding: space.s12, backgroundColor: color.surface3 },
  transferRowDone: { backgroundColor: color.positiveBg },
  transferTextDone: { color: color.positive },
  footer: { padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  primaryBtn: { height: 50, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
