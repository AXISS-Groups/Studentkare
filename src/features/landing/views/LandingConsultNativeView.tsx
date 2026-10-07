import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  EmergencyCard,
  Footer,
  Page
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

interface LandingConsultNativeViewProps {
  onCall: (number: string) => void;
  destinations: LandingDestinations;
}

export const LandingConsultNativeView: React.FC<LandingConsultNativeViewProps> = ({
  onCall,
  destinations: to
}) => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const promises = [
    { label: 'Usually seen within 30 minutes', tint: '#EEF2FF', ink: '#4F46E5' },
    { label: 'A valid, signed prescription', tint: '#ECFDF5', ink: '#059669' },
    { label: 'Your college is never told', tint: '#EDEBFA', ink: '#7C6BA8' }
  ];

  const docs = [
    { initials: 'AR', name: 'Dr. Ananya Reddy', spec: 'MD Internal Medicine · NMC-TS-88412', when: '4:30 PM' },
    { initials: 'SR', name: 'Dr. Sneha Reddy', spec: 'Adolescent psychiatry · NMC-TS-71029', when: '6:00 PM' },
    { initials: 'KM', name: 'Dr. Kavya Menon', spec: 'Gynaecology · NMC-TS-51170', when: 'Thu 11:00' }
  ];

  const specs = [
    { label: 'General medicine', fee: '₹199', note: '₹149 on Premium', bg: '#EEF2FF' },
    { label: 'Fever & infections', fee: '₹199', note: '₹149 on Premium', bg: '#FBEAE2' },
    { label: 'Report follow-up', fee: '₹199', note: 'Free if we ran the test', bg: '#EEF2FF' },
    { label: 'Mental health', fee: '₹249', note: 'Crisis support is always free', bg: '#EDEBFA' },
    { label: 'Skin & hair', fee: '₹299', note: '₹229 on Premium', bg: '#F8F0E9' },
    { label: "Women's health", fee: '₹349', note: '₹269 on Premium', bg: '#E6F0EA' }
  ];

  const rules = [
    { label: 'The specific records you shared, for the days you set', tag: 'YES', on: true },
    { label: 'A note written back into your vault after the consult', tag: 'YES', on: true },
    { label: 'Your whole vault, because they are a doctor', tag: 'NEVER', on: false },
    { label: 'Anything after the share expires', tag: 'NEVER', on: false },
    { label: 'What you bought, browsed or asked Ayush', tag: 'NEVER', on: false }
  ];

  const faqs = [
    {
      q: 'What does my Edu ID actually get me?',
      a: 'A free account — your health record, the offline emergency card, and crisis support, none of which we charge for. Consults are paid per use, from ₹199, with the price and any plan discount shown before you pick a slot. You never reach a payment screen you did not expect.'
    },
    {
      q: 'Will I get a prescription I can actually use?',
      a: 'Yes. Every doctor on Studentkare is verified against the National Medical Commission (NMC) register and signs digitally. Prescriptions carry the doctor’s registration number and council name, making them valid at any licensed campus or retail pharmacy across India.'
    },
    {
      q: 'Can I see the same doctor again?',
      a: 'Yes. When booking a follow-up or report review, you can view your previous doctor’s upcoming shift slots. If they are off-shift and your condition is urgent, you have the option to be seen by the on-duty clinician immediately.'
    },
    {
      q: 'What if I need to cancel?',
      a: 'You can cancel or reschedule without penalty up to 30 minutes before your slot begins. If you cancel, the full fee is refunded directly to your original payment method or wallet.'
    },
    {
      q: 'Is a consult private from my college?',
      a: 'Entirely private. Under Rule L and Studentkare’s campus firewall, your institution is never notified that you booked a consultation, nor do they ever have access to medical notes, diagnoses, or prescriptions.'
    },
    {
      q: 'What if it is an emergency?',
      a: 'Studentkare is an outpatient teleconsultation and clinic booking service, not an emergency department. In an acute, life-threatening crisis, tap the red SOS button for emergency protocols or call 112 / Tele-MANAS 14416 immediately.'
    }
  ];

  return (
    <Page>
      {/* 1. Header Banner */}
      <View style={styles.topBanner}>
        <Text style={styles.topEyebrow}>CONSULT A DOCTOR</Text>
        <Text style={styles.topTitle}>Talk within 30 minutes, prescription in your vault.</Text>
        <View style={styles.badgeRow}>
          <View style={styles.topPill}><Text style={styles.topPillText}>Video or chat</Text></View>
          <View style={styles.topPill}><Text style={styles.topPillText}>From ₹199</Text></View>
          <View style={styles.topPill}><Text style={styles.topPillText}>NMC-registered</Text></View>
        </View>
      </View>

      {/* 2. Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Talk to an NMC-registered doctor. From ₹199, priced before you book.</Text>
        <Text style={styles.heroLede}>
          Your Edu ID gets you the free account and the record. The consult itself is paid — you see the price, and any plan discount, before you pick a slot.
        </Text>

        <View style={styles.promisesList}>
          {promises.map((p) => (
            <View key={p.label} style={styles.promiseRow}>
              <View style={[styles.promiseDot, { backgroundColor: p.ink }]} />
              <Text style={styles.promiseText}>{p.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={to.shop}
          accessibilityRole="button"
          accessibilityLabel="See who is on shift now"
        >
          <Text style={styles.ctaText}>See who is on shift now →</Text>
        </TouchableOpacity>
      </View>

      {/* 3. On Shift Doctor Card */}
      <View style={styles.cardBox}>
        <Image
          source={{ uri: '/assets/46011255169a19dbc1060f1bd00e5fd4.png' }}
          style={styles.shiftImage}
          resizeMode="contain"
        />
        <Text style={styles.cardBoxTitle}>ON SHIFT RIGHT NOW</Text>
        <View style={styles.docsList}>
          {docs.map((d) => (
            <View key={d.name} style={styles.docItem}>
              <View style={styles.docAvatar}><Text style={styles.avatarText}>{d.initials}</Text></View>
              <View style={styles.docMeta}>
                <View style={styles.docNameRow}>
                  <Text style={styles.docName}>{d.name}</Text>
                  <View style={styles.activeDot} />
                </View>
                <Text style={styles.docSpec}>{d.spec}</Text>
              </View>
              <Text style={styles.docWhen}>{d.when}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.noteText}>Ordered by availability and distance. Never by who pays us.</Text>
      </View>

      {/* 4. Specialities Grid */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>What students come in with.</Text>
        <View style={styles.specsGrid}>
          {specs.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.specCard, { backgroundColor: s.bg }]}
              onPress={to.shop}
              accessibilityRole="button"
              accessibilityLabel={s.label}
            >
              <Text style={styles.specLabel}>{s.label}</Text>
              <Text style={styles.specFee}>{s.fee}</Text>
              <Text style={styles.specNote}>{s.note}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. What the Doctor Can See (Boundary & Consent) */}
      <View style={styles.privacyCard}>
        <Text style={styles.privacyEyebrow}>WHAT THE DOCTOR CAN SEE</Text>
        <Text style={styles.privacyTitle}>Only what you share, for as long as you choose.</Text>
        <Text style={styles.privacyLede}>
          Booking a consult does not open your vault. You pick the records, you pick the number of days, and it lapses on its own.
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

      {/* 6. FAQ Accordion */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Before you book.</Text>
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

      {/* 7. Clinician Recruitment Banner */}
      <View style={styles.recruitCard}>
        <Text style={styles.recruitEyebrow}>FOR CLINICIANS</Text>
        <Text style={styles.recruitTitle}>Are you an NMC-registered doctor?</Text>
        <Text style={styles.recruitLede}>
          Take campus clinic sessions on a queue sorted by severity, with consent-scoped access and a note that writes itself into the student's vault.
        </Text>
        <TouchableOpacity
          style={styles.recruitButton}
          onPress={to.clinicians}
          accessibilityRole="button"
          accessibilityLabel="Apply to practise"
        >
          <Text style={styles.recruitButtonText}>Apply to practise →</Text>
        </TouchableOpacity>
      </View>

      {/* 8. Emergency Helplines & Native Footer */}
      <EmergencyCard onCall={onCall} />

      <Footer
        note="Studentkare is ABHA-linked, portable after you graduate, and fails closed on consent."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'For campuses', onPress: to.campuses },
          { title: 'For clinicians', onPress: to.clinicians },
          { title: 'Privacy policy', onPress: to.privacy },
          { title: 'Terms of use', onPress: to.terms },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  topBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  topEyebrow: {
    color: '#3525CD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  topTitle: {
    color: '#131B2E',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
    lineHeight: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DAE2FD',
  },
  topPillText: {
    color: '#312E81',
    fontSize: 12,
    fontWeight: '700',
  },
  heroSection: {
    gap: 14,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#131B2E',
    lineHeight: 32,
  },
  heroLede: {
    fontSize: 14,
    color: '#464555',
    lineHeight: 20,
  },
  promisesList: {
    gap: 8,
    marginVertical: 4,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promiseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  promiseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131B2E',
  },
  ctaButton: {
    backgroundColor: '#3525CD',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 12,
    marginBottom: 24,
  },
  shiftImage: {
    height: 140,
    width: '100%',
  },
  cardBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B6980',
    letterSpacing: 1.1,
  },
  docsList: {
    gap: 10,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
    paddingBottom: 10,
  },
  docAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#3525CD',
    fontSize: 13,
    fontWeight: '800',
  },
  docMeta: {
    flex: 1,
    gap: 2,
  },
  docNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131B2E',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  docSpec: {
    fontSize: 11,
    color: '#6B6980',
  },
  docWhen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  noteText: {
    fontSize: 11,
    color: '#6B6980',
  },
  sectionContainer: {
    gap: 14,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131B2E',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131B2E',
  },
  specFee: {
    fontSize: 15,
    fontWeight: '800',
    color: '#131B2E',
  },
  specNote: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B6980',
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
  recruitCard: {
    backgroundColor: '#EDEEFB',
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  recruitEyebrow: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  recruitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131B2E',
    lineHeight: 22,
  },
  recruitLede: {
    fontSize: 12,
    color: '#464555',
    lineHeight: 17,
  },
  recruitButton: {
    backgroundColor: '#3525CD',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  recruitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
