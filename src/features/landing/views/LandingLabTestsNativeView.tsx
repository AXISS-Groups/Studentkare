import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { observer } from 'mobx-react-lite';
import type { LandingViewModel } from '../viewmodel/LandingViewModel';
import {
  EmergencyCard,
  Footer,
  Page,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';
import { rupees } from '../viewmodel/LandingViewModel';

interface LandingLabTestsNativeViewProps {
  viewModel: LandingViewModel;
  onCall: (number: string) => void;
  destinations: LandingDestinations;
}

export const LandingLabTestsNativeView: React.FC<LandingLabTestsNativeViewProps> = observer(
  ({ viewModel, onCall, destinations: to }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
    const [nlInput, setNlInput] = useState('');
    const [nlSubscribed, setNlSubscribed] = useState(false);

    const toggleFaq = (index: number) => {
      setOpenFaq(openFaq === index ? null : index);
    };

    const needs = [
      { label: 'Full body packages', color: '#ECFDF5', ink: '#059669' },
      { label: 'Fever tests', color: '#FFE4E6', ink: '#E11D48' },
      { label: 'Vitamin tests', color: '#EDEBFA', ink: '#7C6BA8' },
      { label: 'Thyroid tests', color: '#EEF2FF', ink: '#4F46E5' },
      { label: 'Anemia & iron', color: '#FBEAE2', ink: '#C4756B' },
      { label: 'X-rays & scans', color: '#EEF2FF', ink: '#4F46E5' }
    ];

    const proofCards = [
      { title: 'Collected at your block', meta: 'Not a clinic across the city', bg: '#1F6F53' },
      { title: 'Cold chain tracked', meta: 'Temperature and time, both shown', bg: '#3E4C7A' },
      { title: 'Bad sample, free redo', meta: 'Haemolysis is our problem, not yours', bg: '#7A5230' }
    ];

    const concerns = [
      { label: 'Fever', bg: '#FBEAE2' },
      { label: 'Vitamins', bg: '#EDEBFA' },
      { label: 'Thyroid', bg: '#EEF2FF' },
      { label: 'Anemia', bg: '#FBEAE2' },
      { label: 'Liver & kidney', bg: '#E6F0EA' },
      { label: 'X-rays & scans', bg: '#EEF2FF' }
    ];

    const defaultPackages = [
      { id: 'pkg-1', name: 'Complete Health Checkup', tests: 'Contains 72 tests', report: 'Report in 24 hrs', off: '50% OFF', mrp: '₹2,999', price: '₹1,499', fasting: true },
      { id: 'pkg-2', name: 'Student Starter Panel', tests: 'Contains 21 tests', report: 'Report in 24 hrs', off: '36% OFF', mrp: '₹499', price: '₹319', fasting: false },
      { id: 'pkg-3', name: 'Anemia & Iron Panel', tests: 'Contains 4 tests', report: 'Report in 24 hrs', off: '42% OFF', mrp: '₹1,199', price: '₹699', fasting: true },
      { id: 'pkg-4', name: 'Thyroid Profile', tests: 'Contains 3 tests', report: 'Report in 12 hrs', off: '44% OFF', mrp: '₹799', price: '₹449', fasting: false }
    ];

    const items = viewModel.items.length >= 4
      ? viewModel.items.slice(0, 4).map((item, idx) => ({
          id: item.id,
          name: item.name,
          tests: item.pack || 'Comprehensive screening',
          report: 'Report in 24 hrs',
          off: item.mrpPaise > item.pricePaise ? `${Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)}% OFF` : 'SPECIAL',
          mrp: item.mrpPaise > item.pricePaise ? rupees(item.mrpPaise) : '',
          price: rupees(item.pricePaise),
          fasting: idx % 2 === 0
        }))
      : defaultPackages;

    const steps = [
      { n: '01', title: 'Pick a slot', body: 'Fasting tests show morning slots only with reasons.' },
      { n: '02', title: 'A phlebotomist arrives', body: 'At your hostel lobby in the window you chose.' },
      { n: '03', title: 'Tracked in transit', body: 'Time and temperature are logged continuously.' },
      { n: '04', title: 'Analysed and signed', body: 'A partner lab processes it; critical values alert fast.' },
      { n: '05', title: 'Lands in your vault', body: 'Store it safely; share with a doctor whenever you choose.' }
    ];

    const rules = [
      { label: 'Your campus told you booked a test', tag: 'NEVER', on: false },
      { label: 'Results used to rank anything you are shown', tag: 'NEVER', on: false },
      { label: 'A critical value released ahead of the report', tag: 'ALWAYS', on: true },
      { label: 'A free recollection if the sample is unusable', tag: 'ALWAYS', on: true }
    ];

    const faqs = [
      {
        q: 'Do I need to fast?',
        a: 'Only for specific tests, and the slot booking screen flags this before you pick a time. Water is fine throughout.'
      },
      {
        q: 'Who comes to collect the sample?',
        a: 'A partner phlebotomist arrives at your block reception. You receive their verified profile on your phone before arrival.'
      },
      {
        q: 'What happens if my sample is unusable?',
        a: 'Haemolysis or insufficient sample volume is never your problem. A free recollection slot is scheduled at your convenience.'
      },
      {
        q: 'Can my college see my results?',
        a: 'Never. In accordance with Rule L, results remain confidential in your vault. Campuses see aggregate counts only, never individual records.'
      },
      {
        q: 'How fast is a critical result handled?',
        a: 'Emergency critical values trigger urgent notifications directly to your vault and immediate clinician attention.'
      },
      {
        q: 'Can I book for someone who is not a student?',
        a: 'Hostel block collection is restricted to active campus residents and staff. Family members can book home visits in the full catalog.'
      }
    ];

    return (
      <Page>
        {/* 1. Header Banner */}
        <View style={styles.topBanner}>
          <Text style={styles.topEyebrow}>LAB TESTS AT YOUR HOSTEL</Text>
          <Text style={styles.topTitle}>Science you can read.</Text>
          <View style={styles.badgeRow}>
            <View style={styles.topPill}><Text style={styles.topPillText}>Clinician-signed</Text></View>
            <View style={styles.topPill}><Text style={styles.topPillText}>Results in 24 h</Text></View>
          </View>
        </View>

        {/* 2. Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Book a lab test. A phlebotomist comes to your block.</Text>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Text style={styles.searchLocation}>VNR VJIET · Block B</Text>
            <View style={styles.searchDivider} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tests or full-body checkups"
              placeholderTextColor="#777587"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Quick Action Pills */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: '#ECFDF5' }]}
              onPress={() => onCall('112')}
              accessibilityRole="button"
              accessibilityLabel="Book by WhatsApp"
            >
              <Text style={[styles.quickText, { color: '#059669' }]}>💬 Book by WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: '#FFFBEB' }]}
              onPress={to.shop}
              accessibilityRole="button"
              accessibilityLabel="Upload a prescription"
            >
              <Text style={[styles.quickText, { color: '#B45309' }]}>📄 Upload Prescription</Text>
            </TouchableOpacity>
          </View>

          {/* 3D Lab Asset Illustration */}
          <View style={styles.labImageCard}>
            <Image
              source={{ uri: '/assets/aa86cceef7f47ddd0066a108e627ed0b.png' }}
              style={styles.labImage}
              resizeMode="contain"
            />
          </View>

          {/* Proof Cards */}
          <View style={styles.proofGrid}>
            {proofCards.map((p) => (
              <View key={p.title} style={[styles.proofCard, { backgroundColor: p.bg }]}>
                <Text style={styles.proofTitle}>{p.title}</Text>
                <Text style={styles.proofMeta}>{p.meta}</Text>
              </View>
            ))}
          </View>

          {/* Needs Grid */}
          <View style={styles.cardBox}>
            <Text style={styles.cardBoxTitle}>Find tests & packages for your needs</Text>
            <View style={styles.needsGrid}>
              {needs.map((n) => (
                <TouchableOpacity
                  key={n.label}
                  style={styles.needItem}
                  onPress={to.shop}
                  accessibilityRole="button"
                  accessibilityLabel={n.label}
                >
                  <Text style={styles.needText}>{n.label}</Text>
                  <View style={[styles.needDot, { backgroundColor: n.color }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 3. Concerns Carousel / List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Tests by what is going on.</Text>
          <View style={styles.concernsGrid}>
            {concerns.map((c) => (
              <TouchableOpacity
                key={c.label}
                style={[styles.concernItem, { backgroundColor: c.bg }]}
                onPress={to.shop}
                accessibilityRole="button"
                accessibilityLabel={c.label}
              >
                <Text style={styles.concernText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Full Body Packages */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionHeader}>Full-body packages.</Text>
            {to.shop ? (
              <TouchableOpacity onPress={to.shop} accessibilityRole="button">
                <Text style={styles.seeAllLink}>See all lab tests →</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.packageList}>
            {items.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageBadgeRow}>
                  <View style={styles.packageBadge}><Text style={styles.packageBadgeText}>PACKAGE</Text></View>
                  <View style={styles.offBadge}><Text style={styles.offBadgeText}>{pkg.off}</Text></View>
                </View>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageTests}>{pkg.tests}</Text>
                <Text style={styles.packageReport}>{pkg.report}</Text>
                <Text style={[styles.packageFast, { color: pkg.fasting ? '#D97706' : '#059669' }]}>
                  {pkg.fasting ? 'Needs 10 hrs fasting' : 'No fasting needed'}
                </Text>
                <View style={styles.packageFooter}>
                  <View>
                    {pkg.mrp ? <Text style={styles.packageMrp}>{pkg.mrp}</Text> : null}
                    <Text style={styles.packagePrice}>{pkg.price}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={to.shop}
                    accessibilityRole="button"
                    accessibilityLabel={`Book ${pkg.name}`}
                  >
                    <Text style={styles.bookButtonText}>Book slot</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Campus Collection Flow */}
        <View style={styles.flowCard}>
          <Text style={styles.flowTitle}>How campus collection works.</Text>
          <Text style={styles.flowLede}>
            A sample is not a parcel. Time and temperature between your block and the lab are clinical facts.
          </Text>
          <View style={styles.stepList}>
            {steps.map((s) => (
              <View key={s.n} style={styles.stepItem}>
                <Text style={styles.stepNum}>{s.n}</Text>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 6. Privacy & Safety Firewall */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>ABOUT YOUR RESULTS</Text>
          <Text style={styles.privacyTitle}>The result is yours before it is anyone else's.</Text>
          <Text style={styles.privacyLede}>
            A report lands in your vault. You choose whether a clinician sees it, and for how long.
          </Text>
          <View style={styles.ruleList}>
            {rules.map((r) => (
              <View key={r.label} style={styles.ruleItem}>
                <View style={[styles.ruleDot, { backgroundColor: r.on ? '#82F5C1' : '#F87171' }]} />
                <Text style={styles.ruleLabel}>{r.label}</Text>
                <View style={[styles.ruleTag, { backgroundColor: r.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)' }]}>
                  <Text style={[styles.ruleTagText, { color: r.on ? '#82F5C1' : '#FCA5A5' }]}>{r.tag}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 7. Questions Students Actually Ask (Accordion) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Questions students actually ask.</Text>
          <View style={styles.faqList}>
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <TouchableOpacity
                  key={f.q}
                  style={styles.faqItem}
                  onPress={() => toggleFaq(i)}
                  accessibilityRole="button"
                  accessibilityLabel={f.q}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{f.q}</Text>
                    <Text style={styles.faqToggle}>{isOpen ? '−' : '+'}</Text>
                  </View>
                  {isOpen ? <Text style={styles.faqAnswer}>{f.a}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 8. Trust Pillars */}
        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <Text style={styles.trustTitle}>Private by default</Text>
            <Text style={styles.trustBody}>Records open only to you and the clinician you choose. Your campus sees counts, never results.</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustTitle}>Listed providers</Text>
            <Text style={styles.trustBody}>Doctors and labs list themselves. Studentkare does not yet check registrations or accreditations.</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustTitle}>Near your hostel</Text>
            <Text style={styles.trustBody}>Collection at your block lobby, consults between classes, a campus clinic when open.</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustTitle}>Price before you book</Text>
            <Text style={styles.trustBody}>Every price is on screen before you confirm. A plan changes the price, never the care.</Text>
          </View>
        </View>

        {/* 9. Newsletter Subscription */}
        <View style={styles.newsletterCard}>
          <Text style={styles.nlEyebrow}>THE KARE LETTER · TWICE A MONTH</Text>
          <Text style={styles.nlTitle}>Camp dates, seasonal alerts and plain-language health tips.</Text>
          <View style={styles.nlTabRow}>
            <TouchableOpacity
              style={[styles.nlTab, nlTab === 'wa' && styles.nlTabActive]}
              onPress={() => setNlTab('wa')}
              accessibilityRole="button"
            >
              <Text style={[styles.nlTabText, nlTab === 'wa' && styles.nlTabTextActive]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nlTab, nlTab === 'em' && styles.nlTabActive]}
              onPress={() => setNlTab('em')}
              accessibilityRole="button"
            >
              <Text style={[styles.nlTabText, nlTab === 'em' && styles.nlTabTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.nlInputRow}>
            <TextInput
              style={styles.nlInput}
              placeholder={nlTab === 'wa' ? '+91 WhatsApp Number' : 'you@college.edu.in'}
              placeholderTextColor="#C7D2FE"
              value={nlInput}
              onChangeText={setNlInput}
            />
            <TouchableOpacity
              style={styles.nlSubmit}
              onPress={() => {
                if (nlInput.trim()) setNlSubscribed(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.nlSubmitText}>{nlSubscribed ? 'Subscribed' : 'Subscribe'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 10. Emergency Helplines & Native Footer */}
        <EmergencyCard onCall={onCall} />

        <Footer
          note="Studentkare fails closed on consent."
          links={[
            { title: 'All lab panels', onPress: to.labList },
            { title: 'For students', onPress: to.students },
            { title: 'For campuses', onPress: to.campuses },
            { title: 'For clinicians', onPress: to.clinicians },
            { title: 'Privacy policy', onPress: to.privacy },
            { title: 'Terms of use', onPress: to.terms },
          ]}
        />
      </Page>
    );
  }
);

const styles = StyleSheet.create({
  topBanner: {
    backgroundColor: '#06051A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  topEyebrow: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  topPillText: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroSection: {
    gap: 16,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#131B2E',
    lineHeight: 32,
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 8,
  },
  searchLocation: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3525CD',
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#EEF2FF',
  },
  searchInput: {
    fontSize: 14,
    color: '#131B2E',
    padding: 0,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '700',
  },
  labImageCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    height: 180,
  },
  labImage: {
    width: '100%',
    height: '100%',
  },
  proofGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  proofCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 14,
    gap: 4,
  },
  proofTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  proofMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 12,
  },
  cardBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#131B2E',
  },
  needsGrid: {
    gap: 8,
  },
  needItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFE',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  needText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131B2E',
  },
  needDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionContainer: {
    gap: 14,
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131B2E',
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3525CD',
  },
  concernsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  concernItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  concernText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131B2E',
  },
  packageList: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 8,
  },
  packageBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  packageBadgeText: {
    color: '#3525CD',
    fontSize: 9,
    fontWeight: '800',
  },
  offBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  offBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131B2E',
  },
  packageTests: {
    fontSize: 12,
    fontWeight: '600',
    color: '#464555',
  },
  packageReport: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B6980',
  },
  packageFast: {
    fontSize: 11,
    fontWeight: '700',
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    paddingTop: 10,
    marginTop: 4,
  },
  packageMrp: {
    fontSize: 11,
    color: '#6B6980',
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131B2E',
  },
  bookButton: {
    backgroundColor: '#3525CD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  flowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 12,
    marginBottom: 24,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131B2E',
  },
  flowLede: {
    fontSize: 13,
    color: '#464555',
    lineHeight: 18,
  },
  stepList: {
    gap: 12,
    marginTop: 6,
  },
  stepItem: {
    borderTopWidth: 2,
    borderTopColor: '#4F46E5',
    paddingTop: 10,
    gap: 4,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#131B2E',
  },
  stepBody: {
    fontSize: 12,
    color: '#464555',
    lineHeight: 16,
  },
  privacyCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  privacyEyebrow: {
    color: '#82F5C1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  privacyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  privacyLede: {
    color: '#A9A5E0',
    fontSize: 12,
    lineHeight: 16,
  },
  ruleList: {
    marginTop: 6,
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ruleLabel: {
    flex: 1,
    color: '#EEF0FF',
    fontSize: 12,
    fontWeight: '600',
  },
  ruleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ruleTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  faqList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#131B2E',
    paddingRight: 8,
  },
  faqToggle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#777587',
  },
  faqAnswer: {
    marginTop: 8,
    fontSize: 12,
    color: '#464555',
    lineHeight: 17,
  },
  trustGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 14,
    marginBottom: 24,
  },
  trustItem: {
    gap: 4,
  },
  trustTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#131B2E',
  },
  trustBody: {
    fontSize: 12,
    color: '#464555',
    lineHeight: 16,
  },
  newsletterCard: {
    backgroundColor: '#3525CD',
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  nlEyebrow: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  nlTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  nlTabRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  nlTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  nlTabActive: {
    backgroundColor: '#FFFFFF',
  },
  nlTabText: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '700',
  },
  nlTabTextActive: {
    color: '#3525CD',
    fontWeight: '800',
  },
  nlInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  nlInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#131B2E',
  },
  nlSubmit: {
    backgroundColor: '#131B2E',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nlSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
