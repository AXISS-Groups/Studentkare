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

const { radius, space } = skTokens;

interface LandingProgramsNativeViewProps {
  destinations: LandingDestinations;
}

const PROGRAMMES = [
  {
    name: 'Diabetes',
    body: 'Type 1 and type 2 care for hostel life — fridge storage coordination, missed meals, and exam-week monitoring.',
    points: ['HbA1c quarterly testing', 'Insulin or oral refills', 'Hypoglycemia emergency plan'],
  },
  {
    name: 'Asthma & allergy',
    body: 'Inhaler technique review, allergy triggers in shared hostel dorms, and an escalation plan for nighttime wheeze.',
    points: ['Inhaler refills tracked', 'Peak-flow logging', 'Written action plan'],
  },
  {
    name: 'Mental health',
    body: 'Continuity of care with the same counsellor each session, crisis support always available, and privacy guaranteed.',
    points: ['Consistent counsellor', 'Crisis line 1 tap away', 'Never shared with campus admin'],
  },
  {
    name: 'PCOS & thyroid',
    body: 'Cycles, hormonal wellness, and periodic lab panels without having to travel back home.',
    points: ['Repeat panels scheduled', 'Campus clinical support', 'Private symptom diary'],
  },
];

const INCLUDES = [
  { title: 'One clinician who keeps the thread', body: 'Not whoever happens to be free. They understand your clinical history so you do not have to repeat it.' },
  { title: 'Refills timed to your prescription', body: 'Calculated directly from when issued and course duration — no manual alarms needed.' },
  { title: 'Tests scheduled, not remembered', body: 'Repeat diagnostic panels appear in preventive care when they become clinically due.' },
  { title: 'A dose schedule for you', body: 'Tracked for your treating clinician. Never scored, never gamified, never shared with campus.' },
];

const BOUNDARIES = [
  { tag: 'CAN SEE', body: 'Your dedicated treating clinician reviewing your history' },
  { tag: 'CAN SEE', body: 'Refills and diagnostic reminders appearing in your vault' },
  { tag: 'CANNOT SEE', body: 'Your college administration or professors' },
  { tag: 'NEVER DONE', body: 'Adherence scoring, streaks, or body metric gamification' },
  { tag: 'NEVER DONE', body: 'Commercial advertising or selling of your clinical data' },
];

export const LandingProgramsNativeView: React.FC<LandingProgramsNativeViewProps> = function LandingProgramsNativeView({
  destinations: to,
}) {
  return (
    <Page>
      <Hero
        eyebrow="CARE PROGRAMMES"
        title="Long-term health without having to go home."
        lede="Chronic conditions, mental wellness, and repeat care designed for university students. Keep seeing someone who knows your history."
      >
        <Actions>
          {to.signUp ? <PrimaryAction title="Enrol in a programme" onPress={to.signUp} /> : null}
          {to.consult ? <SecondaryAction title="Speak with a clinician" onPress={to.consult} /> : null}
        </Actions>
        <Meta>Free enrolment. Consultations and prescribed tests priced per use at standard student rates.</Meta>
      </Hero>

      <Section title="Programmes we offer">
        {PROGRAMMES.map((prog) => (
          <View key={prog.name} style={styles.progCard}>
            <Text style={styles.progTitle}>{prog.name}</Text>
            <Text style={styles.progBody}>{prog.body}</Text>
            <View style={styles.pointsList}>
              {prog.points.map((pt) => (
                <Text key={pt} style={styles.pointText}>• {pt}</Text>
              ))}
            </View>
          </View>
        ))}
      </Section>

      <Section title="What every programme includes">
        {INCLUDES.map((item) => (
          <PromiseCard key={item.title} title={item.title} body={item.body} />
        ))}
      </Section>

      <Section title="Rule L commerce &amp; privacy boundary">
        <BoundaryList items={BOUNDARIES} />
      </Section>

      <Footer
        note="Studentkare care programmes do not replace your primary specialist at home. Records remain student-owned and exportable."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'Plans & pricing', onPress: to.plans },
          { title: 'Lab tests', onPress: to.labTests },
          { title: 'Wellness training', onPress: to.wellness },
          { title: 'Sign in', onPress: to.signIn },
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
