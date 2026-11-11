import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, shadowStyle, shadow, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional preview: a payment-retry bottom sheet and a loyalty/
 * coins commerce card, built from the 2026-11-11 gap-analysis pass (same
 * round as `LabPackageDetailPreview.tsx`, `SecondOpinionPreview.tsx`,
 * `AISkinScanPreview.tsx`, `InsurancePlanBuilderPreview.tsx`). Both patterns
 * were missing from this folder: nothing shows a failed-payment recovery
 * moment, and nothing shows the coins/discount side of commerce separate
 * from a specific order. This is commerce-only UI, not clinical, so — same
 * lighter touch as `ReferFriendPreview.tsx`/`DoctorComparePreview.tsx` —
 * just a preview, not wired, pending a product/design review before any of
 * this is built for real. Not replacing anything. See NOTES.md.
 */
export function PaymentRetrySheetPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-payment-retry-sheet">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>{t('preview.checkout')}</Text>
      </View>

      <View style={styles.body}>
        <M2Card style={styles.orderCard} testID="preview-payment-retry-order-card">
          <Text style={m2Text.eyebrow}>{t('preview.orderSummary2')}</Text>
          <View style={styles.orderRow}>
            <Text style={m2Text.body}>{t('preview.2Items')}</Text>
            <Text style={m2Text.price}>[₹486]</Text>
          </View>
          <Text style={m2Text.meta}>{t('preview.deliveryToYourHostelAddress')}</Text>
        </M2Card>

        <M2Card testID="preview-payment-retry-loyalty-card">
          <View style={styles.loyaltyRow}>
            <GlossTile icon="star-filled" hue="amber" size={48} />
            <View style={styles.loyaltyWords}>
              <Text style={styles.loyaltyBalance}>{t('preview.120CoinsEarned')}</Text>
              <Text style={m2Text.meta}>{t('preview.useCoinsOnYourNextOrder')}</Text>
            </View>
          </View>
          <View style={styles.loyaltyTagRow}>
            <M2Pill label="[2x bonus · ends in 3 days]" tone="attention" icon="clock" />
          </View>
        </M2Card>
      </View>

      <View style={styles.backdrop} pointerEvents="none" testID="preview-payment-retry-backdrop" />

      <View style={styles.sheet} testID="preview-payment-retry-sheet-panel">
        <View style={styles.sheetGrip} />

        <GlossTile icon="shield-alert" hue="danger" size={48} />
        <Text style={styles.sheetTitle}>{t('preview.paymentFailed')}</Text>
        <Text style={styles.sheetBody}>{t('preview.yourBankDeclinedThisTransaction')}</Text>

        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('preview.retryPayment')}
          onPress={noop}
          style={({ focused }: PressState) => [styles.retryBtn, focused ? focusRing : null]}
        >
          <Icon name="check-circle-2" size={16} color={color.onAction} />
          <Text style={styles.retryBtnText}>{t('preview.retryPayment')}</Text>
        </Pressable>

        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('preview.useADifferentPaymentMethod')}
          onPress={noop}
          style={({ focused }: PressState) => [styles.secondaryBtn, focused ? focusRing : null]}
        >
          <Text style={styles.secondaryBtnText}>{t('preview.useADifferentPaymentMethod')}</Text>
        </Pressable>

        <M2Note tone="neutral" icon="clock" testID="preview-payment-retry-support-note">
          {t('preview.needHelpContactSupport')}
        </M2Note>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s12 },
  orderCard: { gap: space.s6 },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loyaltyRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  loyaltyWords: { flex: 1, gap: space.s2 },
  loyaltyBalance: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  loyaltyTagRow: { flexDirection: 'row', marginTop: space.s10 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.s20,
    gap: space.s12,
    alignItems: 'center',
    ...shadowStyle(shadow.float),
  },
  sheetGrip: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: color.ruleSoft, marginBottom: space.s4 },
  sheetTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  sheetBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text3, textAlign: 'center' },
  retryBtn: { alignSelf: 'stretch', flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  secondaryBtn: { alignSelf: 'stretch', height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
