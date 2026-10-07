import React from 'react';
import { Actions, BoundaryList, Footer, GapNote, Hero, Page, Paragraph, PrimaryAction, Section } from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

const BOUNDARY = [
  {
    tag: 'Can see',
    body: 'Whether a student’s campus enrolment has been confirmed, and the health camps your campus has published.',
  },
  {
    tag: 'Cannot see',
    body: 'Any lab result, prescription, consultation, diagnosis or document. No endpoint returns them to a campus role.',
  },
  {
    tag: 'Cannot see',
    body: 'Whether a student left a care programme. Leaving is never reported to a campus, by design, so that a student can leave one they need to leave.',
  },
] as const;

/**
 * For campuses, React Native (design page 3, `LandingCampus`, Tier 3).
 *
 * Same content as LandingCampusView, and for the same reason: no cohort or
 * analytics endpoint exists, so no suppression threshold is quoted. The gap is
 * stated to the person who would be sold it.
 */
export function LandingCampusNativeView({ destinations: to }: { destinations: LandingDestinations }) {
  return (
    <Page>
      <Hero
        eyebrow="FOR CAMPUSES"
        title="Know your cohort is cared for without knowing who is ill."
        lede="Students hold their own records. Your administrators confirm who is enrolled and nothing more — not because a screen hides the rest, but because nothing exposes it."
      >
        {to.signUp ? <Actions><PrimaryAction title="Create an account" onPress={to.signUp} /></Actions> : null}
      </Hero>

      <Section title="The liability sits with whoever holds the data">
        <Paragraph>
          Under the DPDP Act a campus that stores student medical records is a data fiduciary, with everything
          that follows from that. Here the student is the record holder. Your institution does not receive their
          results, and cannot ask us for them.
        </Paragraph>
      </Section>

      <Section title="What a campus administrator can and cannot see today">
        <BoundaryList items={BOUNDARY} />
      </Section>

      <GapNote title="Cohort reporting does not exist yet.">
        <Paragraph>
          Our designs describe attendance, coverage and camp-outcome reports with small cohorts suppressed inside
          the query. None of it is built. When it is, the suppression threshold will be published here and
          testable — we are not going to quote you a number that no code enforces. Until then a campus gets
          enrolment confirmation and camp administration, and that is all.
        </Paragraph>
      </GapNote>

      <Footer
        note="Studentkare is still being built, and this page lists what is missing on purpose."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'For clinicians', onPress: to.clinicians },
          { title: 'Lab tests', onPress: to.labTests },
          { title: 'Partnerships', onPress: to.partnerships },
          { title: 'Privacy', onPress: to.privacy },
          { title: 'Terms', onPress: to.terms },
          { title: 'Sign in', onPress: to.signIn },
        ]}
      />
    </Page>
  );
}
