import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of CheckinReceipt — the
 * "handover receipt" a student sees after collecting an order at the
 * counter, per design/screens/briefs/CheckinReceipt.md (**Tier 1** — a
 * record of how an identity check was performed). Per AGENTS.md/CLAUDE.md,
 * a Tier-1 screen needs a named reviewer's sign-off before real code; this
 * is a flat, display-only mockup of the brief's exact copy, not that
 * sign-off — same caveat as every other Tier-1 preview in this folder
 * (M2MedicineInfo, FamilyCircle, Devices, Teleconsult — see NOTES.md).
 *
 * Kept verbatim from the brief/screenshot: the face photo used to verify
 * the pickup is deleted the next day; only the bag photo stays with the
 * receipt. Not wired, not replacing anything. See NOTES.md.
 */
export function CheckinReceiptPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-checkin-receipt">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="chevron-left" size={18} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('preview.handoverReceipt')}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.successCard}>
          <View style={styles.successDot}>
            <Icon name="check" size={28} color={color.onAction} />
          </View>
          <Text style={styles.successTitle}>{t('preview.youCollectedOrderSk48120')}</Text>
          <Text style={styles.successMeta}>{t('preview.medplusBachupallyRaviPharmacistToday')}</Text>
        </View>

        <View style={styles.bagCard}>
          <View style={styles.bagPhoto}><Text style={styles.bagPhotoText}>{t('preview.bagPhoto')}</Text></View>
          <View style={styles.flexShrink}>
            <Text style={styles.bagTitle}>{t('preview.sealedBagLabelSk48120')}</Text>
            <Text style={styles.bagNote}>{t('preview.takenAtCounterBeforeHandoverCheckSeal')}</Text>
          </View>
        </View>

        <View style={styles.itemsCard}>
          <Text style={styles.itemsEyebrow}>{t('preview.whatsInIt')}</Text>
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{t('preview.cetirizine10Mg10Tabs')}</Text>
            <Text style={styles.itemPrice}>{t('preview.price38')}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{t('preview.azithromycin500Mg3Tabs')}</Text>
            <Text style={styles.itemPrice}>{t('preview.price112')}</Text>
          </View>
          <View style={styles.dosageNote}>
            <Text style={styles.dosageNoteText}>{t('preview.azithromycinInstructions')}</Text>
          </View>
        </View>

        <View style={styles.checkedCard}>
          <Text style={styles.checkedLine}>
            <Text style={styles.checkedBold}>{t('preview.howYouWereChecked')}</Text> {t('preview.passScannedFacePhotoMatched')}
          </Text>
          <Text style={styles.checkedLine}>
            <Text style={styles.checkedBold}>{t('preview.yourFacePhoto')}</Text> {t('preview.isDeletedTomorrowBagPhotoStays')}
          </Text>
        </View>

        <View style={styles.spacer} />

        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.somethingsWrongWithOrder')} onPress={noop}
          style={({ focused }: PressState) => [styles.reportBtn, focused ? focusRing : null]}>
          <Text style={styles.reportBtnText}>{t('preview.somethingsWrongWithOrder')}</Text>
        </Pressable>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.didntCollectThisReportIt')} onPress={noop}
          style={({ focused }: PressState) => [styles.denyLink, focused ? focusRing : null]}>
          <Text style={styles.denyLinkText}>{t('preview.didntCollectThisReportIt')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, minHeight: 1000, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s20, paddingBottom: space.s4 },
  backBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, paddingTop: space.s16, gap: space.s16 },
  successCard: { padding: space.s20, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, alignItems: 'center', gap: space.s10 },
  successDot: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: color.positiveFill, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  successMeta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2, textAlign: 'center' },
  bagCard: { padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, flexDirection: 'row', gap: space.s14, alignItems: 'center' },
  bagPhoto: { width: 96, height: 76, borderRadius: radius.md, backgroundColor: color.info, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bagPhotoText: { fontFamily: font.family.sans, fontSize: font.size.caption - 1, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  flexShrink: { flex: 1, minWidth: 0, gap: space.s2 },
  bagTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  bagNote: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, lineHeight: 18, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  itemsCard: { padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, gap: space.s10 },
  itemsEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2, letterSpacing: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  itemPrice: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.clinicalValue },
  dosageNote: { padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface3 },
  dosageNoteText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, lineHeight: 18, fontWeight: fontWeight(font.weight.strong), color: color.info },
  checkedCard: { padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface2, gap: space.s6 },
  checkedLine: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, lineHeight: 18, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  checkedBold: { fontWeight: fontWeight(font.weight.heavy), color: color.text },
  spacer: { height: space.s4 },
  reportBtn: { height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.action, alignItems: 'center', justifyContent: 'center' },
  reportBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  denyLink: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.s10 },
  denyLinkText: { fontFamily: font.family.sans, fontSize: font.size.caption + 1.5, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
});
