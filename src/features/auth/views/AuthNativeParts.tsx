import React from 'react';
import { Animated, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { publicHomeUrl } from '@/core/env';
import { observer } from 'mobx-react-lite';
import { LANGUAGE_NAMES, useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import { CrisisLinks } from '@/design-system';
import { Rise } from '@/design-system/motion';
import { color, font, fontWeight, motion, radius, size, space } from '@/design-system/theme';
import { Gradient, NAVY_STOPS, floatTransform, useAmbientMotion, useLoop } from '@/design-system/m2';
import { BrandLogo, Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import type { AuthChannel } from './channelCopy';

/**
 * Sign in and create account on Expo, in the Mobile 2.0 look shared with the
 * web (SignInFrame): a compact navy gradient header with soft orbs, the form on
 * a sheet that rises over it, and the emergency strip (112, Tele-MANAS) always
 * in view at the bottom, outside the scroll. Motion rests under reduced motion
 * and while the screen is not in front (useAmbientMotion).
 */

const LANGS: readonly { code: Lang; short: string }[] = [
  { code: 'en', short: 'EN' },
  { code: 'te', short: 'తె' },
  { code: 'hi', short: 'हि' },
];
const ORB_DRIFT = 8;
const ORB_SIZE = 180;
/** One slow drift lasts this many ambient beats (canvas: decorative loops are slow). */
const ORB_LOOPS = 3;

const CHANNELS: Readonly<Record<AuthChannel, { label: MessageKey; icon: SkIconName }>> = {
  EMAIL: { label: 'auth.channel.EMAIL', icon: 'mail-2' },
  WHATSAPP: { label: 'auth.channel.WHATSAPP', icon: 'message-circle-3' },
};

/** EN / తె / हि on the navy: the white pill is the selected one (DESIGN.md §3). */
export function LanguagePills(): React.ReactElement {
  const t = useT();
  const { lang, setLang } = useLanguage();
  return (
    <View style={styles.langs} accessibilityRole="radiogroup" accessibilityLabel={t('ident.lang.group')}>
      {LANGS.map(({ code, short }) => {
        const on = lang === code;
        return (
          <TouchableOpacity
            key={code}
            style={[styles.lang, on && styles.langOn]}
            onPress={() => setLang(code)}
            accessibilityRole="radio"
            aria-selected={on}
            accessibilityLabel={LANGUAGE_NAMES[code]}
          >
            <Text style={[styles.langText, on && styles.langTextOn]}>{short}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Orbs(): React.ReactElement {
  const ambient = useAmbientMotion();
  const drift = useLoop(ambient, motion.duration.ambient * ORB_LOOPS);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.orb, styles.orbViolet, { transform: floatTransform(drift, ORB_DRIFT) }]}>
        <Gradient colors={[color.serviceViolet, color.brandNavyLight]} radial={{ x: 0.5, y: 0.5 }} style={styles.orbFill} />
      </Animated.View>
      <Animated.View style={[styles.orb, styles.orbSky, { transform: floatTransform(drift, -ORB_DRIFT) }]}>
        <Gradient colors={[color.serviceSkyDeep, color.brandNavy]} radial={{ x: 0.5, y: 0.5 }} style={styles.orbFill} />
      </Animated.View>
    </View>
  );
}

export interface AuthNativeFrameProps {
  onBack?: () => void;
  /** The logo goes to the public home page (founder, 2026-10-22): the site URL when configured, else the app's landing screen. */
  onHome?: () => void;
  regionLabel: MessageKey;
  children: React.ReactNode;
}

/** EXPO_PUBLIC_SITE_URL when it is a web address; otherwise the caller's own landing screen. */
export function openPublicHome(fallback: () => void): void {
  const url = publicHomeUrl();
  if (/^https?:\/\//.test(url)) void Linking.openURL(url);
  else fallback();
}

export function AuthNativeFrame({ onBack, onHome, regionLabel, children }: AuthNativeFrameProps): React.ReactElement {
  const t = useT();
  const brand = (
    <>
      <BrandLogo size={26} label="" />
      <Text style={styles.wordmark} numberOfLines={1}>
        {t('launch.brand.student')}
        <Text style={styles.wordmarkKare}>{` ${t('launch.brand.kare')}`}</Text>
      </Text>
    </>
  );
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" accessibilityLabel={t(regionLabel)}>
        <Gradient colors={NAVY_STOPS} angle={155} style={styles.hero}>
          <Orbs />
          <View style={styles.bar}>
            {onBack ? (
              <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel={t('ident.signin.back')}>
                <Icon name="arrow-left" size={20} color={color.onHero} />
              </TouchableOpacity>
            ) : null}
            {onHome ? (
              <TouchableOpacity
                style={[styles.brand, styles.brandLink]}
                onPress={() => openPublicHome(onHome)}
                accessibilityRole="link"
                accessibilityLabel={t('landing.site.home')}
              >
                {brand}
              </TouchableOpacity>
            ) : <View style={styles.brand}>{brand}</View>}
            <LanguagePills />
          </View>
          <Text style={styles.eyebrow}>{t('authch.hero.eyebrow')}</Text>
        </Gradient>
        <Rise style={styles.sheet}>{children}</Rise>
      </ScrollView>
      <View style={styles.crisis}>
        <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
      </View>
    </View>
  );
}

/** Email / WhatsApp from /auth/options only; nothing to choose with one channel. */
export const ChannelSwitchNative = observer(function ChannelSwitchNative({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const offered = vm.offeredChannels;
  if (offered.length < 2) return null;
  return (
    <View style={styles.channelRow} accessibilityRole="radiogroup" accessibilityLabel={t('auth.channels')}>
      {offered.map((id) => {
        const on = vm.channel === id;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.channelTab, on && styles.channelTabOn]}
            onPress={() => vm.setChannel(id)}
            disabled={vm.busy}
            accessibilityRole="radio"
            aria-selected={on}
            aria-disabled={vm.busy}
            accessibilityLabel={on ? t('auth.channelSelected', { channel: t(CHANNELS[id].label) }) : t(CHANNELS[id].label)}
          >
            <Icon name={CHANNELS[id].icon} size={16} color={on ? color.action : color.text2} />
            <Text style={[styles.channelText, on && styles.channelTextOn]}>{t(CHANNELS[id].label)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

/** A send that failed on its channel: whose side, and the other channel in one tap. */
export const ChannelFailureNative = observer(function ChannelFailureNative({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const failure = vm.channelFailure;
  if (!failure) return null;
  const other = failure.remaining.find((c) => c !== failure.channel) ?? null;
  return (
    <View style={[styles.note, styles.noteAttention]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Icon name="alert-circle-4" size={20} color={color.attention} />
      <View style={styles.noteWords}>
        <Text style={styles.noteTitle}>{t(failure.channel === 'WHATSAPP' ? 'authch.failed.title.WHATSAPP' : 'authch.failed.title.EMAIL')}</Text>
        <Text style={styles.noteBody}>{t(other ? 'authch.failed.body' : 'authch.failed.bodyNoOther')}</Text>
        {other ? (
          <TouchableOpacity
            style={styles.noteAction}
            onPress={() => (other === 'EMAIL' ? vm.useEmailInstead() : vm.setChannel(other))}
            accessibilityRole="button"
            accessibilityLabel={t(other === 'EMAIL' ? 'authch.failed.useEmail' : 'authch.failed.useWhatsapp')}
          >
            <Icon name={CHANNELS[other].icon} size={18} color={color.onAction} />
            <Text style={styles.noteActionText}>{t(other === 'EMAIL' ? 'authch.failed.useEmail' : 'authch.failed.useWhatsapp')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

/** Any other send error, by the field and announced. */
export function SendErrorNative({ message }: { message: string }): React.ReactElement {
  const t = useT();
  return (
    <View style={[styles.note, styles.noteDanger]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Icon name="alert-circle-4" size={20} color={color.danger} />
      <View style={styles.noteWords}>
        <Text style={styles.noteTitle}>{t('authch.errorTitle')}</Text>
        <Text style={styles.noteBody}>{message}</Text>
      </View>
    </View>
  );
}

/** No channel can deliver: honest, with a way to check again; crisis help stays in the strip below. */
export const NoChannelNative = observer(function NoChannelNative({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  return (
    <View style={styles.none} accessibilityLiveRegion="polite">
      <View style={styles.noneIcon}><Icon name="clock-3" size={28} color={color.attention} /></View>
      <Text style={styles.noneTitle} accessibilityRole="header">{t('authch.none.title')}</Text>
      <Text style={styles.noneBody}>{t('authch.none.body')}</Text>
      <TouchableOpacity
        style={styles.ghost}
        onPress={() => void vm.loadOptions()}
        disabled={vm.optionsLoading}
        accessibilityRole="button"
        aria-busy={vm.optionsLoading}
        aria-disabled={vm.optionsLoading}
        accessibilityLabel={t('authch.none.retry')}
      >
        <Icon name="refresh" size={18} color={color.action} />
        <Text style={styles.ghostText}>{t(vm.optionsLoading ? 'authch.none.checking' : 'authch.none.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
});

const HERO_OVERLAP = space.s32;

export const authNativeStyles = StyleSheet.create({
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(800), color: color.text, letterSpacing: -0.5 },
  lead: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: 21 },
  field: { gap: space.s6 },
  label: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(700), color: color.text },
  control: {
    minHeight: size.controlLg, flexDirection: 'row', alignItems: 'center', gap: space.s10, borderWidth: 1.5, borderColor: color.rule,
    borderRadius: radius.lg, paddingHorizontal: space.s16, backgroundColor: color.surface,
  },
  controlInvalid: { borderColor: color.danger },
  controlInput: { flex: 1, minHeight: size.touchTarget, fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  prefix: {
    fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(800), color: color.text,
    paddingRight: space.s10, borderRightWidth: 1, borderRightColor: color.rule,
  },
  hint: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2, lineHeight: 17 },
  primary: {
    minHeight: size.controlLg, flexDirection: 'row', gap: space.s8, backgroundColor: color.action, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s20,
  },
  primaryOff: { backgroundColor: color.actionSoft },
  primaryText: { fontFamily: font.family.sans, color: color.onAction, fontSize: font.size.titleSm, fontWeight: fontWeight(800) },
  primaryTextOff: { color: color.text3 },
  link: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s4 },
  linkText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.action, fontWeight: fontWeight(700) },
  terms: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textAlign: 'center', lineHeight: 18 },
  footer: { borderTopWidth: 1, borderTopColor: color.ruleSoft, paddingTop: space.s8, gap: space.s2 },
  assurance: {
    flexDirection: 'row', alignItems: 'center', gap: space.s10, padding: space.s12, borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.positiveRule, backgroundColor: color.positiveBg,
  },
  assuranceText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 19, fontWeight: fontWeight(700), color: color.positive },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  scroll: { flexGrow: 1 },
  hero: {
    overflow: 'hidden', paddingHorizontal: space.gutterPhone, paddingTop: space.s16,
    paddingBottom: HERO_OVERLAP + space.s16, gap: space.s14,
  },
  orb: { position: 'absolute', width: ORB_SIZE, height: ORB_SIZE, borderRadius: radius.full, overflow: 'hidden', opacity: 0.45 },
  orbViolet: { top: -ORB_SIZE / 3, right: -ORB_SIZE / 4 },
  orbSky: { bottom: -ORB_SIZE / 2, left: -ORB_SIZE / 3 },
  orbFill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  back: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.s8, minWidth: 0 },
  brandLink: { minHeight: size.touchTarget },
  wordmark: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(800), color: color.onHero },
  wordmarkKare: { fontStyle: 'italic', fontFamily: font.family.serif },
  eyebrow: {
    alignSelf: 'flex-start', paddingHorizontal: space.s12, paddingVertical: space.s6, borderRadius: radius.full,
    backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule, overflow: 'hidden',
    fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(800), letterSpacing: 1, color: color.onHero,
  },
  langs: {
    flexDirection: 'row', gap: space.s2, padding: space.s2, borderRadius: radius.full,
    backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule,
  },
  lang: { minWidth: 40, minHeight: size.touchTarget, paddingHorizontal: space.s4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  langOn: { backgroundColor: color.heroCurrent },
  langText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(800), color: color.onHero },
  langTextOn: { color: color.onHeroCurrent },
  sheet: {
    marginTop: -HERO_OVERLAP, flexGrow: 1, gap: space.s16, backgroundColor: color.canvas,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.gutterPhone, paddingTop: space.s24, paddingBottom: space.s32,
  },
  crisis: {
    paddingHorizontal: space.gutterPhone, paddingTop: space.s10, paddingBottom: space.s14,
    borderTopWidth: 1, borderTopColor: color.ruleSoft, backgroundColor: color.surface,
  },
  channelRow: { flexDirection: 'row', backgroundColor: color.surface3, borderRadius: radius.full, padding: space.s4, gap: space.s4 },
  channelTab: { flex: 1, minHeight: size.touchTarget, flexDirection: 'row', gap: space.s6, justifyContent: 'center', alignItems: 'center', borderRadius: radius.full },
  channelTabOn: { backgroundColor: color.surface },
  channelText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(700), color: color.text2 },
  channelTextOn: { color: color.action },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, padding: space.s14, borderRadius: radius.lg, borderWidth: 1 },
  noteAttention: { backgroundColor: color.attentionBg, borderColor: color.ruleSoft },
  noteDanger: { backgroundColor: color.dangerBg, borderColor: color.dangerRule },
  noteWords: { flex: 1, gap: space.s4 },
  noteTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(800), color: color.text },
  noteBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, color: color.text2 },
  noteAction: {
    alignSelf: 'flex-start', marginTop: space.s6, minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8,
    paddingHorizontal: space.s16, borderRadius: radius.full, backgroundColor: color.action,
  },
  noteActionText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(800), color: color.onAction },
  none: {
    alignItems: 'center', gap: space.s12, padding: space.s24, borderRadius: radius.xl, borderWidth: 1,
    borderColor: color.ruleSoft, backgroundColor: color.surface2,
  },
  noneIcon: { width: 64, height: 64, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: color.attentionBg },
  noneTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(800), color: color.text, textAlign: 'center' },
  noneBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 21, color: color.text2, textAlign: 'center' },
  ghost: {
    minHeight: size.control, flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.s20,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface,
  },
  ghostText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(800), color: color.action },
});
