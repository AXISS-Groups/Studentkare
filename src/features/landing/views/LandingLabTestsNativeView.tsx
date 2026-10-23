import React, { useState } from 'react';
import { labTestsIllustration } from './landingImages';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  Pressable,
  View
} from 'react-native';
import { AnimatedIcon } from '@/design-system/icons';
import { observer } from 'mobx-react-lite';
import { color } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

const k = (key: string): MessageKey => `landing.labtests.${key}` as MessageKey;

export const LandingLabTestsNativeView: React.FC<LandingLabTestsNativeViewProps> = observer(
  ({ viewModel, onCall, destinations: to }) => {
    const t = useT();
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
      setOpenFaq(openFaq === index ? null : index);
    };

    const needs = ['need.fullBody', 'need.fever', 'need.vitamin', 'need.thyroid', 'need.anemia', 'need.xray'];
    const proofCards = ['proof.block', 'proof.handoff', 'proof.redo'];
    const concerns = ['concern.fever', 'concern.vitamins', 'concern.thyroid', 'concern.anemia', 'concern.liverKidney', 'need.xray'];

    // Only what the catalogue publishes: no invented packages, prices,
    // turnaround times or fasting rules.
    const items = viewModel.items.slice(0, 4).map((item) => ({
      id: item.id,
      name: item.name,
      tests: item.pack,
      offPct: item.mrpPaise > item.pricePaise ? Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100) : 0,
      mrp: item.mrpPaise > item.pricePaise ? rupees(item.mrpPaise) : '',
      price: rupees(item.pricePaise)
    }));

    const steps = [1, 2, 3, 4, 5].map((n) => ({ n: `0${n}`, title: k(`step${n}Title`), body: k(`step${n}Body`) }));

    const rules = [
      { key: 'rule.campusTold', on: false },
      { key: 'rule.ranking', on: false },
      { key: 'rule.critical', on: true },
      { key: 'rule.recollect', on: true }
    ];

    const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({ q: k(`faq${n}Q`), a: k(`faq${n}A`) }));

    return (
      <Page>
        {/* 1. Header Banner */}
        <View style={styles.topBanner}>
          <Text style={styles.topEyebrow}>{t(k('eyebrow')).toUpperCase()}</Text>
          <Text style={styles.topTitle} accessibilityRole="header">{t(k('bannerTitle'))}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.topPill}><Text style={styles.topPillText}>{t(k('pillBlock'))}</Text></View>
            <View style={styles.topPill}><Text style={styles.topPillText}>{t(k('pillVault'))}</Text></View>
          </View>
        </View>

        {/* 2. Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle} accessibilityRole="header">{t(k('heroTitle'))}</Text>

          {/* Browse (the old search box searched nothing) */}
          {to.shop ? (
            <Pressable
              style={styles.searchBox}
              onPress={to.shop}
              accessibilityRole="button"
              accessibilityLabel={t(k('seeAll'))}
            >
              <Text style={styles.searchLocation}>{t(k('seeAll'))}</Text>
            </Pressable>
          ) : null}

          {/* Quick Action: there is no WhatsApp booking line yet, so only the prescription route */}
          {to.shop ? (
            <View style={styles.quickRow}>
              <Pressable
                style={[styles.quickButton, { backgroundColor: color.attentionBg }]}
                onPress={to.shop}
                accessibilityRole="button"
                accessibilityLabel={t(k('quick.uploadRx'))}
              >
                <Text style={[styles.quickText, { color: color.attention }]}>{t(k('quick.uploadRx'))}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 3D Lab Asset Illustration */}
          <View style={styles.labImageCard}>
            <Image
              source={labTestsIllustration}
              style={styles.labImage}
              resizeMode="contain"
              accessibilityLabel={t(k('illustrationAlt'))}
            />
          </View>

          {/* Proof Cards */}
          <View style={styles.proofGrid}>
            {proofCards.map((p) => (
              <View key={p} style={styles.proofCard}>
                <Text style={styles.proofTitle}>{t(k(`${p}Title`))}</Text>
                <Text style={styles.proofMeta}>{t(k(`${p}Meta`))}</Text>
              </View>
            ))}
          </View>

          {/* Needs Grid */}
          <View style={styles.cardBox}>
            <Text style={styles.cardBoxTitle}>{t(k('needsTitle'))}</Text>
            <View style={styles.needsGrid}>
              {needs.map((n) => (
                <Pressable
                  key={n}
                  style={styles.needItem}
                  onPress={to.shop}
                  disabled={!to.shop}
                  accessibilityRole="button"
                  accessibilityLabel={t(k(n))}
                  accessibilityState={{ disabled: !to.shop }}
                >
                  <Text style={styles.needText}>{t(k(n))}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 3. Concerns */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader} accessibilityRole="header">{t(k('concernsTitle'))}</Text>
          <View style={styles.concernsGrid}>
            {concerns.map((c) => (
              <Pressable
                key={c}
                style={styles.concernItem}
                onPress={to.shop}
                disabled={!to.shop}
                accessibilityRole="button"
                accessibilityLabel={t(k(c))}
                accessibilityState={{ disabled: !to.shop }}
              >
                <Text style={styles.concernText}>{t(k(c))}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 4. Published lab tests */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionHeader} accessibilityRole="header">{t(k('packagesTitle'))}</Text>
            {to.shop ? (
              <Pressable onPress={to.shop} accessibilityRole="button" accessibilityLabel={t(k('seeAll'))} style={styles.seeAllButton}>
                <Text style={styles.seeAllLink}>{t(k('seeAll'))}</Text>
              </Pressable>
            ) : null}
          </View>

          {viewModel.status === 'loading' ? (
            <View style={styles.stateRow} accessibilityLiveRegion="polite">
              <AnimatedIcon name="anim-refresh" size="icon" color={color.action} poster={<ActivityIndicator color={color.action} />} />
              <Text style={styles.stateText}>{t(k('loading'))}</Text>
            </View>
          ) : viewModel.status === 'error' ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{t(k('failed'))}</Text>
              <Pressable
                onPress={() => void viewModel.load()}
                accessibilityRole="button"
                accessibilityLabel={t('common.tryAgain')}
                style={styles.retryButton}
              >
                <Text style={styles.seeAllLink}>{t('common.tryAgain')}</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <Text style={styles.stateText}>{t(k('empty'))}</Text>
          ) : (
            <View style={styles.packageList}>
              {items.map((pkg) => (
                <View key={pkg.id} style={styles.packageCard}>
                  {pkg.offPct > 0 ? (
                    <View style={styles.packageBadgeRow}>
                      <View style={styles.offBadge}><Text style={styles.offBadgeText}>{t(k('offPct'), { pct: pkg.offPct })}</Text></View>
                    </View>
                  ) : null}
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  {pkg.tests ? <Text style={styles.packageTests}>{pkg.tests}</Text> : null}
                  <View style={styles.packageFooter}>
                    <View>
                      {pkg.mrp ? <Text style={styles.packageMrp}>{pkg.mrp}</Text> : null}
                      <Text style={styles.packagePrice}>{pkg.price}</Text>
                    </View>
                    {to.shop ? (
                      <Pressable
                        style={styles.bookButton}
                        onPress={to.shop}
                        accessibilityRole="button"
                        accessibilityLabel={t(k('bookSlotFor'), { name: pkg.name })}
                      >
                        <Text style={styles.bookButtonText}>{t(k('bookSlot'))}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 5. Campus Collection Flow */}
        <View style={styles.flowCard}>
          <Text style={styles.flowTitle} accessibilityRole="header">{t(k('howTitle'))}</Text>
          <Text style={styles.flowLede}>{t(k('howLede'))}</Text>
          <View style={styles.stepList}>
            {steps.map((s) => (
              <View key={s.n} style={styles.stepItem}>
                <Text style={styles.stepNum}>{s.n}</Text>
                <Text style={styles.stepTitle}>{t(s.title)}</Text>
                <Text style={styles.stepBody}>{t(s.body)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 6. About your results */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyEyebrow}>{t(k('resultsEyebrow')).toUpperCase()}</Text>
          <Text style={styles.privacyTitle} accessibilityRole="header">{t(k('resultsTitle'))}</Text>
          <Text style={styles.privacyLede}>{t(k('resultsLede'))}</Text>
          <View style={styles.ruleList}>
            {rules.map((r) => (
              <View key={r.key} style={styles.ruleItem}>
                <View style={[styles.ruleDot, { backgroundColor: r.on ? color.positiveFill : color.dangerFill }]} />
                <Text style={styles.ruleLabel}>{t(k(r.key))}</Text>
                <View style={[styles.ruleTag, { backgroundColor: r.on ? color.positiveBg : color.dangerBg }]}>
                  <Text style={[styles.ruleTagText, { color: r.on ? color.positive : color.danger }]}>
                    {t(k(r.on ? 'tagAlways' : 'tagNever')).toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 7. Questions Students Actually Ask (Accordion) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader} accessibilityRole="header">{t(k('faqTitle'))}</Text>
          <View style={styles.faqList}>
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <Pressable
                  key={f.q}
                  style={styles.faqItem}
                  onPress={() => toggleFaq(i)}
                  accessibilityRole="button"
                  accessibilityLabel={t(f.q)}
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{t(f.q)}</Text>
                    <Text style={styles.faqToggle} accessibilityElementsHidden importantForAccessibility="no">{isOpen ? '−' : '+'}</Text>
                  </View>
                  {isOpen ? <Text style={styles.faqAnswer}>{t(f.a)}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 8. Trust Pillars */}
        <View style={styles.trustGrid}>
          {(['private', 'listed', 'near', 'price'] as const).map((p) => (
            <View key={p} style={styles.trustItem}>
              <Text style={styles.trustTitle}>{t(k(`trust.${p}Title`))}</Text>
              <Text style={styles.trustBody}>{t(k(`trust.${p}Body`))}</Text>
            </View>
          ))}
        </View>

        {/* 9. Campus updates: no newsletter service exists, so nothing is collected here */}
        <View style={styles.newsletterCard}>
          <Text style={styles.nlEyebrow}>{t(k('nlEyebrow')).toUpperCase()}</Text>
          <Text style={styles.nlTitle}>{t(k('nlTitle'))}</Text>
          <Text style={styles.nlBody}>{t(k('nlNotOpen'))}</Text>
        </View>

        {/* 10. Emergency Helplines & Native Footer */}
        <EmergencyCard onCall={onCall} />

        <Footer
          note={t(k('footerNote'))}
          links={[
            { title: t(k('foot.allPanels')), onPress: to.labList },
            { title: t(k('foot.forStudents')), onPress: to.students },
            { title: t(k('foot.forCampuses')), onPress: to.campuses },
            { title: t(k('foot.forClinicians')), onPress: to.clinicians },
            { title: t(k('foot.privacy')), onPress: to.privacy },
            { title: t(k('foot.terms')), onPress: to.terms },
          ]}
        />
      </Page>
    );
  }
);

const styles = StyleSheet.create({
  topBanner: {
    backgroundColor: color.brandNavy,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  topEyebrow: {
    color: color.sidebarInk2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  topTitle: {
    color: color.sidebarInk,
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
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: color.sidebarInk3,
  },
  topPillText: {
    color: color.sidebarInk,
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
    color: color.text,
    lineHeight: 32,
  },
  searchBox: {
    backgroundColor: color.surface,
    borderRadius: 14,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.rule,
  },
  searchLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: color.action,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    minHeight: 44,
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
    backgroundColor: color.surface3,
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
    backgroundColor: color.brandNavy,
  },
  proofTitle: {
    color: color.sidebarInk,
    fontSize: 14,
    fontWeight: '800',
  },
  proofMeta: {
    color: color.sidebarInk2,
    fontSize: 11,
    fontWeight: '500',
  },
  cardBox: {
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: 12,
  },
  cardBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: color.text,
  },
  needsGrid: {
    gap: 8,
  },
  needItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: color.surface2,
    minHeight: 44,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: color.ruleSoft,
  },
  needText: {
    fontSize: 13,
    fontWeight: '700',
    color: color.text,
  },
  sectionContainer: {
    gap: 14,
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: color.text,
  },
  seeAllButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: color.action,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text2,
  },
  errorBox: {
    backgroundColor: color.dangerBg,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.danger,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  concernsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  concernItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: color.surface3,
  },
  concernText: {
    fontSize: 13,
    fontWeight: '700',
    color: color.text,
  },
  packageList: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: 8,
  },
  packageBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  offBadge: {
    backgroundColor: color.positiveBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  offBadgeText: {
    color: color.positive,
    fontSize: 10,
    fontWeight: '800',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '800',
    color: color.text,
  },
  packageTests: {
    fontSize: 12,
    fontWeight: '600',
    color: color.text2,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: color.ruleSoft,
    paddingTop: 10,
    marginTop: 4,
  },
  packageMrp: {
    fontSize: 11,
    color: color.text3,
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: color.text,
  },
  bookButton: {
    backgroundColor: color.action,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bookButtonText: {
    color: color.onAction,
    fontSize: 12,
    fontWeight: '800',
  },
  flowCard: {
    backgroundColor: color.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: 12,
    marginBottom: 24,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: color.text,
  },
  flowLede: {
    fontSize: 13,
    color: color.text2,
    lineHeight: 18,
  },
  stepList: {
    gap: 12,
    marginTop: 6,
  },
  stepItem: {
    borderTopWidth: 2,
    borderTopColor: color.focus,
    paddingTop: 10,
    gap: 4,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: color.action,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: color.text,
  },
  stepBody: {
    fontSize: 12,
    color: color.text2,
    lineHeight: 16,
  },
  privacyCard: {
    backgroundColor: color.brandNavy,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  privacyEyebrow: {
    color: color.sidebarInk2,
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
    color: color.sidebarInk3,
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
    borderBottomColor: color.sidebar,
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
  trustGrid: {
    backgroundColor: color.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: 14,
    marginBottom: 24,
  },
  trustItem: {
    gap: 4,
  },
  trustTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: color.text,
  },
  trustBody: {
    fontSize: 12,
    color: color.text2,
    lineHeight: 16,
  },
  newsletterCard: {
    backgroundColor: color.action,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  nlEyebrow: {
    color: color.onAction,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  nlTitle: {
    color: color.onAction,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  nlBody: {
    color: color.onAction,
    fontSize: 12,
    lineHeight: 17,
  },
});
