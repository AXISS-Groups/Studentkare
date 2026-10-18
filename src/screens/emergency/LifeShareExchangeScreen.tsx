import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/tokens/theme';
import { useLifeShareStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { AlertTriangle, Droplet, PhoneCall } from 'lucide-react';
import { BLOOD_COMPATIBILITY_MAP } from '../../data/datasets/lifeshareData';
import { useT } from '@/i18n';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/**
 * LifeShare — emergency blood and hospital help (Tier 1).
 *
 * This route is public: no session, reachable by anyone with the link. It used
 * to show a live-looking network — "30,273 CONNECTED HOSPITALS", ICU beds free,
 * ventilators "Ready for dispatch", blood units per group, an oxygen reserve in
 * hours, a NABH VERIFIED badge and a 4.92/5 rating — against five named real
 * hospitals, plus a dispatch log and a "Request Resource Transfer" button whose
 * confirmation read "Hospital network notified."
 *
 * None of it was real. There is no hospital-availability service in this repo:
 * the numbers came from a seeded array and the request went into a local one.
 * Someone deciding where to take a bleeding friend could have read "O+: 22"
 * beside a real hospital's name and driven to a hospital that had none.
 *
 * The availability surface is therefore gone until a feed exists, and what is
 * left is what holds without one: the two national numbers that do answer, and
 * the transfusion rules, which are settled medicine rather than data about
 * anybody and so need no backend to be correct.
 *
 * Reduced deliberately rather than redesigned. DESIGN.md section 5 puts an
 * emergency screen in Tier 1, which may not be authored without a named design
 * reviewer and clinical sign-off. Withdrawing a false claim needs no review;
 * designing this screen's replacement does, and no reviewer has been named.
 */
const LifeShareExchangeScreenUnwrapped: React.FC = () => {
  const t = useT();
  const { tokens } = useTheme();
  const lifeShareStore = useLifeShareStore();

  const [recipientGroup, setRecipientGroup] = useState<string>('');
  const compatibleDonors = recipientGroup ? BLOOD_COMPATIBILITY_MAP[recipientGroup] : undefined;

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Text accessibilityRole="header" style={[styles.title, { color: tokens.text }]}>
          {t('member.lifeshare.title')}
        </Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          {t('member.lifeshare.sub')}
        </Text>
      </View>

      {/* The only part of this screen that reaches anybody, so it comes first. */}
      <Card variant="alert" style={styles.callCard}>
        <Text accessibilityRole="header" style={[styles.callHeading, { color: tokens.text }]}>
          {t('member.lifeshare.callHeading')}
        </Text>
        <View style={styles.callRow}>
          <a href="tel:112" style={linkStyle} aria-label={t('member.lifeshare.call112Spoken')}>
            <PhoneCall size={18} aria-hidden="true" />
            <span style={numberStyle}>112</span>
            <span style={whatStyle}>{t('member.lifeshare.call112What')}</span>
          </a>
          <a href="tel:108" style={linkStyle} aria-label={t('member.lifeshare.call108Spoken')}>
            <PhoneCall size={18} aria-hidden="true" />
            <span style={numberStyle}>108</span>
            <span style={whatStyle}>{t('member.lifeshare.call108What')}</span>
          </a>
        </View>
      </Card>

      {/*
        Driven off the store so a real feed lights this section up without a
        rewrite. Until one exists the list is empty, and the screen says why.
      */}
      <Card variant="surface" style={styles.stateCard}>
        <View style={styles.stateHead}>
          <AlertTriangle size={20} color={tokens.attention} aria-hidden="true" />
          <Text accessibilityRole="header" style={[styles.stateHeading, { color: tokens.text }]}>
            {t('member.lifeshare.availabilityHeading')}
          </Text>
        </View>
        {lifeShareStore.hospitals.length === 0 ? (
          <Text style={[styles.stateBody, { color: tokens.text2 }]}>
            {t('member.lifeshare.availabilityNone')}
          </Text>
        ) : (
          <Text style={[styles.stateBody, { color: tokens.text2 }]}>
            {t('member.lifeshare.availabilitySome', { count: lifeShareStore.hospitals.length })}
          </Text>
        )}
      </Card>

      {/* True without a network, which is why this part survives. */}
      <Card variant="surface" style={styles.bloodCard}>
        <View style={styles.stateHead}>
          <Droplet size={20} color={tokens.emergency} aria-hidden="true" />
          <Text accessibilityRole="header" style={[styles.stateHeading, { color: tokens.text }]}>
            {t('member.lifeshare.bloodHeading')}
          </Text>
        </View>
        <Text style={[styles.stateBody, { color: tokens.text2 }]}>
          {t('member.lifeshare.bloodBody')}
        </Text>

        <View style={styles.groupRow} accessibilityRole="radiogroup" accessibilityLabel={t('member.lifeshare.groupLabel')}>
          {BLOOD_GROUPS.map((group) => {
            const selected = recipientGroup === group;
            return (
              <button
                key={group}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t('member.lifeshare.groupOption', { group })}
                onClick={() => setRecipientGroup(selected ? '' : group)}
                style={{
                  ...chipStyle,
                  background: selected ? tokens.action : tokens.surface2,
                  color: selected ? tokens.surface : tokens.text,
                  borderColor: selected ? tokens.action : tokens.rule,
                }}
              >
                {group}
              </button>
            );
          })}
        </View>

        {compatibleDonors ? (
          <View
            style={[styles.answer, { borderColor: tokens.rule, backgroundColor: tokens.surface2 }]}
          >
            <Text style={[styles.answerLead, { color: tokens.text }]}>
              {t('member.lifeshare.answerLead', { group: recipientGroup })}
            </Text>
            <Text style={[styles.answerList, { color: tokens.text }]}>
              {compatibleDonors.join(' · ')}
            </Text>
            {recipientGroup === 'AB+' ? (
              <Text style={[styles.answerNote, { color: tokens.text2 }]}>
                {t('member.lifeshare.noteABpos')}
              </Text>
            ) : null}
            {recipientGroup === 'O-' ? (
              <Text style={[styles.answerNote, { color: tokens.text2 }]}>
                {t('member.lifeshare.noteOneg')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
};

export const LifeShareExchangeScreen = observer(LifeShareExchangeScreenUnwrapped);

/**
 * These three style DOM nodes rather than RN views, so they are plain CSS and
 * read their colours from the theme's CSS variables instead of the token
 * object. No raw hex: the old file had twenty-odd literals in its stylesheet.
 */
const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 44,
  padding: '10px 16px',
  borderRadius: 10,
  textDecoration: 'none',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--rule)',
  fontWeight: 600,
};

const numberStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: 0.5,
};

const whatStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-2)',
  fontWeight: 500,
};

const chipStyle: React.CSSProperties = {
  minWidth: 56,
  minHeight: 44,
  borderRadius: 10,
  borderWidth: 1,
  borderStyle: 'solid',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerBox: {
    marginBottom: 20,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 680,
  },
  callCard: {
    marginBottom: 16,
    padding: 20,
    gap: 12,
  },
  callHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  callRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stateCard: {
    marginBottom: 16,
    padding: 20,
    gap: 10,
  },
  bloodCard: {
    marginBottom: 32,
    padding: 20,
    gap: 12,
  },
  stateHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stateHeading: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  stateBody: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 680,
  },
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  answer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  answerLead: {
    fontSize: 14,
    fontWeight: '600',
  },
  answerList: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  answerNote: {
    fontSize: 13,
    lineHeight: 19,
  },
});
