import React, { useEffect, useRef } from 'react';
import { useT } from '@/i18n';
import { LegalLinksNative } from './LegalLinksNative';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { expiryCopy } from './otpCopy';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable } from './channelCopy';
import {
  AuthNativeFrame, ChannelFailureNative, ChannelSwitchNative, NoChannelNative, SendErrorNative, authNativeStyles as s,
} from './AuthNativeParts';
import { PasscodeEntryNative, PasswordEntryNative, RememberedNative, UsePasscodeNative, UsePasswordNative } from './PasscodeNativeParts';

interface SignInNativeViewProps {
  vm: AuthViewModel;
  onNavigateToSignUp?: () => void;
  onNavigateToLostPhone?: () => void;
  onSuccess?: () => void;
  /** The logo: the public home page (the app's landing screen unless a site URL is configured). */
  onHome?: () => void;
}

/**
 * Sign in on Expo (canvas SignIn, Tier 1, approved 2026-10-21), in the Mobile
 * 2.0 frame shared with create account. Channels come from GET /auth/options
 * (WhatsApp only while its session is connected); one channel draws no
 * switcher, none draws an honest "can't be sent right now". A WhatsApp send
 * that fails offers email in one tap. No session without a verified code.
 */
export const SignInNativeView: React.FC<SignInNativeViewProps> = observer(function SignInNativeView({
  vm,
  onNavigateToSignUp,
  onNavigateToLostPhone,
  onSuccess,
  onHome,
}) {
  const t = useT();
  const contact = useRef<{ focus: () => void } | null>(null);
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.offeredChannels);
  const whatsapp = vm.channel === 'WHATSAPP';
  const canSend = deliverable && !vm.busy && vm.identifier.trim().length > 0;

  useEffect(() => {
    void vm.loadOptions();
    void vm.loadRemembered();
  }, [vm]);
  useEffect(() => {
    if (vm.focusContactRequest > 0) contact.current?.focus();
  }, [vm.focusContactRequest]);

  const handleCodeSubmit = async () => {
    await vm.verify(() => onSuccess?.());
  };

  // Only a correct authenticator code opens a session; anything else starts
  // sign-in again (the view model closes the spent attempt).
  const handleTwoFaSubmit = async () => {
    await vm.verify2FA(() => onSuccess?.());
  };

  const sendError = vm.channelFailure
    ? <ChannelFailureNative vm={vm} />
    : vm.error ? <SendErrorNative message={vm.error} /> : null;

  return (
    <AuthNativeFrame
      regionLabel="auth.signin.title"
      onHome={onHome}
      onBack={vm.passcodeEntry ? vm.leavePasscode : vm.passwordEntry ? vm.leavePassword : vm.step === 1 ? undefined : () => vm.advance(1)}
    >
      <View style={styles.head}>
        <Text style={s.title} accessibilityRole="header">{t('auth.signin.title')}</Text>
        <Text style={s.lead}>{t('auth.signin.lead')}</Text>
      </View>

      {vm.step === 1 && vm.passcodeEntry ? <PasscodeEntryNative vm={vm} onSuccess={onSuccess} /> : null}
      {vm.step === 1 && vm.passwordEntry ? <PasswordEntryNative vm={vm} onSuccess={onSuccess} /> : null}
      {vm.step === 1 && !vm.passcodeEntry && !vm.passwordEntry && vm.remembered ? <RememberedNative vm={vm} /> : null}

      {vm.step === 1 && !vm.passcodeEntry && !vm.passwordEntry && !vm.remembered && vm.noChannel ? <NoChannelNative vm={vm} /> : null}

      {vm.step === 1 && !vm.passcodeEntry && !vm.passwordEntry && !vm.remembered && !vm.noChannel && (
        <>
          {vm.twoFaRestart ? (
            <View style={styles.notice} accessibilityRole="alert" testID="twofa-restart">
              <Text style={styles.noticeText}>{t(vm.twoFaRestart)}</Text>
            </View>
          ) : null}

          <ChannelSwitchNative vm={vm} />

          <View style={s.field}>
            <Text style={s.label}>{t(copy.label)}</Text>
            <View style={[s.control, vm.error && !vm.channelFailure ? s.controlInvalid : null]}>
              {whatsapp
                ? <Text style={s.prefix}>{t('launch.create.countryCode')}</Text>
                : <Icon name="mail-2" size={18} color={color.text2} />}
              <TextInput
                ref={(node: { focus: () => void } | null) => { contact.current = node; }}
                style={s.controlInput}
                placeholder={whatsapp ? t('launch.create.phonePlaceholder') : copy.placeholder}
                placeholderTextColor={color.text3}
                value={vm.identifier}
                onChangeText={(val: string) => vm.setIdentifier(val)}
                keyboardType={whatsapp ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                accessibilityLabel={t(copy.label)}
              />
            </View>
            <Text style={s.hint}>{t(vm.channel === 'EMAIL' ? 'auth.signin.hint.EMAIL' : 'auth.signin.hint.WHATSAPP')}</Text>
          </View>

          {sendError}
          {vm.optionsError && !vm.optionsLoaded ? <Text style={s.hint} accessibilityLiveRegion="polite">{t('authch.optionsError')}</Text> : null}

          <TouchableOpacity
            style={[s.primary, !canSend && s.primaryOff]}
            onPress={() => void vm.sendCode()}
            disabled={!canSend}
            accessibilityRole="button"
            aria-disabled={!canSend}
            aria-busy={vm.busy}
            accessibilityLabel={t('ident.signin.send')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <>
                <Text style={[s.primaryText, !canSend && s.primaryTextOff]}>{t('ident.signin.send')}</Text>
                <Icon name="arrow-right" size={20} color={canSend ? color.onAction : color.text3} />
              </>
            )}
          </TouchableOpacity>

          <UsePasscodeNative vm={vm} />
          <UsePasswordNative vm={vm} />

          <Text style={styles.orText}>{t('ident.signin.or')}</Text>
          {/* No single sign-on exists for any campus (D3-2): drawn off, with why. */}
          <View style={styles.ssoRow} accessible accessibilityRole="button" accessibilityState={{ disabled: true }}
            accessibilityLabel={`${t('ident.signin.campusId')}, ${t('ident.signin.campusIdOff')}`}>
            <View style={styles.ssoTile}><Icon name="graduation-cap" size={20} color={color.text3} /></View>
            <View style={styles.ssoWords}>
              <Text style={styles.ssoTitle}>{t('ident.signin.campusId')}</Text>
              <Text style={styles.ssoMeta}>{t('ident.signin.campusIdOff')}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={color.text3} />
          </View>
        </>
      )}

      {vm.step === 3 && (
        <>
          <View style={styles.otpHeader}>
            <Text style={styles.otpTitle}>{t('ident.otp.title')}</Text>
            <Text style={s.lead}>{t(expiryCopy(vm.expiresInSeconds).key, expiryCopy(vm.expiresInSeconds).vars)}</Text>
            <Text style={s.lead}>{t('auth.code.sentShort', { masked: vm.masked || vm.identifier })}</Text>
          </View>

          <View style={s.field}>
            <TextInput
              style={[s.control, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor={color.text3}
              value={vm.code}
              onChangeText={(val: string) => vm.setCode(val)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus={true}
              accessibilityLabel={t('auth.code.a11y')}
            />
          </View>

          {sendError}

          <TouchableOpacity
            style={[s.primary, (vm.code.length < 6 || vm.busy) && s.primaryOff]}
            onPress={() => void handleCodeSubmit()}
            disabled={vm.code.length < 6 || vm.busy}
            accessibilityRole="button"
            accessibilityLabel={t('auth.verifySignIn')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <Text style={[s.primaryText, (vm.code.length < 6) && s.primaryTextOff]}>{t('auth.verifySignIn')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.link}
            onPress={() => vm.reset()}
            accessibilityRole="button"
            accessibilityLabel={t(vm.channel === 'EMAIL' ? 'auth.changeChannel.EMAIL' : 'auth.changeChannel.WHATSAPP')}
          >
            <Text style={s.linkText}>{t(vm.channel === 'EMAIL' ? 'auth.changeChannel.EMAIL' : 'auth.changeChannel.WHATSAPP')}</Text>
          </TouchableOpacity>
        </>
      )}

      {vm.step === 7 && (
        <>
          <View style={styles.otpHeader}>
            <Text style={styles.otpTitle} accessibilityRole="header">{t('auth.twofa.title')}</Text>
            <Text style={s.lead}>{t('auth.twofa.body')}</Text>
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.twofa.label')}</Text>
            <TextInput
              style={[s.control, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor={color.text3}
              value={vm.twoFaCode}
              onChangeText={(val: string) => vm.setTwoFaCode(val)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus={true}
              accessibilityLabel={t('auth.twofa.label')}
              testID="twofa-code"
            />
          </View>

          <TouchableOpacity
            style={[s.primary, (vm.twoFaCode.length < 6 || vm.busy) && s.primaryOff]}
            onPress={() => void handleTwoFaSubmit()}
            disabled={vm.twoFaCode.length < 6 || vm.busy}
            accessibilityRole="button"
            accessibilityLabel={t('auth.verifySignIn')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <Text style={[s.primaryText, (vm.twoFaCode.length < 6) && s.primaryTextOff]}>{t('auth.verifySignIn')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={s.footer}>
        {onNavigateToSignUp && (
          <TouchableOpacity style={s.link} onPress={onNavigateToSignUp} accessibilityRole="link" accessibilityLabel={t('auth.newStudent')}>
            <Text style={s.linkText}>{t('auth.newStudent')}</Text>
            <Icon name="chevron-right" size={16} color={color.action} />
          </TouchableOpacity>
        )}
        {onNavigateToLostPhone && (
          <TouchableOpacity style={s.link} onPress={onNavigateToLostPhone} accessibilityRole="link" accessibilityLabel={t('ident.signin.lostPhone')}>
            <Text style={s.linkText}>{t('ident.signin.lostPhone')}</Text>
            <Icon name="chevron-right" size={16} color={color.action} />
          </TouchableOpacity>
        )}
        <Text style={s.terms}>{t('auth.terms')}</Text>
        <LegalLinksNative />
      </View>
    </AuthNativeFrame>
  );
});

const styles = StyleSheet.create({
  head: { gap: space.s6 },
  notice: { backgroundColor: color.surface3, padding: space.s12, borderRadius: radius.md },
  noticeText: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  otpInput: { fontSize: font.size.heading, fontWeight: fontWeight(800), letterSpacing: 8, textAlign: 'center', color: color.text },
  otpHeader: { gap: space.s4 },
  otpTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(800), color: color.text },
  orText: { textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  ssoRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: 64, paddingHorizontal: space.s14,
    borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.rule, backgroundColor: color.surface2,
  },
  ssoTile: { width: size.touchTarget - 4, height: size.touchTarget - 4, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  ssoWords: { flex: 1, gap: space.s2 },
  ssoTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(700), color: color.text2 },
  ssoMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
