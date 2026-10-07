import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Actions,
  BoundaryList,
  Footer,
  Hero,
  Meta,
  Page,
  PrimaryAction,
  PromiseCard,
  SecondaryAction,
  Section,
  color,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';
import { skTokens } from '@/theme/tokens/generated/skTokens';

const { radius, space } = skTokens;

interface LandingPlansNativeViewProps {
  destinations: LandingDestinations;
}

const PLANS = [
  {
    name: 'Free Student Plan',
    price: '₹0',
    cadence: 'Always free for students',
    description: 'Your campus roll ID unlocks your portable health vault. Diagnostic tests and doctor consults are paid per use.',
    features: [
      'Encrypted student-owned medical records vault',
      'One-tap time-limited doctor share passes',
      'Crisis helpline integration',
      'Full FHIR R4 medical record export',
    ],
  },
  {
    name: 'Care Plus Plan',
    price: '₹199',
    cadence: 'per month · Cancel anytime',
    description: 'For students managing regular courses of care, sports rehabilitation, or chronic medical conditions.',
    features: [
      'Dedicated clinician continuity per semester',
      'Automated prescription refill tracking',
      'Discounted campus camp and lab diagnostic pricing',
      'Priority 24/7 tele-triage access',
    ],
  },
];

const FIREWALL_BOUNDARIES = [
  { tag: 'RULE L', body: 'Clinical records never touch advertising or commerce surfaces' },
  { tag: 'RULE L', body: 'Payment or institutional subsidy confers zero clinical record visibility to campus' },
  { tag: 'RULE L', body: 'No gamification, health score streaks, or commercial marketing' },
  { tag: 'DPDP ACT', body: 'Append-only consent logs with immediate revocation rights' },
];

export const LandingPlansNativeView: React.FC<LandingPlansNativeViewProps> = function LandingPlansNativeView({
  destinations: to,
}) {
  return (
    <Page>
      <Hero
        eyebrow="TRANSPARENT PLANS"
        title="Predictable health pricing. No hidden fees."
        lede="Studentkare is funded by straightforward student subscriptions and campus partnerships. Your personal health records are never for sale."
      >
        <Actions>
          {to.signUp ? <PrimaryAction title="Create free account" onPress={to.signUp} /> : null}
          {to.consult ? <SecondaryAction title="Explore consultations" onPress={to.consult} /> : null}
        </Actions>
        <Meta>Clear pricing in INR. Export your medical documents at any time at zero charge.</Meta>
      </Hero>

      <Section title="Available plans">
        {PLANS.map((plan) => (
          <View key={plan.name} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>{plan.price}</Text>
                <Text style={styles.cadenceText}>{plan.cadence}</Text>
              </View>
            </View>
            <Text style={styles.planDesc}>{plan.description}</Text>
            <View style={styles.featuresList}>
              {plan.features.map((f) => (
                <Text key={f} style={styles.featureItem}>✓ {f}</Text>
              ))}
            </View>
          </View>
        ))}
      </Section>

      <Section title="How we make money: The Rule L Firewall">
        <PromiseCard
          title="Clinical data is firewalled from commerce"
          body="Under constitutional Rule L, diagnostic reports, vital stats, and prescriptions are strictly segregated from payment data. Advertisers cannot purchase ads, and paying an institutional subscription does not grant your university access to your medical vault."
        />
        <BoundaryList items={FIREWALL_BOUNDARIES} />
      </Section>

      <Footer
        note="Plans are designed to be accessible to all students. Stored records remain yours even if you downgrade or cancel."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'Care programmes', onPress: to.programs },
          { title: 'Lab tests', onPress: to.labTests },
          { title: 'Wellness training', onPress: to.wellness },
          { title: 'Sign in', onPress: to.signIn },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s16,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: space.s10,
  },
  planHeader: {
    gap: space.s4,
  },
  planTitle: {
    fontSize: skTokens.font.size.titleSm,
    fontWeight: '800',
    color: color.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.s6,
  },
  priceText: {
    fontSize: skTokens.font.size.title,
    fontWeight: '800',
    color: color.action,
  },
  cadenceText: {
    fontSize: skTokens.font.size.caption,
    color: color.text2,
  },
  planDesc: {
    fontSize: skTokens.font.size.bodySm,
    color: color.text2,
    lineHeight: 20,
  },
  featuresList: {
    marginTop: space.s6,
    gap: space.s4,
    borderTopWidth: 1,
    borderTopColor: color.ruleSoft,
    paddingTop: space.s8,
  },
  featureItem: {
    fontSize: skTokens.font.size.caption,
    color: color.text,
    fontWeight: '600',
  },
});
