import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Checkbox, Eyebrow } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { SignupConsentState, SignupPurpose } from '../viewmodel/signupConsent';

/** Phone version of SignupConsent: same wording, same three unticked items. See SignupConsent.tsx for why it differs from the canvas. */
const ITEMS: { purpose: SignupPurpose; title: MessageKey; body: MessageKey }[] = [
  { purpose: 'RECORDS_STORAGE', title: 'member.consent.store.title', body: 'member.consent.store.body' },
  { purpose: 'CAMPUS_ENROLMENT', title: 'member.consent.campus.title', body: 'member.consent.campus.body' },
  { purpose: 'ADULT_18_PLUS', title: 'member.consent.adult.title', body: 'member.consent.adult.body' },
];
const PLAIN: [MessageKey, MessageKey][] = [
  ['member.consent.keepK', 'member.consent.keepV'],
  ['member.consent.neverK', 'member.consent.neverV'],
  ['member.consent.canK', 'member.consent.canV'],
  ['member.consent.keptK', 'member.consent.keptV'],
];

export const SignupConsentNative = observer(function SignupConsentNative({ consent, privacyUrl }: { consent: SignupConsentState; privacyUrl: string }) {
  const t = useT();
  return (
    <View style={styles.wrap}>
      <Eyebrow>{t('member.consent.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('member.consent.title')}</Text>
      <Text style={styles.body}>{t('member.consent.lead')}</Text>
      <Text style={styles.heading}>{t('member.consent.plainTitle')}</Text>
      {PLAIN.map(([k, v]) => (
        <Text key={k} style={styles.body}><Text style={styles.strong}>{t(k)}</Text>{' — '}{t(v)}</Text>
      ))}
      <Text style={styles.heading}>{t('member.consent.requiredTitle')}</Text>
      {ITEMS.map(({ purpose, title, body }) => (
        <Checkbox key={purpose} label={t(title)} detail={t(body)} checked={consent.agreed[purpose]}
          onChange={() => consent.toggle(purpose)} testID={`consent-${purpose}`} />
      ))}
      <Text style={styles.body}>{t('member.consent.withdraw')}</Text>
      <Text accessibilityRole="link" style={[styles.body, styles.link]} onPress={() => void Linking.openURL(privacyUrl)}>
        {t('member.consent.privacy')}
      </Text>
      <Text style={styles.fine}>{t('member.consent.recorded')}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.s12 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  heading: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: 20 },
  strong: { fontWeight: fontWeight(font.weight.strong), color: color.text },
  link: { color: color.action, minHeight: 44, textAlignVertical: 'center', paddingVertical: space.s10 },
  fine: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
});
