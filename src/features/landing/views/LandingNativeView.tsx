import React from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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
  { title: 'landing.home.promise.private.title', body: 'landing.home.promise.private.body' },
  { title: 'landing.home.promise.price.title', body: 'landing.home.promise.price.body' },
  { title: 'landing.home.promise.collection.title', body: 'landing.home.promise.collection.body' },
  { title: 'landing.home.promise.review.title', body: 'landing.home.promise.review.body' },
] as const satisfies ReadonlyArray<{ title: MessageKey; body: MessageKey }>;

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
export const LandingNativeView: React.FC<LandingNativeViewProps> = observer(({ viewModel, onCall, destinations: to }) => {
  const t = useT();
  return (
    <Page>
      <Hero
        eyebrow={t('landing.home.native.eyebrow')}
        title={t('landing.home.tagline')}
        lede={t('landing.home.native.lede')}
      >
        <Actions>
          {to.signUp ? <PrimaryAction title={t('landing.home.native.createAccount')} onPress={to.signUp} /> : null}
          {to.shop ? <SecondaryAction title={t('landing.kit.browse')} onPress={to.shop} /> : null}
          {to.labTests ? <SecondaryAction title={t('landing.home.tile.lab.title')} onPress={to.labTests} /> : null}
          {to.vaccines ? <SecondaryAction title={t('landing.home.native.findVaccine')} onPress={to.vaccines} /> : null}
        </Actions>
        <Meta>{t('landing.home.ageGate')}</Meta>
      </Hero>

      <EmergencyCard onCall={onCall} />

      <Section title={t('landing.home.promisesTitle')}>
        {PROMISES.map(promise => <PromiseCard key={promise.title} title={t(promise.title)} body={t(promise.body)} />)}
      </Section>

      <CatalogSection
        viewModel={viewModel}
        title={t('landing.home.catalog.title')}
        emptyText={t('landing.home.native.catalogEmpty')}
        onShop={to.shop}
      />

      <Footer
        note={t('landing.home.unfinished')}
        links={[
          { title: t('landing.home.link.forCampuses'), onPress: to.campuses },
          { title: t('landing.home.link.forClinicians'), onPress: to.clinicians },
          { title: t('landing.home.nav.labTests'), onPress: to.labTests },
          { title: t('landing.home.link.consult'), onPress: to.consult },
          { title: t('landing.home.link.programmes'), onPress: to.programs },
          { title: t('landing.home.link.plansPricing'), onPress: to.plans },
          { title: t('landing.home.link.wellnessTraining'), onPress: to.wellness },
          { title: t('landing.home.link.partnerships'), onPress: to.partnerships },
          { title: t('landing.home.link.privacy'), onPress: to.privacy },
          { title: t('landing.home.link.terms'), onPress: to.terms },
          { title: t('landing.home.signIn'), onPress: to.signIn },
        ]}
      />
    </Page>
  );
});
