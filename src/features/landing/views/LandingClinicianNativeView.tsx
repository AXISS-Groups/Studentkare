import React from 'react';
import { Text } from 'react-native';
import { useT } from '@/i18n';
import { Actions, BoundaryList, Footer, GapNote, Hero, Page, Paragraph, PrimaryAction, Section, styles } from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

/**
 * For clinicians, React Native (design page 3, `LandingClinician`, Tier 3).
 *
 * Copy is the checked version from 8928175. Nothing here calls a clinician
 * "verified" or publishes a commission: no registration number is stored or
 * checked, and no rate is configured (Guardrail 6). There is no application
 * endpoint, so there is no apply button.
 */
export function LandingClinicianNativeView({ destinations: to }: { destinations: LandingDestinations }) {
  const t = useT();
  const enforced = [
    { tag: t('landing.clinician.enforced.tag'), body: t('landing.clinician.enforced.queue') },
    { tag: t('landing.clinician.enforced.tag'), body: t('landing.clinician.access.tracker') },
    { tag: t('landing.clinician.enforced.tag'), body: t('landing.clinician.enforced.leave') },
  ];
  return (
    <Page>
      <Hero
        eyebrow={t('landing.clinician.eyebrow')}
        title={t('landing.clinician.title')}
        lede={t('landing.clinician.lede')}
      >
        {to.signIn ? <Actions><PrimaryAction title={t('landing.plans.signIn')} onPress={to.signIn} /></Actions> : null}
      </Hero>

      <Section title={t('landing.clinician.access.title')}>
        <Paragraph>{t('landing.clinician.access.body')}</Paragraph>
        <BoundaryList items={enforced} />
      </Section>

      <GapNote title={t('landing.clinician.gap.title')}>
        <Paragraph>
          <Text style={styles.cardTitle}>{t('landing.clinician.gap.regTitle')} </Text>
          {t('landing.clinician.gap.regBody')}
        </Paragraph>
        <Paragraph>
          <Text style={styles.cardTitle}>{t('landing.clinician.gap.payTitle')} </Text>
          {t('landing.clinician.gap.payBody')}
        </Paragraph>
      </GapNote>

      <Section title={t('landing.clinician.joining.title')}>
        <Paragraph>{t('landing.clinician.joining.body')}</Paragraph>
      </Section>

      <Footer
        note={t('landing.campus.footer.building')}
        links={[
          { title: t('landing.campus.nav.forStudents'), onPress: to.students },
          { title: t('landing.campus.nav.forCampuses'), onPress: to.campuses },
          { title: t('landing.campus.footer.privacy'), onPress: to.privacy },
          { title: t('landing.campus.footer.terms'), onPress: to.terms },
          { title: t('landing.plans.signIn'), onPress: to.signIn },
        ]}
      />
    </Page>
  );
}
