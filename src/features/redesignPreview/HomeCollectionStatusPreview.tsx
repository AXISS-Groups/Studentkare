import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Accordion, StarRating, StatusPill } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

interface Testimonial {
  id: string;
  rating: number;
  quote: string;
  attribution: string;
}

/** 2026-11-11 addition (round 4): the reference video's "rate your order"
 * strip paginates across multiple past orders (Blinkit catalog item 8),
 * not just one — so this is a small horizontal set, not a single card. */
const TESTIMONIALS: ReadonlyArray<Testimonial> = [
  { id: 't1', rating: 5, quote: '[“The technician was on time, gentle, and explained every step before drawing the sample.”]', attribution: '[— Priya S., verified patient]' },
  { id: 't2', rating: 5, quote: '[“Got a message the moment the sample reached the lab. No guessing.”]', attribution: '[— Arjun M., verified patient]' },
];

/**
 * Flat, non-functional preview of a "your home sample collection is on the
 * way" status screen, part of the same 2026-11-11 gap-analysis pass (round
 * 2) as the other dated `NOTES.md` entries. It demonstrates 3 small card
 * patterns reference-app videos showed that this repo didn't have yet: a
 * phlebotomist/home-visit staff credentials card, a testimonial card, and a
 * compact secondary promo strip (distinct from the full gradient hero
 * banners used elsewhere, e.g. `LabPackageDetailPreview.tsx`'s cross-sell
 * card). No `design/screens/briefs/*` entry exists for this screen — same
 * net-new footing as `LabPrep`, `DoctorCompare`, `ReferFriend`.
 *
 * This is commerce/logistics content, not clinical, so the caution here is
 * lighter than a Tier 1 screen's — same weight as `ReferFriendPreview.tsx`.
 * One thing is still flagged deliberately: the phlebotomist's name, photo,
 * "ID verified" badge and rating are bracketed placeholder copy standing in
 * for a UI shape, not a real verified identity. If this is built for real,
 * the verification badge must be backed by an actual checked credential
 * (and fail closed if that check can't complete), never a decorative icon.
 * 2026-11-11 additions (round 4, reference-video re-watch findings): a
 * "[Collection fulfilled by Partner Lab]" attribution strip (`flask-2`
 * icon, confirmed in the manifest) between the status card and the
 * phlebotomist card; a "[Preparations guide]" row built from the shared
 * `Accordion` component (not a hand-rolled expandable row) placed after
 * the phlebotomist card; and the single testimonial card replaced with a
 * horizontally-paginated set of 2, with a dot-pagination row below
 * (first dot active, non-functional beyond local scroll-position
 * tracking) — matching the "rate your order experience" paginated strip
 * seen in the Blinkit reference recording
 * (`video-review/frames/v2021/report.md`, catalog item 8), rather than
 * a single static card.
 *
 * Not wired into navigation, routing, or `studentPhoneBoards.tsx`, and not
 * replacing anything. See `NOTES.md`.
 */
