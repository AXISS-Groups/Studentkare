import React from 'react';
import { consultIllustration } from './landingImages';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import {
  EmergencyCard,
  Footer,
  Page,
  color
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

interface LandingConsultNativeViewProps {
  onCall: (number: string) => void;
  destinations: LandingDestinations;
}

/*
 * Same content and keys as LandingConsultView. Taken out, as on web: fixed
 * fees and "on Premium" discounts no data backs, "NMC-registered" and
 * "verified against the register" (nothing checks a register), a 30-minute
 * service level, and a refund policy that is configured nowhere.
 */
const PROMISES = [
  { key: 'price', ink: color.focus },
  { key: 'rx', ink: color.positive },
  { key: 'private', ink: color.info },
] as const;

const SPECS = [
  { key: 'general', bg: color.surface3 },
  { key: 'fever', bg: color.dangerBg },
  { key: 'report', bg: color.surface3 },
  { key: 'mental', bg: color.surface2 },
  { key: 'skin', bg: color.attentionBg },
  { key: 'women', bg: color.positiveBg },
] as const;

const RULES = [
  { key: 'shared', on: true },
  { key: 'note', on: true },
  { key: 'wholeVault', on: false },
  { key: 'expired', on: false },
  { key: 'commerce', on: false },
] as const;

const FAQS = ['eduId', 'rx', 'again', 'cancel', 'private', 'emergency'] as const;

export const LandingConsultNativeView: React.FC<LandingConsultNativeViewProps> = ({
  onCall,
  destinations: to
}) => {
  const t = useT();
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // No clinician roster is published yet. This used to list three invented
  // doctors with made-up NMC registration numbers as "on shift right now".
  const docs: { initials: string; name: string; spec: string; when: string }[] = [];
  const book = to.shop;

  return (
    <Page>
      {/* 1. Header Banner */}
      <View style={styles.topBanner}>
        <Text style={styles.topEyebrow}>{t('landing.consult.eyebrow')}</Text>
        <Text style={styles.topTitle}>{t('landing.consult.banner.title')}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.topPill}><Text style={styles.topPillText}>{t('landing.consult.chip.mode')}</Text></View>
          <View style={styles.topPill}><Text style={styles.topPillText}>{t('landing.consult.chip.price')}</Text></View>
        </View>
      </View>

      {/* 2. Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle} accessibilityRole="header">{t('landing.consult.hero.title')}</Text>
        <Text style={styles.heroLede}>{t('landing.consult.hero.lede')}</Text>

        <View style={styles.promisesList}>
          {PROMISES.map((p) => (
            <View key={p.key} style={styles.promiseRow}>
              <View style={[styles.promiseDot, { backgroundColor: p.ink }]} />
              <Text style={styles.promiseText}>{t(`landing.consult.promise.${p.key}` as MessageKey)}</Text>
            </View>
          ))}
        </View>

        {book ? (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={book}
            accessibilityRole="button"
            accessibilityLabel={t('landing.consult.hero.ctaLabel')}
          >
            <Text style={styles.ctaText}>{t('landing.consult.hero.cta')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 3. On Shift Doctor Card */}
      <View style={styles.cardBox}>
        <Image
          source={consultIllustration}
          style={styles.shiftImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <Text style={styles.cardBoxTitle}>{t('landing.consult.shift.title')}</Text>
        <View style={styles.docsList}>
          {docs.length === 0 && <Text style={styles.docSpec}>{t('landing.consult.shift.empty')}</Text>}
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
        <Text style={styles.noteText}>{t('landing.consult.shift.order')}</Text>
      </View>

      {/* 4. Specialities Grid */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader} accessibilityRole="header">{t('landing.consult.specs.title')}</Text>
        <View style={styles.specsGrid}>
          {SPECS.map((s) => {
            const label = t(`landing.consult.spec.${s.key}` as MessageKey);
            const note = t(s.key === 'mental' ? 'landing.consult.spec.crisisFree' : 'landing.consult.spec.feeNote');
            const inner = (
              <>
                <Text style={styles.specLabel}>{label}</Text>
                <Text style={styles.specFee}>{t('landing.consult.spec.fee')}</Text>
                <Text style={styles.specNote}>{note}</Text>
              </>
            );
            return book ? (
              <TouchableOpacity
                key={s.key}
                style={[styles.specCard, { backgroundColor: s.bg }]}
                onPress={book}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                {inner}
              </TouchableOpacity>
            ) : (
              <View key={s.key} style={[styles.specCard, { backgroundColor: s.bg }]}>{inner}</View>
            );
          })}
        </View>
      </View>

      {/* 5. What the Doctor Can See (Boundary & Consent) */}
      <View style={styles.privacyCard}>
        <Text style={styles.privacyEyebrow}>{t('landing.consult.rules.eyebrow')}</Text>
        <Text style={styles.privacyTitle} accessibilityRole="header">{t('landing.consult.rules.title')}</Text>
        <Text style={styles.privacyLede}>{t('landing.consult.rules.lede')}</Text>
        <View style={styles.ruleList}>
          {RULES.map((r) => (
            <View key={r.key} style={styles.ruleItem}>
              <View style={[styles.ruleDot, { backgroundColor: r.on ? color.positiveFill : color.dangerFill }]} />
              <Text style={styles.ruleLabel}>{t(`landing.consult.rule.${r.key}` as MessageKey)}</Text>
              <View style={[styles.ruleTag, { backgroundColor: r.on ? color.positiveBg : color.dangerBg }]}>
                <Text style={[styles.ruleTagText, { color: r.on ? color.positive : color.danger }]}>
                  {t(r.on ? 'landing.consult.tag.yes' : 'landing.consult.tag.never')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 6. FAQ Accordion */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader} accessibilityRole="header">{t('landing.consult.faq.title')}</Text>
        <View style={styles.faqList}>
          {FAQS.map((k, i) => {
            const isOpen = openFaq === i;
            const q = t(`landing.consult.faq.${k}.q` as MessageKey);
            return (
              <TouchableOpacity
                key={k}
                style={styles.faqItem}
                onPress={() => toggleFaq(i)}
                accessibilityRole="button"
                accessibilityLabel={q}
                aria-expanded={isOpen}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{q}</Text>
                  <Text style={styles.faqToggle} accessibilityElementsHidden importantForAccessibility="no">{isOpen ? '−' : '+'}</Text>
                </View>
                {isOpen ? <Text style={styles.faqAnswer}>{t(`landing.consult.faq.${k}.a` as MessageKey)}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 7. Clinician Recruitment Banner */}
      <View style={styles.recruitCard}>
        <Text style={styles.recruitEyebrow}>{t('landing.consult.recruit.eyebrow')}</Text>
        <Text style={styles.recruitTitle} accessibilityRole="header">{t('landing.consult.recruit.title')}</Text>
        <Text style={styles.recruitLede}>{t('landing.consult.recruit.body')}</Text>
        {to.clinicians ? (
          <TouchableOpacity
            style={styles.recruitButton}
            onPress={to.clinicians}
            accessibilityRole="button"
            accessibilityLabel={t('landing.consult.recruit.ctaLabel')}
          >
            <Text style={styles.recruitButtonText}>{t('landing.consult.recruit.cta')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 8. Emergency Helplines & Native Footer */}
      <EmergencyCard onCall={onCall} />

      <Footer
        note={t('landing.consult.footer.note')}
        links={[
          { title: t('landing.consult.footer.forStudents'), onPress: to.students },
          { title: t('landing.consult.footer.forCampuses'), onPress: to.campuses },
          { title: t('landing.consult.footer.forClinicians'), onPress: to.clinicians },
          { title: t('landing.consult.footer.privacy'), onPress: to.privacy },
          { title: t('landing.consult.footer.terms'), onPress: to.terms },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  topBanner: {
    backgroundColor: color.surface3,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  topEyebrow: {
    color: color.action,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  topTitle: {
    color: color.text,
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
    backgroundColor: color.surface,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: color.rule,
  },
  topPillText: {
    color: color.info,
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
    color: color.text,
    lineHeight: 32,
  },
  heroLede: {
    fontSize: 14,
    color: color.text2,
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
    color: color.text,
  },
  ctaButton: {
    backgroundColor: color.action,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaText: {
    color: color.onAction,
    fontSize: 15,
    fontWeight: '800',
  },
  cardBox: {
    backgroundColor: color.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: color.ruleSoft,
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
    color: color.text3,
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
    borderBottomColor: color.ruleSoft,
    paddingBottom: 10,
  },
  docAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: color.action,
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
    color: color.text,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.positiveFill,
  },
  docSpec: {
    fontSize: 11,
    color: color.text3,
  },
  docWhen: {
    fontSize: 12,
    fontWeight: '800',
    color: color.positive,
  },
  noteText: {
    fontSize: 11,
    color: color.text3,
  },
  sectionContainer: {
    gap: 14,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: color.text,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    flex: 1,
    minWidth: '45%',
    minHeight: 44,
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: color.text,
  },
  specFee: {
    fontSize: 13,
    fontWeight: '700',
    color: color.text2,
  },
  specNote: {
    fontSize: 10,
    fontWeight: '600',
    color: color.text3,
  },
  privacyCard: {
    backgroundColor: color.brandNavy,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  privacyEyebrow: {
    color: color.positiveFill,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  privacyTitle: {
    color: color.sidebarInk,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  privacyLede: {
    color: color.sidebarInk2,
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
    borderBottomColor: color.sidebarInk3,
    paddingVertical: 8,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ruleLabel: {
    flex: 1,
    color: color.sidebarInk,
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
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: color.ruleSoft,
  },
  faqItem: {
    minHeight: 44,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.ruleSoft,
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
    color: color.text,
    paddingRight: 8,
  },
  faqToggle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.text3,
  },
  faqAnswer: {
    marginTop: 8,
    fontSize: 12,
    color: color.text2,
    lineHeight: 17,
  },
  recruitCard: {
    backgroundColor: color.surface3,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  recruitEyebrow: {
    color: color.action,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  recruitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: color.text,
    lineHeight: 22,
  },
  recruitLede: {
    fontSize: 12,
    color: color.text2,
    lineHeight: 17,
  },
  recruitButton: {
    backgroundColor: color.action,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  recruitButtonText: {
    color: color.onAction,
    fontSize: 13,
    fontWeight: '800',
  },
});
