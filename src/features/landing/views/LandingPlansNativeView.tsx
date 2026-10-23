import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useT } from '@/i18n';
import { planPackageLabels, planPriceLabel } from '@/data/datasets/billingPrices';
import { usePlanCatalog } from './planCatalog';
import {
  Actions,
  BoundaryList,
  Footer,
  Hero,
  Meta,
  Page,
  Paragraph,
  PrimaryAction,
  PromiseCard,
  SecondaryAction,
  Section,
  color,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';
import { skTokens } from '@/theme/tokens/generated/skTokens';

const { radius, space } = skTokens;
const { size } = skTokens.font;

interface LandingPlansNativeViewProps {
  destinations: LandingDestinations;
}

/**
 * Plans, React Native.
 *
 * Same data path as the web page (planCatalog.ts): names, prices and packages
 * only from `GET /billing/plans`; while it loads, or if it cannot be read or
 * one plan is malformed, no price is shown at all. Layout parity with the web
 * board is a follow-up; this screen lists the plans plainly.
 */
export const LandingPlansNativeView: React.FC<LandingPlansNativeViewProps> = function LandingPlansNativeView({
  destinations: to,
}) {
  const t = useT();
  const { state, reload } = usePlanCatalog();
  const boundaries = [
    { tag: t('landing.plans.native.tagNever'), body: t('landing.plans.native.ruleAds') },
    { tag: t('landing.plans.native.tagNever'), body: t('landing.plans.native.rulePayment') },
    { tag: t('landing.plans.native.tagNever'), body: t('landing.plans.native.ruleGames') },
    { tag: t('landing.plans.native.tagYourChoice'), body: t('landing.plans.native.ruleConsent') },
  ];
  return (
    <Page>
      <Hero
        eyebrow={t('landing.plans.banner.eyebrow')}
        title={t('landing.plans.h1')}
        lede={t('landing.plans.intro')}
      >
        <Actions>
          {to.signUp ? <PrimaryAction title={t('landing.plans.native.createFree')} onPress={to.signUp} /> : null}
          {to.consult ? <SecondaryAction title={t('landing.plans.native.exploreConsults')} onPress={to.consult} /> : null}
        </Actions>
        <Meta>{t('landing.plans.native.meta')}</Meta>
      </Hero>

      <Section title={t('landing.plans.nav.plans')}>
        {state.status === 'loading' ? (
          <View accessibilityRole="progressbar" accessibilityLabel={t('landing.plans.loading')}>
            <Meta>{t('landing.plans.loading')}</Meta>
          </View>
        ) : null}
        {state.status === 'error' ? (
          <View style={styles.planCard} accessibilityRole="alert">
            <Text style={styles.planName}>{t('landing.plans.loadFailedTitle')}</Text>
            <Paragraph>{t('landing.plans.loadFailedBody')}</Paragraph>
            <PrimaryAction title={t('common.tryAgain')} onPress={reload} />
            <Meta>{t('landing.plans.errorRef')}</Meta>
          </View>
        ) : null}
        {state.status === 'ready' && state.plans.length === 0 ? <Paragraph>{t('landing.plans.empty')}</Paragraph> : null}
        {state.status === 'ready' ? state.plans.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            <Text style={styles.planName} accessibilityRole="header">{plan.name}</Text>
            <Text style={styles.planPrice}>{planPriceLabel(plan, t)} <Text style={styles.planPeriod}>{plan.period}</Text></Text>
            {planPackageLabels(plan, t).map((label) => <Meta key={label}>{label}</Meta>)}
            <Paragraph>{plan.description}</Paragraph>
            {plan.benefits.length > 0
              ? plan.benefits.map((b) => <Meta key={b}>{b}</Meta>)
              : <Meta>{t('landing.plans.benefitsPending')}</Meta>}
          </View>
        )) : null}
      </Section>

      <Section title={t('landing.plans.footer.howWeMakeMoney')}>
        <PromiseCard
          title={t('landing.plans.native.firewallTitle')}
          body={t('landing.plans.native.firewallBody')}
        />
        <BoundaryList items={boundaries} />
      </Section>

      <Footer
        note={t('landing.plans.native.footerNote')}
        links={[
          { title: t('landing.campus.nav.forStudents'), onPress: to.students },
          { title: t('landing.plans.native.programmes'), onPress: to.programs },
          { title: t('landing.plans.nav.labTests'), onPress: to.labTests },
          { title: t('landing.plans.footer.wellness'), onPress: to.wellness },
          { title: t('landing.plans.signIn'), onPress: to.signIn },
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
  planName: { fontSize: size.titleSm, fontWeight: '800', color: color.text },
  planPrice: { fontSize: size.heading, fontWeight: '800', color: color.text },
  planPeriod: { fontSize: size.bodySm, fontWeight: '700', color: color.text3 },
});
