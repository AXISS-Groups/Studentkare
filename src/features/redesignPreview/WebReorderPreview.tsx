import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, Illustration } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of WebReorder ("Buy again &
 * ratings") — the web counterpart of M2Reorder, with the brief's own
 * "ratings" framing: a request for the student's own rating of a past
 * order, not a public review of a product. Content from
 * design/screens/briefs/WebReorder.md (Tier 2). Not wired, not replacing
 * anything. See NOTES.md. Carries the brief's 5 required illustrations:
 * verified-badge + lock-shield + rupee-receipt in the trust strip,
 * hostel-pin on the delivery note, confused-buyer on the Ask Ayush prompt.
 */
export function WebReorderPreview(): React.ReactElement {
  return (
    <WebShellPreview route="buy-again">
      <View style={styles.body}>
        <Text style={styles.h1}>Buy again</Text>
        <M2Card>
          <View style={styles.row}>
            <GlossTile icon="bottle-pump" hue="teal" size={48} />
            <View style={styles.flexShrink}>
              <Text style={styles.name}>[Paracetamol 650 mg] · pack of 15</Text>
              <View style={styles.priceRow}><Text style={styles.price}>₹18</Text><Text style={styles.mrp}>₹35</Text></View>
            </View>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel="Reorder" onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
              <Icon name="repeat" size={14} color={color.onAction} /><Text style={styles.fillBtnText}>Reorder</Text>
            </Pressable>
          </View>
          <View style={styles.rateRow}>
            <Text style={m2Text.meta}>How was this order?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="sparkle" size={16} color={color.text3} />)}
            </View>
          </View>
        </M2Card>
        <M2Note tone="info" icon="lock-2" title="Your rating stays private">
          It helps us, not a public review others can see.
        </M2Note>

        <View style={styles.trustStrip}>
          <View style={styles.trustItem}>
            <Illustration name="illustration-verified-badge" size={56} withoutText />
            <Text style={styles.trustLabel}>Verified listing</Text>
          </View>
          <View style={styles.trustItem}>
            <Illustration name="illustration-lock-shield" size={56} withoutText />
            <Text style={styles.trustLabel}>Payment is encrypted</Text>
          </View>
          <View style={styles.trustItem}>
            <Illustration name="illustration-rupee-receipt" size={56} withoutText />
            <Text style={styles.trustLabel}>Today's price, checked fresh</Text>
          </View>
        </View>

        <M2Card style={styles.deliveryCard}>
          <View style={styles.row}>
            <Illustration name="illustration-hostel-pin" size={48} withoutText />
            <View style={styles.flexShrink}>
              <Text style={styles.name}>Delivered to [Hostel block], Room [—]</Text>
              <Text style={m2Text.meta}>Same address as last time</Text>
            </View>
          </View>
        </M2Card>

        <M2Card style={styles.askCard}>
          <View style={styles.row}>
            <Illustration name="illustration-confused-buyer" size={56} withoutText />
            <View style={styles.flexShrink}>
              <Text style={styles.name}>Not sure what to reorder?</Text>
              <Text style={m2Text.meta}>Ask Ayush about your last few orders.</Text>
            </View>
          </View>
        </M2Card>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s16, maxWidth: 780 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s16 },
  flexShrink: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  priceRow: { flexDirection: 'row', gap: space.s8, alignItems: 'center', marginTop: space.s2 },
  price: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  mrp: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textDecorationLine: 'line-through' },
  fillBtn: { flexDirection: 'row', gap: space.s6, height: 36, paddingHorizontal: space.s14, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s12, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  starRow: { flexDirection: 'row', gap: space.s4 },
  trustStrip: { flexDirection: 'row', gap: space.s16 },
  trustItem: { flex: 1, alignItems: 'center', gap: space.s8 },
  trustLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text2, textAlign: 'center' },
  deliveryCard: {},
  askCard: {},
});
