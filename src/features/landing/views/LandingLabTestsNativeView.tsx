import React from 'react';
import { observer } from 'mobx-react-lite';
import type { LandingViewModel } from '../viewmodel/LandingViewModel';
import {
  Actions, CatalogSection, EmergencyCard, Footer, GapNote, Hero, Page, Paragraph, PromiseCard, SecondaryAction, Section,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

interface LandingLabTestsNativeViewProps {
  /** Must be built with `{ kind: 'lab' }` so a non-lab row fails the load. */
  viewModel: LandingViewModel;
  onCall: (number: string) => void;
  destinations: LandingDestinations;
}

/**
 * Lab tests, React Native (design page 3, `WebLabTests`).
 *
 * Same content as LandingLabTestsView: real lab tests at real prices, and the
 * design's NABL, "results in 24 h", clinician-signed and cold-chain claims left
 * off, with the cold chain called out because a student would rely on it.
 *
 * Unlike the web page this one carries the helplines: it is a student-facing
 * page someone may open while unwell (DESIGN.md §6, safety).
 */
export const LandingLabTestsNativeView: React.FC<LandingLabTestsNativeViewProps> = observer(({ viewModel, onCall, destinations: to }) => (
  <Page>
    <Hero
      eyebrow="LAB TESTS"
      title="Science you can read."
      lede="Book a lab test and have a sample collected near you. The report lands in your vault, and you decide whether a clinician sees it."
    >
      {to.shop ? <Actions><SecondaryAction title="Browse everything" onPress={to.shop} /></Actions> : null}
    </Hero>

    <Section title="The result is yours before it is anyone else’s">
      <PromiseCard
        title="It arrives in your vault first"
        body="Not to your campus, and not to a clinician. A clinician sees a report only through a share you granted, for a number of days you chose."
      />
      <PromiseCard
        title="You can ask for it to be explained"
        body="Request a review and a clinician writes back in plain language. You choose to ask — nothing is reviewed automatically, and nothing waits on a signature."
      />
    </Section>

    <GapNote title="What we do not track yet.">
      <Paragraph>
        Our designs promise that the time and temperature between your block and the lab are recorded and shown to
        you. Neither is tracked today, and we are not going to imply a cold chain we cannot evidence. We also do not
        verify lab accreditation or publish a turnaround time. Ask the lab directly if a result matters to a
        decision you are making now.
      </Paragraph>
    </GapNote>

    <CatalogSection
      viewModel={viewModel}
      title="Published lab tests"
      emptyText="No lab tests are published yet. When a lab lists one it appears here with its price, and we will not fill this space with examples in the meantime."
      onShop={to.shop}
    />

    <EmergencyCard onCall={onCall} />

    <Footer
      note="Studentkare is still being built, and this page lists what is missing on purpose."
      links={[
        { title: 'For students', onPress: to.students },
        { title: 'For campuses', onPress: to.campuses },
        { title: 'For clinicians', onPress: to.clinicians },
        { title: 'Privacy', onPress: to.privacy },
        { title: 'Terms', onPress: to.terms },
      ]}
    />
  </Page>
));
