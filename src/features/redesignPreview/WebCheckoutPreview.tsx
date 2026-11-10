import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of WebCheckout. Content from
 * design/screens/briefs/WebCheckout.md (Tier 2). Not wired, not replacing
 * anything. See NOTES.md.
 */
export function WebCheckoutPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="orders">
      <View style={styles.body}>
        <Text style={styles.h1}>{t('onboard.nav.checkout')}</Text>
        <View style={styles.row2}>
          <View style={styles.flexShrink}>
            <M2Card>
              <View style={styles.rowItem}><Icon name="house-outline" size={18} color={color.text3} /><Text style={styles.rowText}>{t('preview.deliverToHostelBlockRoom')}</Text></View>
              <View style={[styles.rowItem, styles.rowBorder]}><Icon name="credit-card-2" size={18} color={color.text3} /><Text style={styles.rowText}>{t('preview.payWithUpi')}</Text></View>
              <View style={[styles.rowItem, styles.rowBorder]}><Icon name="banknote-2" size={18} color={color.text3} /><Text style={styles.rowText}>{t('preview.18Paracetamol650mg1')}</Text></View>
            </M2Card>
            <View style={styles.trustRow}>
              <View style={styles.trustItem}><Icon name="lock-3" size={14} color={color.text3} /><Text style={m2Text.meta}>{t('preview.paymentIsEncrypted')}</Text></View>
              <View style={styles.trustItem}><Icon name="leaf-2" size={14} color={color.text3} /><Text style={m2Text.meta}>{t('preview.nothingSharedWithAdvertisers')}</Text></View>
            </View>
          </View>
          <M2Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('preview.orderTotal')}</Text>
            <View style={styles.summaryRow}><Text style={m2Text.meta}>{t('phone.cart.subtotal')}</Text><Text style={styles.summaryValue}>₹18</Text></View>
            <View style={styles.summaryRow}><Text style={m2Text.meta}>{t('partner.vlab.staff.role.Delivery')}</Text><Text style={styles.summaryValue}>{t('assist.wellness.free')}</Text></View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}><Text style={styles.summaryTotalLabel}>{t('phone.cart.total')}</Text><Text style={styles.summaryTotalValue}>₹18</Text></View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.placeOrder')} onPress={noop} style={({ focused }: PressState) => [styles.payBtn, focused ? focusRing : null]}>
              <Icon name="diamond" size={14} color={color.onAction} /><Text style={styles.payBtnText}>{t('preview.placeOrder')}</Text>
            </Pressable>
          </M2Card>
        </View>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s16, maxWidth: 920 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  row2: { flexDirection: 'row', gap: space.s20 },
  flexShrink: { flex: 1, minWidth: 0, gap: space.s12 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: color.ruleSoft },
  rowText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  trustRow: { flexDirection: 'row', gap: space.s16 },
  trustItem: { flexDirection: 'row', gap: space.s6, alignItems: 'center' },
  summaryCard: { width: 280, gap: space.s8 },
  summaryTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.s4 },
  summaryValue: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, color: color.text },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: color.ruleSoft, paddingTop: space.s8 },
  summaryTotalLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  summaryTotalValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  payBtn: { flexDirection: 'row', gap: space.s8, height: 44, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center', marginTop: space.s8 },
  payBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
