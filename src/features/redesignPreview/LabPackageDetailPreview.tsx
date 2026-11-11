import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Accordion } from '@/design-system/Accordion';
import { StarRating } from '@/design-system/StarRating';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, GradientHeroCard, M2Card, M2Note, M2Pill, heroStops, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

const INCLUDED_ITEMS: ReadonlyArray<{ id: string; title: string; content: string; defaultOpen?: boolean }> = [
  { id: 'tests', title: '[45 tests included]', content: '[CBC, lipid profile, liver function, kidney function, thyroid panel and 40 more — full list shown here.]', defaultOpen: true },
  { id: 'why', title: 'Why this package', content: '[A short note on who this package suits and what it screens for, in the lab’s own words.]' },
  { id: 'turnaround', title: 'Report turnaround', content: '[Reports are ready within N hours of sample collection and sent to your account.]' },
];

const FAQ_ITEMS: ReadonlyArray<{ id: string; title: string; content: string }> = [
  { id: 'fasting', title: '[Do I need to fast before this test?]', content: '[Fasting guidance for this specific package, from the lab’s own preparation notes.]' },
  { id: 'home', title: '[Is home sample collection available?]', content: '[Home collection availability and any extra charge, if applicable.]' },
  { id: 'validity', title: '[How long is this report valid for?]', content: '[Validity window for this package’s results, as stated by the lab.]' },
];

/**
 * Flat, non-functional preview of a lab-package detail screen, modelled on
 * Apollo 24|7's lab-package detail page (reference-app screen recordings
 * reviewed 2026-11-11). This repo had no single screen combining a
 * social-proof badge, an expandable "what's included"/FAQ accordion, a
 * doctor-recommendation card, a cross-sell banner and a star-rating
 * feedback moment — `M2ProductPreview.tsx` covers single-item medicine
 * detail and `LabComparePreview.tsx`/`LabPrepPreview.tsx` cover comparison
 * and sample-collection prep, but none of them are this page. Built from
 * this gap-analysis pass, not from a `design/screens/briefs/*` entry — this
 * screen has no brief yet.
 *
 * Per AGENTS.md rule 4 (commerce firewall) the social-proof badge is
 * deliberately placeholder bracketed copy, not a literal counter claim, and
 * the doctor-recommendation card names no real clinician. Like the other
 * Tier-1-adjacent previews, this repo treats lab/report content as Tier 1
 * (safety, consent, identity, clinical values) even on a commerce-adjacent
 * page — flat and non-wired here, but a named-reviewer plan-first pass is
 * required before any of this is built for real. Not wired, not replacing
 * anything. See NOTES.md.
 */
export function LabPackageDetailPreview(): React.ReactElement {
  const [feedbackRating, setFeedbackRating] = useState(0);

  return (
    <View style={styles.screen} testID="preview-lab-package-detail">
      <View style={styles.scroll}>
        <View style={styles.header}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel="Back" onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
            <Icon name="arrow-left" size={20} color={color.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <GlossTile icon="flask-2" hue="indigo" size={56} />
          <Text style={styles.title}>[Full Body Checkup Advanced]</Text>

          <View style={styles.badgeRow}>
            <M2Pill label="[Booked 12,000+ times]" tone="positive" icon="shield-check" />
          </View>

          <StarRating value={4.6} testID="preview-lab-package-rating" label="4.6 (2,310 ratings)" />

          <View style={styles.priceRow}>
            <Text style={m2Text.price}>₹999</Text>
            <Text style={styles.priceStrike}>₹1,999</Text>
            <M2Pill label="[50% off]" tone="attention" icon="percent" />
          </View>

          <Text style={[m2Text.section, styles.sectionGap]}>What's included</Text>
          <Accordion items={INCLUDED_ITEMS} testID="preview-lab-package-included" />

          <M2Card style={styles.doctorCard} testID="preview-lab-package-doctor-card">
            <GlossTile icon="doctor-alt" hue="teal" size={44} />
            <View style={styles.doctorWords}>
              <Text style={styles.doctorTitle}>[Recommended by Dr. ...]</Text>
              <Text style={m2Text.meta}>[One line on why this package suits your age group and history.]</Text>
            </View>
          </M2Card>

          <GradientHeroCard
            stops={heroStops('violet')}
            chipFill={color.onHeroVeil}
            eyebrow="[LIMITED TIME]"
            title="[Add a free consult with this package]"
            body="[Talk through your results with a doctor at no extra cost.]"
            cta={{ label: '[Add consult]', ink: color.action }}
            icon="doctor"
            onPress={noop}
            label="Add a free consult with this package"
            height={180}
            style={styles.heroCard}
            testID="preview-lab-package-cross-sell"
          />

          <Text style={[m2Text.section, styles.sectionGap]}>FAQs</Text>
          <Accordion items={FAQ_ITEMS} testID="preview-lab-package-faq" />

          <Text style={[m2Text.section, styles.sectionGap]}>Rate this package</Text>
          <Text style={m2Text.meta}>Only shown after you've used this package — not before.</Text>
          <StarRating value={feedbackRating} onChange={setFeedbackRating} testID="preview-lab-package-feedback-rating" size={28} />
          {feedbackRating > 0 ? (
            <M2Note tone="positive" icon="check-circle-2" title="Thanks for rating">
              Your rating helps other students choose. It isn't shared outside this package's listing.
            </M2Note>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerPrice}>₹999</Text>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel="Add to cart" onPress={noop} style={({ focused }: PressState) => [styles.cartBtn, focused ? focusRing : null]}>
          <Icon name="cart" size={16} color={color.onAction} />
          <Text style={styles.cartBtnText}>Add to cart</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1480, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.gutterPhone, gap: space.s12 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  badgeRow: { flexDirection: 'row' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  priceStrike: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text3, textDecorationLine: 'line-through' },
  sectionGap: { marginTop: space.s8 },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  doctorWords: { flex: 1, gap: space.s4 },
  doctorTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  heroCard: { marginTop: space.s4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  footerPrice: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cartBtn: { flex: 1, flexDirection: 'row', gap: space.s8, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  cartBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
