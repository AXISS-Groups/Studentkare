import React from 'react';
import { observer } from 'mobx-react-lite';
import type { LandingViewModel } from '../viewmodel/LandingViewModel';
import {
  Actions, CatalogSection, EmergencyCard, Footer, Hero, Meta, Page, PrimaryAction, PromiseCard, SecondaryAction, Section,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

export type { LandingDestinations } from './landingNativeKit';

interface LandingNativeViewProps {
  viewModel: LandingViewModel;
  /** Dials a helpline. Required: the emergency card is never drawn without it. */
  onCall: (number: string) => void;
  destinations: LandingDestinations;
}

const PROMISES = [
  {
    title: 'Private by default',
    body: 'A clinician opens a record only through a share you granted, for a number of days you chose. You can end it whenever you like, and every open is written to an audit trail.',
  },
  {
    title: 'Price before you book',
    body: 'Every price is on screen before you confirm. Nothing on this page is ordered or chosen using anything in your health records.',
  },
  {
    title: 'Collection near you',
    body: 'Lab collection can be booked to your block, and consultations to a slot between classes.',
  },
  {
    title: 'A clinician can review a report',
    body: 'Ask for a report to be reviewed and a clinician writes back in plain language. You choose to ask; it is not automatic.',
  },
] as const;

/**
 * Public landing page, React Native (design page 3, `Landing`, Tier 3).
 *
 * Content follows the honest web page from 8928175, not the full design: the
 * design's unverified claims (ABHA-linked, NMC/NABL-verified, offline card,
 * store badges, newsletter, invented prices and stock) are left off for the
 * reasons recorded there. Prices come only from the public /catalog.
 *
 * Order matters: the emergency card is first after the hero and sits outside
 * every loading and error state, so help is reachable when the network is not.
 */
export const LandingNativeView: React.FC<LandingNativeViewProps> = observer(({ viewModel, onCall, destinations: to }) => (
  <Page>
    <Hero
      eyebrow="A HEALTH RECORD YOU OWN"
      title="A little more care for your everyday."
      lede="Keep your reports, prescriptions and documents in one place that belongs to you — and share them with a clinician only when you choose to."
    >
      <Actions>
        {to.signUp ? <PrimaryAction title="Create your account" onPress={to.signUp} /> : null}
        {to.shop ? <SecondaryAction title="Browse care and medicines" onPress={to.shop} /> : null}
        {to.labTests ? <SecondaryAction title="Book a lab test" onPress={to.labTests} /> : null}
        {to.vaccines ? <SecondaryAction title="Find a vaccine near you" onPress={to.vaccines} /> : null}
      </Actions>
      <Meta>Studentkare is for adults aged 18 and over.</Meta>
    </Hero>

    <EmergencyCard onCall={onCall} />

    <Section title="What we actually promise">
      {PROMISES.map(promise => <PromiseCard key={promise.title} title={promise.title} body={promise.body} />)}
    </Section>

    <CatalogSection
      viewModel={viewModel}
      title="Published right now"
      emptyText="Nothing is published in the catalog yet."
      onShop={to.shop}
    />

    <Footer
      note="Studentkare is still being built. Some things described in our designs do not exist yet, and we would rather leave them off this page than imply otherwise."
      links={[
        { title: 'For campuses', onPress: to.campuses },
        { title: 'For clinicians', onPress: to.clinicians },
        { title: 'Lab tests', onPress: to.labTests },
        { title: 'Partnerships', onPress: to.partnerships },
        { title: 'Privacy', onPress: to.privacy },
        { title: 'Terms', onPress: to.terms },
        { title: 'Sign in', onPress: to.signIn },
      ]}
    />
  </Page>
));
