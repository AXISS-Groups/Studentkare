import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Actions,
  Footer,
  Hero,
  Meta,
  Page,
  PrimaryAction,
  PromiseCard,
  SecondaryAction,
  Section,
  color,
} from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { useT } from '@/i18n';
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';

const { radius, space } = skTokens;

interface LandingWellnessNativeViewProps {
  destinations: LandingDestinations;
}

/**
 * Wellness and training on the phone. No timetable is published yet, so this
 * says so. It used to offer category tabs over an empty list, a "Reserve
 * spot" that only flipped local state, and a "verified coaches" claim.
 */
export const LandingWellnessNativeView: React.FC<LandingWellnessNativeViewProps> = function LandingWellnessNativeView({
  destinations: to,
}) {
  const t = useT();
  return (
    <Page>
      <Hero
        eyebrow={t('landing.wellness.eyebrow')}
        title={t('landing.wellness.title')}
        lede={t('landing.wellness.lede')}
      >
        <Actions>
          {to.signUp ? <PrimaryAction title={t('landing.programs.createAccount')} onPress={to.signUp} /> : null}
          {to.labTests ? <SecondaryAction title={t('landing.subpage.link.labTests')} onPress={to.labTests} /> : null}
        </Actions>
        <Meta>{t('landing.wellness.badgeNoTimetable')}</Meta>
      </Hero>

      <Section title={t('landing.wellness.timetableTitle')}>
        <View style={styles.note}>
          <Text style={styles.noteText}>{t('landing.wellness.timetableEmpty')}</Text>
        </View>
      </Section>

      <Section title={t('landing.wellness.calculatorsLabel')}>
        <ComprehensiveHealthCalculators />
      </Section>

      <Section title={t('landing.wellness.judgmentTitle')}>
        <PromiseCard
          title={t('landing.wellness.judgmentCardTitle')}
          body={t('landing.wellness.judgmentCardBody')}
        />
      </Section>

      <Footer
        note={t('landing.wellness.footerNote')}
        links={[
          { title: t('landing.subpage.link.students'), onPress: to.students },
          { title: t('landing.subpage.link.programs'), onPress: to.programs },
          { title: t('landing.subpage.link.plans'), onPress: to.plans },
          { title: t('landing.subpage.link.labTests'), onPress: to.labTests },
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
