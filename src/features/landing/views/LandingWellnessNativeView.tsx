import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';

const { radius, space } = skTokens;

interface Session {
  time: string;
  len: string;
  name: string;
  cat: 'gym' | 'strength' | 'yoga' | 'mind' | 'cardio' | 'mobility';
  coach: string;
  where: string;
  price: string;
}

interface LandingWellnessNativeViewProps {
  destinations: LandingDestinations;
}

const CATEGORIES = [
  { id: 'all', label: 'All classes' },
  { id: 'cardio', label: 'Run & Cardio' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'strength', label: 'Strength' },
  { id: 'mobility', label: 'Posture & Mobility' },
  { id: 'mind', label: 'Mind & Breath' },
] as const;

// No timetable is published yet. This used to list sessions with invented coaches.
const SESSIONS: Session[] = [];

export const LandingWellnessNativeView: React.FC<LandingWellnessNativeViewProps> = function LandingWellnessNativeView({
  destinations: to,
}) {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [bookedSessions, setBookedSessions] = useState<Record<string, boolean>>({});

  const filteredSessions = selectedCat === 'all'
    ? SESSIONS
    : SESSIONS.filter((s) => s.cat === selectedCat);

  const toggleBook = (name: string) => {
    setBookedSessions((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <Page>
      <Hero
        eyebrow="WELLNESS & TRAINING"
        title="Physical activity built around your timetable."
        lede="Campus group fitness, yoga classes, desk-posture correction, and mindfulness sessions that fit between lectures."
      >
        <Actions>
          {to.signUp ? <PrimaryAction title="Join wellness pass" onPress={to.signUp} /> : null}
          {to.labTests ? <SecondaryAction title="Check lab health" onPress={to.labTests} /> : null}
        </Actions>
        <Meta>All sessions led by verified coaches and physiotherapists. Small batches on campus grounds.</Meta>
      </Hero>

      <Section title="Daily schedule &amp; timetable">
        <View style={styles.catChips} accessibilityRole="tablist">
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selectedCat === c.id && styles.chipActive]}
              onPress={() => setSelectedCat(c.id)}
              accessibilityRole="tab"
              accessibilityLabel={selectedCat === c.id ? `${c.label}, selected` : c.label}
            >
              <Text style={[styles.chipText, selectedCat === c.id && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sessionList}>
          {filteredSessions.length === 0 && <Text>No sessions scheduled yet.</Text>}
          {filteredSessions.map((s) => {
            const isBooked = !!bookedSessions[s.name];
            return (
              <View key={s.name} style={styles.sessionCard}>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionTime}>{s.time} · {s.len}</Text>
                  <Text style={styles.sessionPrice}>{s.price}</Text>
                </View>
                <Text style={styles.sessionName}>{s.name}</Text>
                <Text style={styles.sessionCoach}>Coach: {s.coach} · {s.where}</Text>
                <TouchableOpacity
                  style={[styles.bookButton, isBooked && styles.bookButtonDone]}
                  onPress={() => toggleBook(s.name)}
                  accessibilityRole="button"
                  accessibilityLabel={isBooked ? `Reserved ${s.name}` : `Reserve spot for ${s.name}`}
                >
                  <Text style={[styles.bookButtonText, isBooked && styles.bookButtonTextDone]}>
                    {isBooked ? '✓ Spot Reserved' : 'Reserve Spot'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Campus Health & Clinical Calculators">
        <ComprehensiveHealthCalculators />
      </Section>

      <Section title="Movement without judgment">
        <PromiseCard
          title="Designed for beginners and study schedules"
          body="Nobody checks a streak or criticizes attendance. If exam season means skipping three weeks, your account never docks points or penalizes you. Movement is for your health, not for an algorithm."
        />
      </Section>

      <Footer
        note="Wellness training schedules are updated weekly by campus sports coordinators."
        links={[
          { title: 'For students', onPress: to.students },
          { title: 'Care programmes', onPress: to.programs },
          { title: 'Plans & pricing', onPress: to.plans },
          { title: 'Lab tests', onPress: to.labTests },
          { title: 'Sign in', onPress: to.signIn },
        ]}
      />
    </Page>
  );
};

const styles = StyleSheet.create({
  catChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: space.s14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: color.action,
    borderColor: color.action,
  },
  chipText: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '600',
    color: color.text,
  },
  chipTextActive: {
    color: color.onAction,
    fontWeight: '700',
  },
  sessionList: {
    gap: space.s12,
    marginTop: space.s8,
  },
  sessionCard: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s16,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: space.s8,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTime: {
    fontSize: skTokens.font.size.caption,
    fontWeight: '700',
    color: color.action,
  },
  sessionPrice: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '800',
    color: color.text,
  },
  sessionName: {
    fontSize: skTokens.font.size.titleSm,
    fontWeight: '800',
    color: color.text,
  },
  sessionCoach: {
    fontSize: skTokens.font.size.caption,
    color: color.text2,
  },
  bookButton: {
    minHeight: 44,
    backgroundColor: color.surface3,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.s4,
  },
  bookButtonDone: {
    backgroundColor: color.positiveBg,
  },
  bookButtonText: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '700',
    color: color.action,
  },
  bookButtonTextDone: {
    color: color.positive,
  },
});
