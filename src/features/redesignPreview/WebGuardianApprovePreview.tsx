import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo, Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of WebGuardianApprove — the
 * page a parent/guardian opens from an SMS link to approve a minor's
 * account, per design/screens/briefs/WebGuardianApprove.md (**Tier 1** —
 * consent). Per AGENTS.md/CLAUDE.md, a Tier-1 screen needs a named
 * reviewer's sign-off before real code; this is a flat, display-only
 * mockup of the brief's exact copy, not that sign-off, same caveat as
 * every other Tier-1 preview in this folder (M2MedicineInfo, FamilyCircle,
 * Devices, Teleconsult — see NOTES.md). The guardian is not a Student Kare
 * account holder here, so this stands alone — no shell, no sign-in.
 *
 * The boundary the brief draws is kept verbatim and not softened: approving
 * does not grant the guardian access to records, reports, chats, or
 * counselling/sexual-health data — only Student Kare keeping records and
 * the student booking care. Not wired, not replacing anything. See NOTES.md.
 */
export function WebGuardianApprovePreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <BrandLogo size={22} />
            <Text style={styles.brandName}>{t('shell.brand.student')} <Text style={styles.brandNameItalic}>{t('shell.brand.kare')}</Text></Text>
          </View>
          <View style={styles.secureTag}>
            <Icon name="lock" size={12} color={color.positive} />
            <Text style={styles.secureTagText}>{t('preview.secureLink')}</Text>
          </View>
        </View>

        <Text style={styles.h1}>{t('preview.studentIsAskingForYourConsent', { name: '[Student name]' })}</Text>

        <View style={styles.studentRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{t('preview.studentInitialsPlaceholder')}</Text></View>
          <View style={styles.flexShrink}>
            <Text style={styles.studentName}>{t('preview.studentNameAge', { name: '[Student name]', age: '[age]' })}</Text>
            <Text style={m2Text.meta}>{t('preview.campusAskedYouAsRelation', { campus: '[Campus]', relation: '[relation]' })}</Text>
          </View>
        </View>

        <View style={styles.agreeBox}>
          <Text style={styles.agreeEyebrow}>{t('preview.ifYouAgree')}</Text>
          <View style={styles.bulletRow}><Icon name="check" size={14} color={color.positive} /><Text style={[m2Text.body, styles.flexShrink]}>{t('preview.skKeepsRecordsSecurelyLinkedAbha')}</Text></View>
          <View style={styles.bulletRow}><Icon name="check" size={14} color={color.positive} /><Text style={[m2Text.body, styles.flexShrink]}>{t('preview.studentCanBookTestsConsultsMedicines')}</Text></View>
        </View>

        <View style={styles.wontBox}>
          <Text style={styles.wontEyebrow}>{t('preview.whatYouWontGet')}</Text>
          <View style={styles.bulletRow}><View style={styles.dot} /><Text style={[m2Text.body, styles.flexShrink]}>{t('preview.noAccessToReportsPrescriptionsChats')}</Text></View>
          <View style={styles.bulletRow}><View style={styles.dot} /><Text style={[m2Text.body, styles.flexShrink]}>{t('preview.counsellingOrSexualHealthDetailsNever')}</Text></View>
        </View>

        <Text style={m2Text.meta}>{t('preview.emergencyCardSeparateConsentExpires')}</Text>

        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.iAgreeSendMeACode')} onPress={noop}
          style={({ focused }: PressState) => [styles.agreeBtn, focused ? focusRing : null]}>
          <Text style={styles.agreeBtnText}>{t('preview.iAgreeSendMeACode')}</Text>
        </Pressable>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.iDontAgree')} onPress={noop}
          style={({ focused }: PressState) => [styles.declineBtn, focused ? focusRing : null]}>
          <Text style={styles.declineBtnText}>{t('preview.iDontAgree')}</Text>
        </Pressable>

        <Text style={styles.footnote}>{t('preview.availableInLanguagesQuestions')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { minHeight: 760, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center', padding: space.s32 },
  card: { width: 600, gap: space.s14, backgroundColor: color.surface, padding: space.s32, borderRadius: radius.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', gap: space.s10, alignItems: 'center' },
  brandName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  brandNameItalic: { fontStyle: 'italic' },
  secureTag: { flexDirection: 'row', gap: space.s6, alignItems: 'center' },
  secureTagText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  h1: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  studentRow: { flexDirection: 'row', gap: space.s12, alignItems: 'center', padding: space.s14, borderRadius: radius.md, backgroundColor: color.surface2 },
  avatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  flexShrink: { flex: 1, minWidth: 0 },
  studentName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  agreeBox: { gap: space.s8, padding: space.s14, borderRadius: radius.md, backgroundColor: color.positiveBg },
  agreeEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive, letterSpacing: 0.4 },
  wontBox: { gap: space.s8, padding: space.s14, borderRadius: radius.md, backgroundColor: color.actionSoft },
  wontEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action, letterSpacing: 0.4 },
  bulletRow: { flexDirection: 'row', gap: space.s8, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.action, marginTop: space.s6 },
  agreeBtn: { height: 52, borderRadius: radius.md, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center', marginTop: space.s6 },
  agreeBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  declineBtn: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: color.ruleSoft, alignItems: 'center', justifyContent: 'center' },
  declineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  footnote: { textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, marginTop: space.s4 },
});
