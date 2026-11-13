import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

const RULE_KEYS = [
  'preview.doctorsNameRegistrationSignatureVisible',
  'preview.dateWithinLast6Months',
  'preview.yourNameMatchesAccountName',
  'preview.wholePageInFrameAndFocus',
] as const;

/**
 * Flat, non-functional 1mg-inspired preview of PrescriptionUpload — the
 * upload screen for a scheduled medicine's prescription, per
 * design/screens/briefs/PrescriptionUpload.md (**Tier 1** — the uploaded
 * document becomes part of the student's clinical record). Per
 * AGENTS.md/CLAUDE.md, a Tier-1 screen needs a named reviewer's sign-off
 * before real code; this is a flat, display-only mockup of the brief's
 * exact copy, not that sign-off — same caveat as every other Tier-1
 * preview in this folder (M2MedicineInfo, FamilyCircle, Devices,
 * Teleconsult — see NOTES.md).
 *
 * The commerce-firewall line from the brief is kept verbatim: the upload
 * goes to the student's vault for a pharmacist to review, never to the
 * shop, and is never used to choose what the student is shown (AGENTS.md
 * rule 4). No camera or file picker is wired — both buttons are static.
 * Not wired, not replacing anything. See NOTES.md.
 */
export function PrescriptionUploadPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-prescription-upload">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={18} color={color.text} />
        </Pressable>
        <View style={styles.flexShrink}>
          <Text style={styles.title}>{t('preview.uploadPrescription')}</Text>
          <Text style={styles.subtitle}>{t('preview.neededForScheduledMedicinesOnly')}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.dropZone}>
          <View style={styles.dropIcon}>
            <Icon name="file-text" size={30} color={color.action} />
          </View>
          <Text style={styles.dropTitle}>{t('preview.takePhotoOrPickFile')}</Text>
          <Text style={styles.dropMeta}>{t('preview.jpgPngPdfUpTo10Mb')}</Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.camera')} onPress={noop} style={({ focused }: PressState) => [styles.cameraBtn, focused ? focusRing : null]}>
            <Icon name="camera" size={18} color={color.onAction} />
            <Text style={styles.cameraBtnText}>{t('preview.camera')}</Text>
          </Pressable>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.files')} onPress={noop} style={({ focused }: PressState) => [styles.filesBtn, focused ? focusRing : null]}>
            <Icon name="share" size={18} color={color.text2} />
            <Text style={styles.filesBtnText}>{t('preview.files')}</Text>
          </Pressable>
        </View>

        <View style={styles.rulesCol}>
          <Text style={styles.rulesEyebrow}>{t('preview.whatMakesItValid')}</Text>
          {RULE_KEYS.map((key) => (
            <View key={key} style={styles.ruleRow}>
              <View style={styles.ruleDot}>
                <Icon name="check" size={12} color={color.action} />
              </View>
              <Text style={styles.ruleText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.footerNote}>
          <Icon name="lock-5" size={18} color={color.action} />
          <Text style={styles.footerNoteText}>{t('preview.pharmacistReviewsEveryUploadVault')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone, paddingBottom: space.s16, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  backBtn: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  flexShrink: { flex: 1, minWidth: 0, gap: space.s2 },
  title: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, letterSpacing: -0.4 },
  subtitle: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  body: { flex: 1, paddingHorizontal: space.gutterPhone, paddingTop: space.s20, gap: space.s14 },
  dropZone: { height: 216, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: color.rule, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', gap: space.s14 },
  dropIcon: { width: 68, height: 68, borderRadius: radius.lg, backgroundColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  dropMeta: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  actionsRow: { flexDirection: 'row', gap: space.s10 },
  cameraBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, height: 50, borderRadius: radius.full, backgroundColor: color.action },
  cameraBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 1.5, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  filesBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, height: 50, borderRadius: radius.full, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  filesBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption + 1.5, fontWeight: fontWeight(font.weight.strong), color: color.text },
  rulesCol: { marginTop: space.s8, gap: space.s10 },
  rulesEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2, letterSpacing: 1.1 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10 },
  ruleDot: { width: 22, height: 22, borderRadius: radius.full, backgroundColor: color.actionSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption + 1, lineHeight: 19, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  spacer: { flexGrow: 1, minHeight: space.s20 },
  footerNote: { flexDirection: 'row', gap: space.s10, padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, marginBottom: space.s20 },
  footerNoteText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption - 0.5, lineHeight: 17, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
});
