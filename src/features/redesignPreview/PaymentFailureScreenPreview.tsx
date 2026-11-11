import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional preview — 2026-11-11 gap-analysis pass, round 4
 * (follow-up video re-watch of `v1929` / Tata 1mg, same batch as the
 * `HomeCollectionStatusPreview.tsx` and `CommerceExtrasPreview.tsx`
 * additions made alongside it; see `NOTES.md`). The reference recording's
 * payment failure shows up in two different shapes depending on where in
 * the flow it happens: a bottom sheet over the checkout page (already
 * built as `PaymentRetrySheetPreview.tsx`), and — separately — a dedicated
 * full-screen state after the payment-gateway redirect returns an error,
 * with no checkout content visible behind it at all. This screen is the
 * second shape; it is a new, separate preview, not an edit to
 * `PaymentRetrySheetPreview.tsx`, and does not replace or wire into it.
 *
 * Commerce-only UI, not clinical, so the same lighter touch as
 * `PaymentRetrySheetPreview.tsx`: a preview only, not wired to navigation,
 * a cart, or any payment gateway. Every amount, order ID and reason string
 * is bracketed placeholder copy. "Retry payment" and "Pay by Cash on
 * Delivery instead" are `noop`.
 *
 * Built only from approved pieces: `GlossTile`, `M2Card`, `M2Note`,
 * `RoundButton`, `m2Text` from `@/design-system/m2`; `Icon` from
 * `@/design-system/icons`, limited to `shield-alert` (failure tile,
 * reused from `PaymentRetrySheetPreview.tsx`), `check-circle-2` (retry
 * button), `credit-card-2` (alternate-method row) and `arrow-right` — all
 * confirmed in `design/icons/icon-manifest.json` before use. Tokens only.
 */
export function PaymentFailureScreenPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-payment-failure-screen">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>{t('preview.checkout')}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.center}>
          <GlossTile icon="shield-alert" hue="danger" size={72} iconSize={34} />
          <Text style={styles.title}>{t('preview.paymentFailed')}</Text>
          <Text style={styles.subtitle}>{t('preview.yourBankDeclinedThisTransactionYouHaveNot')}</Text>
        </View>

        <M2Card style={styles.orderCard} testID="preview-payment-failure-order-card">
          <Text style={m2Text.eyebrow}>{t('preview.orderId')}</Text>
          <View style={styles.orderRow}>
            <Text style={m2Text.body}>{t('preview.sk48213')}</Text>
            <Text style={m2Text.price}>[₹486]</Text>
          </View>
          <Text style={m2Text.meta}>{t('preview.2LabTestsDeliveryToYourHostelAddress')}</Text>
        </M2Card>

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
          accessibilityLabel={t('preview.payByCashOnDeliveryInstead')}
          onPress={noop}
          style={({ focused }: PressState) => [styles.secondaryBtn, focused ? focusRing : null]}
        >
          <Icon name="credit-card-2" size={16} color={color.action} />
          <Text style={styles.secondaryBtnText}>{t('preview.payByCashOnDeliveryInstead')}</Text>
        </Pressable>

        <M2Note tone="neutral" icon="clock" testID="preview-payment-failure-support-note">
          {t('preview.needHelpContactSupportYourCartIsSaved')}
        </M2Note>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { flex: 1, paddingHorizontal: space.gutterPhone, paddingTop: space.s24, gap: space.s16 },
  center: { alignItems: 'center', gap: space.s8, paddingHorizontal: space.s16 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  subtitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text3, textAlign: 'center' },
  orderCard: { gap: space.s6, marginTop: space.s8 },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retryBtn: { flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  secondaryBtn: { flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