export function HomeCollectionStatusPreview(): React.ReactElement {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  return (
    <View style={styles.screen} testID="preview-home-collection-status">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel="Back" onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>[Your sample collection]</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Card testID="preview-home-collection-status-card">
            <View style={styles.statusRow}>
              <StatusPill tone="action" dot="live">[Technician on the way — ETA 20 mins]</StatusPill>
            </View>
            <Text style={m2Text.meta}>[Arriving at your saved address: Flat 4B, placeholder street, placeholder city.]</Text>
          </M2Card>

          <View style={styles.fulfillmentStrip} testID="preview-home-collection-fulfillment-strip">
            <Icon name="flask-2" size={16} color={color.text2} strokeWidth={2} />
            <Text style={styles.fulfillmentText}>[Collection fulfilled by Partner Lab — placeholder name]</Text>
          </View>

          <M2Card style={styles.phlebCard} testID="preview-home-collection-phlebotomist">
            <View style={styles.phlebTop}>
              <GlossTile icon="user" hue="indigo" size={56} />
              <View style={styles.phlebWords}>
                <Text style={styles.phlebName}>[Rohit K.]</Text>
                <Text style={m2Text.meta}>[Certified phlebotomist]</Text>
                <View style={styles.verifyRow}>
                  <Icon name="shield-check" size={14} color={color.positive} strokeWidth={2.2} />
                  <Text style={styles.verifyText}>[ID verified]</Text>
                </View>
              </View>
            </View>
            <StarRating value={4.9} testID="preview-home-collection-phlebotomist-rating" label="(4.9)" />
            <View style={styles.contactRow}>
              <RoundButton icon="phone" label="Call technician" onPress={noop} testID="preview-home-collection-call" />
              <RoundButton icon="message-circle" label="Message technician" onPress={noop} testID="preview-home-collection-message" />
            </View>
          </M2Card>

          <Accordion
            testID="preview-home-collection-prep-guide"
            items={[
              {
                id: 'prep-guide',
                title: '[Preparations guide]',
                content: '[Fast for 8–10 hours before collection — water is fine. Keep your government ID ready. Wear a sleeve that rolls up easily for the blood draw.]',
              },
            ]}
          />

          <Pressable role="button" accessibilityRole="button" accessibilityLabel="Add a free follow-up consult and save more — ends today" onPress={noop} style={({ focused }: PressState) => [styles.promoStrip, focused ? focusRing : null]} testID="preview-home-collection-promo-strip">
            <Icon name="percent" size={16} color={color.action} strokeWidth={2.2} />
            <Text style={styles.promoText}>[Add a free follow-up consult and save more — ends today]</Text>
            <Icon name="chevron-right" size={16} color={color.text3} />
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.testimonialCarousel}
            contentContainerStyle={styles.testimonialCarouselContent}
            onMomentumScrollEnd={(e: { nativeEvent: { contentOffset: { x: number } } }) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / 342);
              setActiveTestimonial(Math.min(Math.max(page, 0), TESTIMONIALS.length - 1));
            }}
            testID="preview-home-collection-testimonial-carousel"
          >
            {TESTIMONIALS.map((item) => (
              <M2Card key={item.id} style={styles.testimonialCard} testID={`preview-home-collection-testimonial-${item.id}`}>
                <StarRating value={item.rating} testID={`preview-home-collection-testimonial-rating-${item.id}`} size={16} />
                <Text style={styles.quote}>{item.quote}</Text>
                <Text style={m2Text.meta}>{item.attribution}</Text>
              </M2Card>
            ))}
          </ScrollView>
          <View style={styles.dotsRow} testID="preview-home-collection-testimonial-dots">
            {TESTIMONIALS.map((item, i) => (
              <View key={item.id} style={[styles.dot, i === activeTestimonial ? styles.dotActive : null]} />
            ))}
          </View>

          <M2Note tone="info" icon="clock">
            [Reports are usually ready within 24 hours of collection and appear in your account automatically.]
          </M2Note>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1120, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s16, gap: space.s16 },
  statusRow: { flexDirection: 'row', marginBottom: space.s8 },
  phlebCard: { gap: space.s12 },
  phlebTop: { flexDirection: 'row', gap: space.s12, alignItems: 'center' },
  phlebWords: { flex: 1, gap: space.s4 },
  phlebName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  verifyText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  contactRow: { flexDirection: 'row', gap: space.s12 },
  promoStrip: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingVertical: space.s10, paddingHorizontal: space.s12, borderRadius: radius.lg, backgroundColor: color.surface3 },
  promoText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text },
  fulfillmentStrip: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  fulfillmentText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  testimonialCarousel: { marginHorizontal: -space.gutterPhone },
  testimonialCarouselContent: { paddingHorizontal: space.gutterPhone, gap: space.s12 },
  testimonialCard: { width: 330, gap: space.s8 },
  quote: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontStyle: 'italic', fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: space.s6, marginTop: space.s4 },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.ruleStrong },
  dotActive: { backgroundColor: color.action, width: 16 },
});
