import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Actions,
  Footer,
  Hero,
  Meta,
  Page,
  PrimaryAction,
  SecondaryAction,
  Section,
  color,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';
import { skTokens } from '@/theme/tokens/generated/skTokens';

const { radius, space } = skTokens;

interface LabTestItem {
  id: string;
  name: string;
  pack?: string;
  price: string;
  mrp?: string;
  fasting: boolean;
  tat: string;
}

interface LandingLabListNativeViewProps {
  destinations: LandingDestinations;
}

const TESTS: LabTestItem[] = [
  { id: 't1', name: 'Vitamin D (25-Hydroxy)', price: '₹499', mrp: '₹899', fasting: false, tat: 'Within 24 hours' },
  { id: 't2', name: 'Vitamin B12 Serum', price: '₹399', mrp: '₹649', fasting: false, tat: 'Within 24 hours' },
  { id: 't3', name: 'Vitamin D & B12 Dual Panel', pack: 'Contains 2 tests', price: '₹699', mrp: '₹1,299', fasting: false, tat: 'Within 24 hours' },
  { id: 't4', name: 'Anemia & Iron Deficiency Profile', pack: 'Contains 4 tests', price: '₹699', mrp: '₹1,199', fasting: true, tat: 'Within 24 hours' },
  { id: 't5', name: 'Complete Blood Count (CBC)', pack: 'Contains 28 parameters', price: '₹299', mrp: '₹499', fasting: false, tat: 'Within 12 hours' },
  { id: 't6', name: 'Thyroid Stimulating Hormone (TSH)', price: '₹249', mrp: '₹399', fasting: false, tat: 'Within 12 hours' },
];

export const LandingLabListNativeView: React.FC<LandingLabListNativeViewProps> = function LandingLabListNativeView({
  destinations: to,
}) {
  const [filterNoFasting, setFilterNoFasting] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const displayTests = filterNoFasting ? TESTS.filter((t) => !t.fasting) : TESTS;

  return (
    <Page>
      <Hero
        eyebrow="LAB TEST PANELS"
        title="Diagnostic panels with sample collection at your block."
        lede="Search individual tests or student wellness packages. Transparent prices with reports delivered directly to your vault."
      >
        <Actions>
          {to.labTests ? <PrimaryAction title="Overview of lab testing" onPress={to.labTests} /> : null}
          {to.shop ? <SecondaryAction title="View medical marketplace" onPress={to.shop} /> : null}
        </Actions>
        <Meta>Phlebotomist sample collection coordinated directly to your hostel block reception.</Meta>
      </Hero>

      <Section title="Available diagnostic tests">
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterNoFasting && styles.filterChipActive]}
            onPress={() => setFilterNoFasting(false)}
            accessibilityRole="tab"
            accessibilityLabel={!filterNoFasting ? 'All diagnostic tests, selected' : 'All diagnostic tests'}
          >
            <Text style={[styles.filterText, !filterNoFasting && styles.filterTextActive]}>All tests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterNoFasting && styles.filterChipActive]}
            onPress={() => setFilterNoFasting(true)}
            accessibilityRole="tab"
            accessibilityLabel={filterNoFasting ? 'Filter: No fasting required, selected' : 'Filter: No fasting required'}
          >
            <Text style={[styles.filterText, filterNoFasting && styles.filterTextActive]}>No fasting required</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.testList}>
          {displayTests.map((test) => {
            const isSelected = selectedTestId === test.id;
            return (
              <View key={test.id} style={styles.testCard}>
                <View style={styles.testHeader}>
                  <Text style={styles.testName}>{test.name}</Text>
                  <View style={styles.priceCol}>
                    <Text style={styles.price}>{test.price}</Text>
                    {test.mrp ? <Text style={styles.mrp}>{test.mrp}</Text> : null}
                  </View>
                </View>

                {test.pack ? <Text style={styles.packText}>{test.pack}</Text> : null}

                <View style={styles.badgeRow}>
                  <Text style={styles.badgeText}>{test.tat}</Text>
                  <Text style={[styles.badgeText, test.fasting ? styles.badgeFasting : styles.badgeNoFasting]}>
                    {test.fasting ? 'Fasting needed' : 'No fasting'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.bookBtn, isSelected && styles.bookBtnSelected]}
                  onPress={() => setSelectedTestId(isSelected ? null : test.id)}
                  accessibilityRole="button"
                  accessibilityLabel={isSelected ? `Selected ${test.name}` : `Select test ${test.name}`}
                >
                  <Text style={[styles.bookBtnText, isSelected && styles.bookBtnTextSelected]}>
                    {isSelected ? '✓ Test Selected' : 'Book at Student Rate'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </Section>

      <Footer
        note="Diagnostics are performed by partner laboratories. Reports are private and stored in your vault."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'Overview of lab tests', onPress: to.labTests },
          { title: 'Care programmes', onPress: to.programs },
          { title: 'Plans & pricing', onPress: to.plans },
          { title: 'Sign in', onPress: to.signIn },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: space.s8,
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: space.s14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: color.action,
    borderColor: color.action,
  },
  filterText: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '600',
    color: color.text,
  },
  filterTextActive: {
    color: color.onAction,
    fontWeight: '700',
  },
  testList: {
    gap: space.s12,
    marginTop: space.s6,
  },
  testCard: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s16,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: space.s8,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.s8,
  },
  testName: {
    flex: 1,
    fontSize: skTokens.font.size.titleSm,
    fontWeight: '800',
    color: color.text,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: skTokens.font.size.titleSm,
    fontWeight: '800',
    color: color.action,
  },
  mrp: {
    fontSize: skTokens.font.size.caption,
    color: color.text3,
    textDecorationLine: 'line-through',
  },
  packText: {
    fontSize: skTokens.font.size.caption,
    color: color.text2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: space.s8,
    marginTop: space.s2,
  },
  badgeText: {
    fontSize: skTokens.font.size.caption,
    color: color.text3,
    backgroundColor: color.surface3,
    paddingHorizontal: space.s8,
    paddingVertical: space.s2,
    borderRadius: radius.sm,
  },
  badgeFasting: {
    color: color.attention,
  },
  badgeNoFasting: {
    color: color.positive,
  },
  bookBtn: {
    minHeight: 44,
    backgroundColor: color.surface3,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.s4,
  },
  bookBtnSelected: {
    backgroundColor: color.positiveBg,
  },
  bookBtnText: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '700',
    color: color.action,
  },
  bookBtnTextSelected: {
    color: color.positive,
  },
});
