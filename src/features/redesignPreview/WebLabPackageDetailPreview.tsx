import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Accordion } from '@/design-system/Accordion';
import { StarRating } from '@/design-system/StarRating';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, GradientHeroCard, M2Card, M2Note, M2Pill, heroStops, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

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
 * Flat, non-functional 1mg-inspired preview of WebLabPackageDetail — the
 * web counterpart of `LabPackageDetailPreview.tsx` (mobile). Part of the
 * 2026-11-11 gap-analysis pass: the real `studentweb` screen
 * `WebMyLabTestsView.tsx` is Tier-1-approved for tracking the student's
 * OWN existing lab orders/results, not for browsing/picking a NEW package
 * — this preview covers that separate detail/decision moment, laid out
 * as a two-column desktop page inside the real `StudentWebShell` rather
 * than a phone-frame stack. Per AGENTS.md rule 4 (commerce firewall) the
 * social-proof badge is deliberately placeholder bracketed copy, not a
 * literal counter claim, and the doctor-recommendation card names no
 * real clinician. Not wired, not replacing anything. No brief yet — same
 * footing as the other unticketed previews in this folder. See NOTES.md.
 */
export function WebLabPackageDetailPreview(): React.ReactElement {
  const [feedbackRating, setFeedbackRating] = useState(0);
  const t = useT();

  return (
    <WebShellPreview route="lab-tests">
      <View style={styles.body}>
        <View style={styles.headRow}>
          <GlossTile icon="flask-2" hue="indigo" size={56} />
          <View style={styles.headWords}>
            <Text style={styles.title}>{t('preview.fullBodyCheckupAdvanced')}</Text>
            <View style={styles.badgeRow}>
              <M2Pill label="[Booked 12,000+ times]" tone="positive" icon="shield-check" />
            </View>
            <StarRating value={4.6} testID="preview-web-lab-package-rating" label="4.6 (2,310 ratings)" />
            <View style={styles.priceRow}>
              <Text style={m2Text.price}>₹999</Text>
              <Text style={styles.priceStrike}>₹1,999</Text>
              <M2Pill label="[50% off]" tone="attention" icon="percent" />
            </View>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.leftCol}>
            <Text style={m2Text.section}>{t('preview.whatSIncluded')}</Text>
            <Accordion items={INCLUDED_ITEMS} testID="preview-web-lab-package-included" />

            <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.faqs')}</Text>
            <Accordion items={FAQ_ITEMS} testID="preview-web-lab-package-faq" />

            <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.rateThisPackage')}</Text>
            <Text style={m2Text.meta}>{t('preview.onlyShownAfterYouVeUsedThisPackage')}</Text>
            <StarRating value={feedbackRating} onChange={setFeedbackRating} testID="preview-web-lab-package-feedback-rating" size={28} />
            {feedbackRating > 0 ? (
              <M2Note tone="positive" icon="check-circle-2" title={t('preview.thanksForRating')}>
                {t('preview.yourRatingHelpsOtherStudentsChooseItIsn')}
              </M2Note>
            ) : null}
          </View>

          <View style={styles.rightCol}>
            <M2Card style={styles.doctorCard} testID="preview-web-lab-package-doctor-card">
              <GlossTile icon="doctor-alt" hue="teal" size={44} />
              <View style={styles.doctorWords}>
                <Text style={styles.doctorTitle}>{t('preview.recommendedByDr')}</Text>
                <Text style={m2Text.meta}>{t('preview.oneLineOnWhyThisPackageSuitsYour')}</Text>
              </View>
            </M2Card>

            <GradientHeroCard
              stops={heroStops('violet')}
              chipFill={color.onHeroVeil}
              eyebrow="[LIMITED TIME]"
              title={t('preview.addAFreeConsultWithThisPackage')}
              body="[Talk through your results with a doctor at no extra cost.]"
              cta={{ label: '[Add consult]', ink: color.action }}
              icon="doctor"
              onPress={noop}
              label="Add a free consult with this package"
              height={200}
              style={styles.heroCard}
              testID="preview-web-lab-package-cross-sell"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerPrice}>₹999</Text>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.addToCart')} onPress={noop} style={({ focused }: PressState) => [styles.cartBtn, focused ? focusRing : null]}>
            <Icon name="cart" size={16} color={color.onAction} />
            <Text style={styles.cartBtnText}>{t('preview.addToCart')}</Text>
          </Pressable>
        </View>

        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 880 },
  headRow: { flexDirection: 'row', gap: space.s20 },
  headWords: { flex: 1, minWidth: 0, gap: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  badgeRow: { flexDirection: 'row' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  priceStrike: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text3, textDecorationLine: 'line-through' },
  columns: { flexDirection: 'row', gap: space.s24 },
  leftCol: { flex: 1.3, gap: space.s12, minWidth: 0 },
  rightCol: { flex: 1, gap: space.s16, minWidth: 0 },
  sectionGap: { marginTop: space.s8 },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  doctorWords: { flex: 1, gap: space.s4 },
  doctorTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  heroCard: {},
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingTop: space.s16, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  footerPrice: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cartBtn: { flexDirection: 'row', gap: space.s8, height: 48, paddingHorizontal: space.s24, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  cartBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
