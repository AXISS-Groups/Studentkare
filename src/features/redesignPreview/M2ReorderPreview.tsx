import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2Reorder. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2Reorder.md (Tier 2: checkout of an earlier order,
 * every price shown before paying). Not wired, not replacing the real
 * screen. See NOTES.md.
 */
export function M2ReorderPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-reorder">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
          <Text style={styles.title}>{t('pb.yc.reorder')}</Text>
        </View>
        <View style={styles.body}>
          <M2Note tone="info" icon="clock">{t('preview.todaySPriceAndStockCheckedAt9')}</M2Note>

          <M2Card style={styles.lineCard}>
            <View style={styles.lineRow}>
              <GlossTile icon="pill-3" hue="teal" size={44} />
              <View style={styles.flexShrink}>
                <Text style={styles.lineName}>{t('preview.paracetamol650MgPackOf15Qty1')}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.linePrice}>₹18</Text>
                  <Text style={styles.lineMrp}>₹35</Text>
                </View>
              </View>
              <M2Pill label="In stock" tone="positive" icon="check" />
            </View>
          </M2Card>

          <M2Card style={styles.lineCard}>
            <View style={styles.lineRow}>
              <GlossTile icon="first-aid-kit" hue="orange" size={44} />
              <View style={styles.flexShrink}>
                <Text style={styles.lineName}>{t('preview.orsRehydrationSachetsBoxOf10')}</Text>
                <Text style={m2Text.meta}>{t('mi.rxNeeded')}</Text>
              </View>
              <M2Pill label="Needs Rx" tone="attention" icon="alert-triangle" />
            </View>
            <View style={styles.rxActions}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('landing.labtests.quick.uploadRx')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="doc-upload" size={14} color={color.action} /><Text style={styles.outlineBtnText}>{t('preview.uploadPrescription')}</Text>
              </Pressable>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('assist.ayush.noSource.book')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="stethoscope" size={14} color={color.action} /><Text style={styles.outlineBtnText}>{t('assist.ayush.noSource.book')}</Text>
              </Pressable>
            </View>
          </M2Card>

          <M2Card>
            <View style={styles.deliveryRow}>
              <Icon name="map-pin" size={18} color={color.text3} />
              <Text style={styles.deliveryText}>{t('preview.deliverToHostelBlockRoom')}</Text>
            </View>
            <View style={[styles.deliveryRow, styles.deliveryRowBorder]}>
              <Icon name="credit-card" size={18} color={color.text3} />
              <Text style={styles.deliveryText}>{t('preview.payWithUpi')}</Text>
            </View>
          </M2Card>
        </View>
      </View>
      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>{t('preview.totalInStockLinesOnly')}</Text>
          <Text style={styles.totalValue}>₹18</Text>
        </View>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.pay')} onPress={noop} style={({ focused }: PressState) => [styles.payBtn, focused ? focusRing : null]}>
          <Icon name="lock" size={14} color={color.onAction} /><Text style={styles.payBtnText}>{t('preview.pay18')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s16 },
  lineCard: { gap: space.s10 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  flexShrink: { flex: 1, minWidth: 0 },
  lineName: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  priceRow: { flexDirection: 'row', gap: space.s8, alignItems: 'center', marginTop: space.s2 },
  linePrice: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  lineMrp: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textDecorationLine: 'line-through' },
  rxActions: { flexDirection: 'row', gap: space.s8 },
  outlineBtn: { flex: 1, flexDirection: 'row', gap: space.s6, height: 36, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s10 },
  deliveryRowBorder: { borderTopWidth: 1, borderTopColor: color.ruleSoft },
  deliveryText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  totalLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  totalValue: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  payBtn: { flexDirection: 'row', gap: space.s8, height: 48, paddingHorizontal: space.s20, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
