import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useT } from '@/i18n';
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

interface LandingPlansNativeViewProps {
  destinations: LandingDestinations;
}

/**
 * Plans, React Native.
 *
 * This screen used to list a "Care Plus Plan ₹199" with "priority 24/7
 * tele-triage" — a plan the server catalogue does not have, and a priority
 * that payment must never buy. Prices come only from `GET /billing/plans`,
 * and this screen is not wired to it yet (the native screen wrapper passes
 * no fetcher), so it quotes no price rather than a typed-in one.
 */
export const LandingPlansNativeView: React.FC<LandingPlansNativeViewProps> = function LandingPlansNativeView({
  destinations: to,
}) {
  const t = useT();
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
        <View style={styles.planCard}>
          <Paragraph>{t('landing.plans.native.plansBody')}</Paragraph>
        </View>
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
});
