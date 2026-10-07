import React from 'react';
import { Text } from 'react-native';
import { Actions, BoundaryList, Footer, GapNote, Hero, Page, Paragraph, PrimaryAction, Section, styles } from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

const ENFORCED = [
  {
    tag: 'Enforced',
    body: 'A report reaches your review queue only with a current, owner-granted share. An expired or revoked share removes it.',
  },
  {
    tag: 'Enforced',
    body: 'Your chronic tracker shows only students who agreed to a care programme with you, by room and initials rather than by name.',
  },
  {
    tag: 'Enforced',
    body: 'A student can end a share or leave a programme without asking you, and without it being reported to their campus.',
  },
] as const;

/**
 * For clinicians, React Native (design page 3, `LandingClinician`, Tier 3).
 *
 * Copy is the checked version from 8928175. Nothing here calls a clinician
 * "verified" or publishes a commission: no registration number is stored or
 * checked, and no rate is configured (Guardrail 6). There is no application
 * endpoint, so there is no apply button.
 */
export function LandingClinicianNativeView({ destinations: to }: { destinations: LandingDestinations }) {
  return (
    <Page>
      <Hero
        eyebrow="FOR CLINICIANS"
        title="A queue sorted by severity, not by arrival."
        lede="A potassium of 6.8 does not sit behind forty routine results. You see what needs you first, with the reference range beside the value and the consent that makes it readable stated on the row."
      >
        {to.signIn ? <Actions><PrimaryAction title="Sign in" onPress={to.signIn} /></Actions> : null}
      </Hero>

      <Section title="The share is the authorisation. Not your role.">
        <Paragraph>
          Being a clinician here does not open anyone’s record. A student shares specific documents for a number
          of days they choose; you see exactly those, and every open is written to an audit trail.
        </Paragraph>
        <BoundaryList items={ENFORCED} />
      </Section>

      <GapNote title="Two things we are not claiming yet.">
        <Paragraph>
          <Text style={styles.cardTitle}>Registration checking. </Text>
          We do not yet verify a registration number against the NMC register — the clinician role is granted by
          an administrator. Until that check is built we will not describe anyone here as verified, including on
          a prescription.
        </Paragraph>
        <Paragraph>
          <Text style={styles.cardTitle}>What you are paid. </Text>
          Earnings currently report gross consult fees only. No commission rate is configured, so no share is
          published on this page. When one is set it will appear on every line of your statement.
        </Paragraph>
      </GapNote>

      <Section title="Joining">
        <Paragraph>
          There is no application form here yet. If you already have an account, sign in; otherwise the campus
          that invited you can arrange access while the application flow and the registration check are built.
        </Paragraph>
      </Section>

      <Footer
        note="Studentkare is still being built, and this page lists what is missing on purpose."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'For campuses', onPress: to.campuses },
          { title: 'Privacy', onPress: to.privacy },
          { title: 'Terms', onPress: to.terms },
          { title: 'Sign in', onPress: to.signIn },
        ]}
      />
    </Page>
  );
}
