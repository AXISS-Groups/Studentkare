import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional preview — 2026-11-11 gap-analysis pass, round 2
 * (same round as `LabPackageSelectionPreview.tsx`, `PaymentRetrySheetPreview.tsx`
 * and `CarePlanBenefitsPreview.tsx` built alongside it; see NOTES.md). A
 * reference app's AI chatbot flow ("Ask Apollo") renders a structured
 * order-summary card inline inside the chat, not just a text reply. This
 * screen demonstrates that ONE new card pattern on its own — it is a
 * SEPARATE additional preview, not an edit to the real Tier 1
 * `M2AskAyushPreview.tsx` chat screen, and does not replace or wire into it.
 *
 * This is more than a visual tweak to that Tier 1 screen: letting an AI
 * assistant render a confirm-and-transact card inside a health-records chat
 * raises a product question this preview does not answer — what Ask Ayush
 * is allowed to add to a cart or place an order for on a student's behalf,
 * under what consent, and with what limits. That needs its own named-
 * reviewer decision and plan before any real build, per CLAUDE.md's Tier 1
 * rule and AGENTS.md's fail-closed / consent guardrails. Nothing here is
 * wired to navigation, a cart, a store, or a payment flow — every price,
 * item and address below is bracketed placeholder copy, and the "Confirm
 * order" and quick-reply buttons are `noop`.
 */
export function AskAyushOrderCardPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-ask-ayush-order-card">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} testID="order-card-back" />
        <Text style={styles.title}>Ask Ayush</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <View style={[styles.bubble, styles.studentBubble]}>
            <Text style={[styles.bubbleText, styles.studentBubbleText]}>[Can you order my usual vitamin D supplement?]</Text>
          </View>
          <View style={[styles.bubble, styles.ayushBubble]}>
            <Text style={styles.bubbleText}>[Sure — here's what I found and added to your cart:]</Text>
          </View>

          {/* The new pattern: an inline order-summary card sitting where a bot message would be. */}
          <M2Card style={styles.orderCard} testID="order-card">
            <View style={styles.orderHeaderRow}>
              <GlossTile icon="cart" hue="indigo" size={34} iconSize={17} />
              <Text style={m2Text.eyebrow}>ORDER SUMMARY</Text>
            </View>

            <View style={styles.itemRow}>
              <Text style={styles.itemName}>[Vitamin D3 60K · 1 strip]</Text>
              <Text style={styles.itemMeta}>[Qty 1 · ₹142]</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>[Calcium + D3 Tablets]</Text>
              <Text style={styles.itemMeta}>[Qty 1 · ₹198]</Text>
            </View>

            <View style={styles.ruleSoft} />

            <Text style={styles.detailLine}>[Deliver to: Hostel Block C, Room 214, SNIST Campus]</Text>
            <View style={styles.etaRow}>
              <Icon name="clock" size={14} color={color.text2} strokeWidth={2.1} />
              <Text style={styles.detailLine}>[Delivery by 6 PM today]</Text>
            </View>

            <View style={styles.ruleSoft} />

            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>[Items total]</Text>
              <Text style={styles.chargeValue}>[₹340]</Text>
            </View>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>[Delivery fee]</Text>
              <Text style={styles.chargeValue}>[₹20]</Text>
            </View>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabelTotal}>[Total]</Text>
              <Text style={styles.chargeValueTotal}>[₹360]</Text>
            </View>

            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel="Confirm order"
              onPress={noop}
              style={({ focused }: PressState) => [styles.confirmBtn, focused ? focusRing : null]}
            >
              <Icon name="check-circle-2" size={16} color={color.onAction} strokeWidth={2.1} />
              <Text style={styles.confirmBtnText}>[Confirm order]</Text>
            </Pressable>
          </M2Card>

          <View style={[styles.bubble, styles.ayushBubble]}>
            <Text style={styles.bubbleText}>[Want me to apply your Care Plan discount?]</Text>
          </View>
          <View style={styles.chipRow}>
            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel="Yes, apply discount"
              onPress={noop}
              style={({ focused }: PressState) => [styles.chip, styles.chipAction, focused ? focusRing : null]}
            >
              <Icon name="percent" size={14} color={color.onAction} strokeWidth={2.1} />
              <Text style={styles.chipTextOnAction}>[Yes, apply]</Text>
            </Pressable>
            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel="No thanks"
              onPress={noop}
              style={({ focused }: PressState) => [styles.chip, focused ? focusRing : null]}
            >
              <Text style={styles.chipText}>[No, thanks]</Text>
            </Pressable>
          </View>

          <M2Note tone="info" icon="message-circle" title="What this card can't do yet">
            This preview only shows the shape of an order card in chat. What Ayush is allowed to buy or confirm for you is a decision still to be made.
          </M2Note>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  headerSpacer: { width: 36, height: 36 },
  title: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s12 },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, padding: space.s12 },
  studentBubble: { alignSelf: 'flex-end', backgroundColor: color.action },
  ayushBubble: { alignSelf: 'flex-start', backgroundColor: color.surface },
  bubbleText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: 20 },
  studentBubbleText: { color: color.onAction },
  orderCard: { alignSelf: 'flex-start', maxWidth: '92%', gap: space.s8 },
  orderHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.s8 },
  itemName: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  itemMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  ruleSoft: { height: 1, backgroundColor: color.ruleSoft },
  detailLine: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, color: color.text2 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chargeLabel: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, color: color.text2 },
  chargeValue: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, color: color.text },
  chargeLabelTotal: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  chargeValueTotal: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, height: 44, borderRadius: radius.full, backgroundColor: color.action, marginTop: space.s4 },
  confirmBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onAction },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s12, height: 34, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, justifyContent: 'center' },
  chipAction: { backgroundColor: color.action, borderColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.action },
  chipTextOnAction: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onAction },
});
