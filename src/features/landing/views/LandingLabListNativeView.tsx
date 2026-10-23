import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Actions,
  CatalogSection,
  Footer,
  Hero,
  Meta,
  Page,
  PrimaryAction,
  SecondaryAction,
  Section,
  color,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';
import type { LandingViewModel } from '../viewmodel/LandingViewModel';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { useT } from '@/i18n';

const { radius, space } = skTokens;

interface LandingLabListNativeViewProps {
  destinations: LandingDestinations;
  /** Lab rows from the public /catalog (kind=lab). Without it, no price is drawn. */
  viewModel?: LandingViewModel;
}

/**
 * Lab tests on the phone. This used to list six tests with re-typed prices
 * and MRPs, and a "Book at Student Rate" that only toggled local state.
 * Prices now come only from the published catalogue; booking is in the shop.
 */
export const LandingLabListNativeView: React.FC<LandingLabListNativeViewProps> = function LandingLabListNativeView({
  destinations: to,
  viewModel,
}) {
  const t = useT();
  return (
    <Page>
      <Hero
        eyebrow={t('landing.lablist.eyebrow')}
        title={t('landing.lablist.nativeTitle')}
        lede={t('landing.lablist.nativeLede')}
      >
        <Actions>
          {to.shop ? <PrimaryAction title={t('landing.lablist.openShop')} onPress={to.shop} /> : null}
          {to.labTests ? <SecondaryAction title={t('landing.subpage.link.labOverview')} onPress={to.labTests} /> : null}
        </Actions>
        <Meta>{t('landing.lablist.disclaimer')}</Meta>
      </Hero>

      {viewModel ? (
        <CatalogSection
          viewModel={viewModel}
          title={t('landing.lablist.title')}
          emptyText={t('landing.lablist.empty')}
          onShop={to.shop}
        />
      ) : (
        <Section title={t('landing.lablist.title')}>
          <View style={styles.note}>
            <Text style={styles.noteText}>{t('landing.lablist.pricesInShop')}</Text>
          </View>
        </Section>
      )}

      <Footer
        note={t('landing.lablist.footerNote')}
        links={[
          { title: t('landing.subpage.link.students'), onPress: to.students },
          { title: t('landing.subpage.link.labOverview'), onPress: to.labTests },
          { title: t('landing.subpage.link.programs'), onPress: to.programs },
          { title: t('landing.subpage.link.plans'), onPress: to.plans },
          { title: t('landing.subpage.signIn'), onPress: to.signIn },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  note: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s16,
    borderWidth: 1,
    borderColor: color.ruleSoft,
  },
  noteText: {
    fontSize: skTokens.font.size.bodySm,
    color: color.text2,
    lineHeight: 20,
  },
});
