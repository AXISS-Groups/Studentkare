import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, Rise } from '@/design-system';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { IconTile, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { orderRef } from '@/features/phoneKit/orderRef';
import { plural } from '@/features/phoneKit/plural';

const PAID = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

/**
 * Order placed (canvas OrderSuccess, SK-062): the order as the server has it
 * — reference, how it reaches the student, what was paid — and the way to
 * track it. Shown once the Pay step has confirmed the payment with the server.
 *
 * Left out from the board: an arrival time and a WhatsApp ping (the provider
 * confirms times; no message is promised), and points earned on this order
 * (the points ledger does not tie points to orders).
 */
export function OrderSuccessView({ order, savedPaise, art, onTrack, onShop }: {
  order: LiveOrder; savedPaise: number; art?: ArtSource; onTrack: () => void; onShop: () => void;
}) {
  const t = useT();
  const paid = PAID.has(order.paymentStatus);
  const d = order.delivery;
  const rows: { key: string; icon: SkIconName; title: string; meta: string }[] = [
    {
      key: 'delivery', icon: 'truck-2',
      title: d.mode === 'pickup' ? t('phone.success.pickup') : t('phone.success.delivery'),
      meta: [d.mode === 'delivery' ? d.address : '', d.city, d.pincode].filter(Boolean).join(' · '),
    },
    {
      key: 'paid', icon: 'credit-card-2',
      title: paid ? t('phone.success.paid', { amount: money(order.totalPaise) }) : t('phone.success.unpaid', { amount: money(order.totalPaise) }),
      meta: savedPaise > 0 ? t('phone.success.saved', { amount: money(savedPaise) }) : plural(t, order.lines.length, 'phone.success.itemsOne', 'phone.success.items'),
    },
    { key: 'points', icon: 'sparkle', title: t('phone.success.points'), meta: t('phone.shop.pointsNote') },
  ];
  return (
    <ScrollView style={phoneLayout.screen} contentContainerStyle={styles.content} testID="order-success">
      <View style={styles.artWrap}>
        {art ? <Image source={art} style={styles.art} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} /> : null}
        <View style={styles.check} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="check" size={24} color={color.onAction} strokeWidth={3} />
        </View>
      </View>
      <View style={styles.head} role="status" accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={[phoneText.display, styles.center]}>{t('phone.success.title')}</Text>
        <Text style={[phoneText.body, styles.center]}>{paid ? t('phone.success.body') : t('phone.success.bodyUnpaid')}</Text>
        <View style={styles.ref}>
          <Text style={phoneText.meta}>{t('phone.success.order')}</Text>
          <Text style={styles.refCode} testID="order-ref">{orderRef(order.id)}</Text>
        </View>
      </View>
      {rows.map((r, i) => (
        <Rise key={r.key} index={i}>
          <View style={styles.row}>
            <IconTile icon={r.icon} size={40} />
            <View style={phoneLayout.grow}>
              <Text style={phoneText.title}>{r.title}</Text>
              {r.meta ? <Text style={phoneText.meta}>{r.meta}</Text> : null}
            </View>
          </View>
        </Rise>
      ))}
      <View style={styles.ctas}>
        <Button label={t('phone.success.track')} size="cta" fullWidth onPress={onTrack} icon={<Icon name="arrow-right" size={18} color={color.onAction} />} testID="success-track" />
        <Button label={t('phone.success.backToShop')} variant="secondary" size="cta" fullWidth onPress={onShop} testID="success-shop" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.gutterPhone, paddingTop: space.s32, paddingBottom: space.s32, gap: space.s14 },
  artWrap: { alignSelf: 'center', width: 210, height: 210 },
  art: { width: 210, height: 210, borderRadius: radius.full },
  check: {
    position: 'absolute', right: space.s14, bottom: space.s32, width: 52, height: 52, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.positive, borderWidth: 3, borderColor: color.surface,
  },
  head: { alignItems: 'center', gap: space.s10 },
  center: { textAlign: 'center' },
  ref: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.s16, paddingVertical: space.s8, borderRadius: radius.full, backgroundColor: color.surface3 },
  refCode: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  ctas: { gap: space.s12, marginTop: space.s8 },
});
