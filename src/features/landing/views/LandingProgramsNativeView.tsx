import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Actions,
  BoundaryList,
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
import type { MessageKey } from '@/i18n';

const { radius, space } = skTokens;

interface LandingProgramsNativeViewProps {
  destinations: LandingDestinations;
}

const PROGRAMMES = ['diabetes', 'asthma', 'mental', 'pcos'] as const;
const INCLUDES = [1, 2, 3, 4] as const;
const BOUNDARIES = [
  { tag: 'canSee', n: 1 },
  { tag: 'canSee', n: 2 },
  { tag: 'cannotSee', n: 3 },
  { tag: 'never', n: 4 },
  { tag: 'never', n: 5 },
] as const;

/**
 * Care programmes on the phone. There is no self-enrolment endpoint (a
 * clinician enrols you), so the primary action leads to a consult rather than
 * promising enrolment at sign-up.
 */
export const LandingProgramsNativeView: React.FC<LandingProgramsNativeViewProps> = function LandingProgramsNativeView({
  destinations: to,
}) {
  const t = useT();
  return (
    <Page>
      <Hero
        eyebrow={t('landing.programs.eyebrow')}
        title={t('landing.programs.nativeTitle')}
        lede={t('landing.programs.nativeLede')}
      >
        <Actions>
          {to.consult ? <PrimaryAction title={t('landing.programs.cta')} onPress={to.consult} /> : null}
          {to.signUp ? <SecondaryAction title={t('landing.programs.createAccount')} onPress={to.signUp} /> : null}
        </Actions>
        <Meta>{t('landing.programs.ctaNote')}</Meta>
      </Hero>

      <Section title={t('landing.programs.listTitle')}>
        <Text style={styles.progBody}>{t('landing.programs.listNote')}</Text>
        {PROGRAMMES.map((id) => (
          <View key={id} style={styles.progCard}>
            <Text style={styles.progTitle} accessibilityRole="header">{t(`landing.programs.prog.${id}.name` as MessageKey)}</Text>
            <Text style={styles.progBody}>{t(`landing.programs.prog.${id}.body` as MessageKey)}</Text>
            <View style={styles.pointsList}>
              {[1, 2, 3].map((n) => (
                <Text key={n} style={styles.pointText}>• {t(`landing.programs.prog.${id}.p${n}` as MessageKey)}</Text>
              ))}
            </View>
          </View>
        ))}
      </Section>

      <Section title={t('landing.programs.includesHeading')}>
        {INCLUDES.map((n) => (
          <PromiseCard
            key={n}
            title={t(`landing.programs.include${n}Title` as MessageKey)}
            body={t(`landing.programs.include${n}Body` as MessageKey)}
          />
        ))}
      </Section>

      <Section title={t('landing.programs.boundaryTitle')}>
        <BoundaryList
          items={BOUNDARIES.map((b) => ({
            tag: t(`landing.programs.boundaryTag.${b.tag}` as MessageKey),
            body: t(`landing.programs.boundary${b.n}` as MessageKey),
          }))}
        />
      </Section>

      <Footer
        note={t('landing.programs.footerNote')}
        links={[
          { title: t('landing.subpage.link.students'), onPress: to.students },
          { title: t('landing.subpage.link.plans'), onPress: to.plans },
          { title: t('landing.subpage.link.labTests'), onPress: to.labTests },
          { title: t('landing.subpage.link.wellness'), onPress: to.wellness },
          { title: t('landing.subpage.signIn'), onPress: to.signIn },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  progCard: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s16,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: space.s8,
  },
  progTitle: {
    fontSize: skTokens.font.size.titleSm,
    fontWeight: '800',
    color: color.text,
  },
  progBody: {
    fontSize: skTokens.font.size.bodySm,
    color: color.text2,
    lineHeight: 20,
  },
  pointsList: {
    marginTop: space.s4,
    gap: space.s4,
  },
  pointText: {
    fontSize: skTokens.font.size.caption,
    color: color.action,
    fontWeight: '600',
  },
});
