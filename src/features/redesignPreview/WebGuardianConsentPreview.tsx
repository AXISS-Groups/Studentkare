import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { M2Note, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { WebShellPreview } from './WebShellPreview';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of WebGuardianConsent — the
 * under-18 student's own "ask a parent or guardian to agree" page, per
 * design/screens/briefs/WebGuardianConsent.md (**Tier 1** — consent).
 * Per AGENTS.md/CLAUDE.md, a Tier-1 screen needs a named reviewer's
 * sign-off before real code; this is a flat, display-only mockup of the
 * brief's exact copy, not that sign-off — same caveat as every other
 * Tier-1 preview in this folder (M2MedicineInfo, FamilyCircle, Devices,
 * Teleconsult, WebGuardianApprove — see NOTES.md).
 *
 * Deliberately disabled continue button and placeholder inputs only — no
 * phone-number collection or OTP logic is implied as working. Not wired,
 * not replacing anything. See NOTES.md.
 */
export function WebGuardianConsentPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="verify">
      <View style={styles.row}>
        <View style={styles.main}>
          <View style={styles.under18Tag}><Text style={styles.under18TagText}>{t('preview.under18')}</Text></View>
          <Text style={styles.h1}>{t('preview.askAParentOrGuardianToAgree')}</Text>
          <Text style={m2Text.body}>{t('preview.youreUnder18SoLawNeedsGuardian')}</Text>

          <Text style={styles.fieldLabel}>{t('preview.theirName')}</Text>
          <View style={styles.input}><Text style={styles.inputPlaceholder}>{t('preview.egGuardianName')}</Text></View>

          <Text style={styles.fieldLabel}>{t('preview.theyAreYour')}</Text>
          <View style={styles.chipRow}>
            {[t('preview.mother'), t('preview.father'), t('preview.legalGuardian')].map((c, i) => (
              <View key={c} style={[styles.chip, i === 0 ? styles.chipActive : null]}><Text style={[styles.chipText, i === 0 ? styles.chipTextActive : null]}>{c}</Text></View>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t('preview.theirMobile')}</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}><Text style={styles.inputPlaceholder}>+91</Text></View>
            <View style={styles.phoneInput}><Text style={styles.inputPlaceholder}>{t('preview.tenDigitMobile')}</Text></View>
          </View>

          <M2Note tone="info" icon="message-square-text">
            {t('preview.theyGetSmsLinkConfirmWithCode')}
          </M2Note>

          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.sendTheConsentLink')} onPress={noop}
            style={({ focused }: PressState) => [styles.continueBtn, focused ? focusRing : null]}>
            <Text style={styles.continueBtnText}>{t('preview.sendTheConsentLink')}</Text>
          </Pressable>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.infoCard}>
            <Text style={m2Text.eyebrow}>{t('preview.whatYourGuardianAgreesTo')}</Text>
            <Text style={[m2Text.body, styles.infoLine]}>{t('preview.skKeepingRecordsSafely')}</Text>
            <Text style={[m2Text.body, styles.infoLine]}>{t('preview.youBookingTestsConsultsMedicines')}</Text>
            <Text style={[m2Text.body, styles.infoLine]}>{t('preview.theyDontGetToSeeRecordsReportsChats')}</Text>
            <Text style={[m2Text.body, styles.infoLine]}>{t('preview.counsellingSexualHealthStayPrivate')}</Text>
          </View>
          <M2Note tone="neutral" icon="shield">
            {t('preview.on18thBirthdayGuardianLinkEndsItself')}
          </M2Note>
        </View>
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.s24, padding: space.s24, alignItems: 'flex-start' },
  main: { flex: 1, gap: space.s10, maxWidth: 480 },
  under18Tag: { alignSelf: 'flex-start', paddingVertical: space.s4, paddingHorizontal: space.s10, borderRadius: radius.full, backgroundColor: color.actionSoft },
  under18TagText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action, letterSpacing: 0.4 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  fieldLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text3, marginTop: space.s8 },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: color.ruleSoft, justifyContent: 'center', paddingHorizontal: space.s14 },
  inputPlaceholder: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
  chipRow: { flexDirection: 'row', gap: space.s8 },
  chip: { height: 36, paddingHorizontal: space.s14, borderRadius: radius.full, borderWidth: 1, borderColor: color.ruleSoft, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: color.actionSoft, borderColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, color: color.text2 },
  chipTextActive: { color: color.action, fontWeight: fontWeight(font.weight.heavy) },
  phoneRow: { flexDirection: 'row', gap: space.s8 },
  phonePrefix: { width: 56, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: color.ruleSoft, alignItems: 'center', justifyContent: 'center' },
  phoneInput: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: color.ruleSoft, justifyContent: 'center', paddingHorizontal: space.s14 },
  continueBtn: { height: 48, borderRadius: radius.full, backgroundColor: color.actionSoft, alignItems: 'center', justifyContent: 'center', marginTop: space.s8 },
  continueBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  rightCol: { width: 300, gap: space.s16 },
  infoCard: { gap: space.s8, padding: space.s20, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  infoLine: {},
});
