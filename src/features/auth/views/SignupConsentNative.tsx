import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Checkbox, Eyebrow } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { LANGUAGE_NAMES, useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import type { SignupConsentState, SignupPurpose } from '../viewmodel/signupConsent';
import { legalLine, useSignupLegal } from '../viewmodel/useSignupLegal';

const LANGS: readonly Lang[] = ['en', 'te', 'hi'];

/**
 * Expo version of SignupConsent (canvas OnboardingConsent, Tier 1, approved
 * 2026-10-21): same versioned wording, same three unticked items, the "Read this
 * in" language picker and the plain-words box. See SignupConsent.tsx for why it
 * differs from the canvas (no optional switches, guardian or grievance officer).
 */
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
  const { lang, setLang } = useLanguage();
  useSignupLegal(consent);
  return (
    <View style={styles.wrap}>
      <View style={styles.langs} accessibilityRole="radiogroup" accessibilityLabel={t('ident.consent.readIn')}>
        <Text style={styles.langLead}>{t('ident.consent.readIn')}</Text>
        {LANGS.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ checked: lang === code }}
            onPress={() => setLang(code)}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.lang, lang === code ? styles.langOn : null, focused ? focusRing : null]}
          >
            <Text style={[styles.langText, lang === code ? styles.langTextOn : null]}>{LANGUAGE_NAMES[code]}</Text>
          </Pressable>
        ))}
      </View>
      <Text accessibilityRole="header" style={styles.title}>{t('member.consent.eyebrow')}</Text>
      <Text style={styles.body}>{t('member.consent.lead')}</Text>
      <View style={styles.plain}>
        <Eyebrow>{t('member.consent.plainTitle')}</Eyebrow>
        {PLAIN.map(([k, v]) => (
          <View key={k} style={styles.plainRow}>
            <Text style={styles.plainKey}>{t(k)}</Text>
            <Text style={styles.plainValue}>{t(v)}</Text>
          </View>
        ))}
      </View>
      <Eyebrow>{t('member.consent.requiredTitle')}</Eyebrow>
      {ITEMS.map(({ purpose, title, body }) => (
        <Checkbox key={purpose} label={t(title)} detail={t(body)} checked={consent.agreed[purpose]}
          onChange={() => consent.toggle(purpose)} testID={`consent-${purpose}`} />
      ))}
      <Text style={styles.body}>{t('member.consent.withdraw')}</Text>
      <Text accessibilityRole="link" style={[styles.body, styles.link]} onPress={() => void Linking.openURL(privacyUrl)}>
        {t('member.consent.privacy')}
      </Text>
      {consent.noticeVersion ? <Text style={styles.fine}>{legalLine(t, consent.noticeVersion, 'privacy.signup.notice', 'privacy.signup.noticeSoon')}</Text> : null}
      {consent.termsVersion ? <Text style={styles.fine}>{legalLine(t, consent.termsVersion, 'privacy.signup.terms', 'privacy.signup.termsSoon')}</Text> : null}
      <Text style={styles.fine}>{t('member.consent.recorded')}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.s12 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: 20 },
  link: { color: color.action, minHeight: 44, textAlignVertical: 'center', paddingVertical: space.s10 },
  fine: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
  langs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s8 },
  langLead: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  lang: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, borderWidth: 1, borderColor: color.rule, justifyContent: 'center', backgroundColor: color.surface },
  langOn: { backgroundColor: color.action, borderColor: color.action },
  langText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  langTextOn: { color: color.onAction },
  plain: { gap: space.s10, padding: space.s16, borderRadius: radius.lg, backgroundColor: color.surface3 },
  plainRow: { flexDirection: 'row', gap: space.s12 },
  plainKey: { width: 74, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  plainValue: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: 20 },
});
