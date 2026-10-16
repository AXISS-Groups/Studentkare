import React from 'react';
import { useT } from '@/i18n';
import { Actions, BoundaryList, Footer, GapNote, Hero, Page, Paragraph, PrimaryAction, Section } from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

/**
 * For campuses, React Native (design page 3, `LandingCampus`, Tier 3).
 *
 * Same content as LandingCampusView, and for the same reason: no cohort or
 * analytics endpoint exists, so no suppression threshold is quoted. The gap is
 * stated to the person who would be sold it.
 */
export function LandingCampusNativeView({ destinations: to }: { destinations: LandingDestinations }) {
  const t = useT();
  const boundary = [
    { tag: t('landing.campus.boundary.canSee'), body: t('landing.campus.boundary.enrolment') },
    { tag: t('landing.campus.boundary.cannotSee'), body: t('landing.campus.boundary.records') },
    { tag: t('landing.campus.boundary.cannotSee'), body: t('landing.campus.boundary.leaving') },
  ];
  return (
    <Page>
      <Hero
        eyebrow={t('landing.campus.bannerEyebrow')}
        title={t('landing.campus.title')}
        lede={t('landing.campus.lede')}
      >
        {to.signUp ? <Actions><PrimaryAction title={t('landing.campus.native.createAccount')} onPress={to.signUp} /></Actions> : null}
      </Hero>

      <Section title={t('landing.campus.liability.title')}>
        <Paragraph>{t('landing.campus.liability.body')}</Paragraph>
      </Section>

      <Section title={t('landing.campus.boundary.nativeTitle')}>
        <BoundaryList items={boundary} />
      </Section>

      <GapNote title={t('landing.campus.gap.title')}>
        <Paragraph>{t('landing.campus.gap.body')}</Paragraph>
      </GapNote>

      <Footer
        note={t('landing.campus.footer.building')}
        links={[
          { title: t('landing.campus.nav.forStudents'), onPress: to.students },
          { title: t('landing.campus.nav.forClinicians'), onPress: to.clinicians },
          { title: t('landing.plans.nav.labTests'), onPress: to.labTests },
          { title: t('landing.campus.nav.partnerships'), onPress: to.partnerships },
          { title: t('landing.campus.footer.privacy'), onPress: to.privacy },
          { title: t('landing.campus.footer.terms'), onPress: to.terms },
          { title: t('landing.plans.signIn'), onPress: to.signIn },
        ]}
      />
    </Page>
  );
}
