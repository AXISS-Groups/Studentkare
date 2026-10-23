import React, { useEffect, useRef, useState } from 'react';
import { channelFieldCopy, channelIsDeliverable } from './channelCopy';
import { useLanguage, useT } from '@/i18n';
import { LegalLinksNative } from './LegalLinksNative';
import { apiBaseUrl } from '@/core/env';
import { SignupConsentNative } from './SignupConsentNative';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { PASSWORD_MAX_LENGTH, PASSWORD_STEP, SECOND_CONTACT_STEP } from '../viewmodel/AuthViewModel';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import {
  AuthNativeFrame, ChannelFailureNative, ChannelSwitchNative, NoChannelNative, SendErrorNative, authNativeStyles as s,
} from './AuthNativeParts';

interface CreateAccountNativeViewProps {
  vm: AuthViewModel;
  onNavigateToSignIn?: () => void;
  /** The logo: the public home page. */
  onHome?: () => void;
  onSuccess?: () => void;
}

type SubStep = 'profile' | 'contact' | 'otp' | 'second' | 'password' | 'consent';
/** The phone flow's own steps, in order: the "n of m" progress counts these, never the web's six. */
const ALL_STEPS: readonly SubStep[] = ['profile', 'contact', 'otp', 'second', 'password', 'consent'];
const CODE_LENGTH = 6;

/**
 * Create account on Expo, in the Mobile 2.0 frame shared with sign in. The
 * phone asks for everything POST /auth/signup needs before the code is sent,
 * then the contact (only channels GET /auth/options returned), the code, and
 * the DPDP consent that creates the account. A WhatsApp send that fails keeps
 * every typed field and offers email in one tap.
 *
 * Plan tier1-auth-password-2026-10-22 (B): after the code, the other contact is
 * verified with its own code (only while its channel can deliver), then a password
 * is created, then consent.
 */
export const CreateAccountNativeView: React.FC<CreateAccountNativeViewProps> = observer(function CreateAccountNativeView({
  vm,
  onNavigateToSignIn,
  onHome,
  onSuccess,
}) {
  const [subStep, setSubStep] = useState<SubStep>('profile');
  const t = useT();
  const contact = useRef<{ focus: () => void } | null>(null);
  const { lang } = useLanguage();
  useEffect(() => vm.setConsentLanguage(lang), [vm, lang]);
  useEffect(() => { void vm.loadOptions(); }, [vm]);
  useEffect(() => {
    if (vm.focusContactRequest > 0) contact.current?.focus();
  }, [vm.focusContactRequest]);
  // Everything POST /auth/signup needs, asked before the code is sent.
  const profileComplete = Boolean(vm.fullName.trim() && vm.university.trim() && vm.rollNumber.trim() && /^\d{4}-\d{2}-\d{2}$/.test(vm.dob));
  const whatsapp = vm.channel === 'WHATSAPP';
  const deliverable = channelIsDeliverable(vm.channel, vm.offeredChannels);
  const canSend = deliverable && !vm.busy && vm.identifier.trim().length > 0;
  // The second-contact step counts only while its channel can deliver a code.
  const SUB_STEPS = ALL_STEPS.filter((step) => step !== 'second' || vm.secondRequired);
  const position = SUB_STEPS.indexOf(subStep) + 1;
  const goFromVm = () => {
    if (vm.step === SECOND_CONTACT_STEP) setSubStep('second');
    else if (vm.step === PASSWORD_STEP) setSubStep('password');
    else if (vm.step === 4) setSubStep('password');
  };

  const handleContactNext = async () => {
    await vm.sendCode();
    if (!vm.error) setSubStep('otp');
  };

  const handleOtpSubmit = async () => {
    await vm.verify(() => {
      if (!vm.error && onSuccess) onSuccess();
    });
    // A new account: the code is verified; next the other contact (if it can be reached), then the password.
    if (!vm.error) goFromVm();
  };

  const handleSecond = async () => {
    if (vm.secondSent) await vm.verifySecondCode();
    else await vm.sendSecondCode();
    if (vm.secondVerified) setSubStep('password');
  };

  const handlePassword = () => {
    vm.confirmNewPassword(vm.step);
    if (!vm.newPasswordProblem) setSubStep('consent');
  };

  const handleCreate = async () => {
    await vm.completeSignup(() => {
      if (!vm.error && onSuccess) onSuccess();
    });
    // The server sent it back for a stronger password or the other contact: show that step.
    if (vm.step === PASSWORD_STEP) setSubStep('password');
    else if (vm.step === SECOND_CONTACT_STEP) setSubStep('second');
  };
  const secondWhatsapp = vm.secondChannel === 'WHATSAPP';
  const secondReady = vm.secondSent ? vm.secondCode.length === CODE_LENGTH : vm.secondValue.trim().length > 0;

  const back = subStep === 'profile' ? undefined : () => setSubStep(SUB_STEPS[position - 2]);
  const sendError = vm.channelFailure
    ? <ChannelFailureNative vm={vm} />
    : vm.error ? <SendErrorNative message={vm.error} /> : null;

  return (
    <AuthNativeFrame regionLabel="auth.signup.title" onBack={back} onHome={onHome}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={t('auth.signup.stepOf', { position, total: SUB_STEPS.length })}
        accessibilityValue={{ min: 1, max: SUB_STEPS.length, now: position }}
      >
        {SUB_STEPS.map((step, index) => (
          <View key={step} style={[styles.segment, index < position && styles.segmentDone]} />
        ))}
        <Text style={styles.position} importantForAccessibility="no">{t('auth.signup.position', { position, total: SUB_STEPS.length })}</Text>
      </View>

      <View style={styles.head}>
        <Text style={s.title} accessibilityRole="header">{t('auth.signup.title')}</Text>
        <Text style={s.lead}>{t('auth.signup.lead')}</Text>
      </View>

      {subStep === 'profile' && (
        <>
          <View style={s.field}>
            <Text style={s.label}>{t('auth.fullName')}</Text>
            <View style={s.control}>
              <Icon name="user-5" size={18} color={color.text2} />
              <TextInput
                style={s.controlInput}
                placeholder={t('auth.fullNameHint')}
                placeholderTextColor={color.text3}
                value={vm.fullName}
                onChangeText={(val: string) => vm.setField('fullName', val)}
                autoCapitalize="words"
                autoComplete="name"
                accessibilityLabel={t('auth.fullName')}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.university')}</Text>
            <TextInput
              style={[s.control, s.controlInput]}
              placeholder={t('auth.universityPlaceholder')}
              placeholderTextColor={color.text3}
              value={vm.university}
              onChangeText={(val: string) => vm.setField('university', val)}
              accessibilityLabel={t('auth.university')}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.roll')}</Text>
            <TextInput
              style={[s.control, s.controlInput]}
              placeholder={t('auth.roll')}
              placeholderTextColor={color.text3}
              value={vm.rollNumber}
              onChangeText={(val: string) => vm.setField('rollNumber', val)}
              autoCapitalize="characters"
              accessibilityLabel={t('auth.roll')}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.dobFormat')}</Text>
            <TextInput
              style={[s.control, s.controlInput]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={color.text3}
              value={vm.dob}
              onChangeText={(val: string) => vm.setField('dob', val)}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t('auth.dob')}
            />
            <Text style={s.hint}>{t('auth.adultsOnly')}</Text>
          </View>

          <TouchableOpacity
            style={[s.primary, !profileComplete && s.primaryOff]}
            onPress={() => profileComplete && setSubStep('contact')}
            disabled={!profileComplete}
            accessibilityRole="button"
            aria-disabled={!profileComplete}
            accessibilityLabel={t('auth.nextContact')}
          >
            <Text style={[s.primaryText, !profileComplete && s.primaryTextOff]}>{t('auth.nextContact')}</Text>
            <Icon name="arrow-right" size={18} color={profileComplete ? color.onAction : color.text3} />
          </TouchableOpacity>
        </>
      )}

      {subStep === 'contact' && vm.noChannel ? <NoChannelNative vm={vm} /> : null}

      {subStep === 'contact' && !vm.noChannel && (
        <>
          <ChannelSwitchNative vm={vm} />

          <View style={s.field}>
            <Text style={s.label}>{t(whatsapp ? 'auth.field.WHATSAPP' : 'auth.field.EMAIL')}</Text>
            <View style={[s.control, vm.error && !vm.channelFailure ? s.controlInvalid : null]}>
              {whatsapp
                ? <Text style={s.prefix}>{t('launch.create.countryCode')}</Text>
                : <Icon name="mail-2" size={18} color={color.text2} />}
              <TextInput
                ref={(node: { focus: () => void } | null) => { contact.current = node; }}
                style={s.controlInput}
                placeholder={whatsapp ? t('launch.create.phonePlaceholder') : channelFieldCopy(vm.channel).placeholder}
                placeholderTextColor={color.text3}
                value={vm.identifier}
                onChangeText={(val: string) => vm.setIdentifier(val)}
                keyboardType={whatsapp ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t(whatsapp ? 'auth.field.WHATSAPP' : 'auth.field.EMAIL')}
              />
            </View>
            <Text style={s.hint}>{t(whatsapp ? 'auth.signup.hint.WHATSAPP' : 'auth.signup.hint.EMAIL')}</Text>
          </View>

          {sendError}

          <View style={s.assurance}>
            <Icon name="shield-check-4" size={18} color={color.positive} />
            <Text style={s.assuranceText}>{t('auth.signup.assurance')}</Text>
          </View>

          <TouchableOpacity
            style={[s.primary, !canSend && s.primaryOff]}
            onPress={() => void handleContactNext()}
            disabled={!canSend}
            accessibilityRole="button"
            aria-disabled={!canSend}
            aria-busy={vm.busy}
            accessibilityLabel={t('auth.sendCode')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <>
                <Text style={[s.primaryText, !canSend && s.primaryTextOff]}>{t('auth.sendCode')}</Text>
                <Icon name="arrow-right" size={20} color={canSend ? color.onAction : color.text3} />
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {subStep === 'otp' && (
        <>
          <View style={styles.otpHeader}>
            <Text style={styles.otpTitle}>{t('auth.verifyContact')}</Text>
            <Text style={s.lead}>{t('auth.code.sentShort', { masked: vm.masked || vm.identifier })}</Text>
          </View>

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

          {sendError}

          <TouchableOpacity
            style={[s.primary, (vm.code.length < 6 || vm.busy) && s.primaryOff]}
            onPress={() => void handleOtpSubmit()}
            disabled={vm.code.length < 6 || vm.busy}
            accessibilityRole="button"
            accessibilityLabel={t('auth.complete')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <Text style={[s.primaryText, vm.code.length < 6 && s.primaryTextOff]}>{t('auth.complete')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => setSubStep('contact')} accessibilityRole="button" accessibilityLabel={t('auth.changeContact')}>
            <Text style={s.linkText}>{t('auth.changeContact')}</Text>
          </TouchableOpacity>
        </>
      )}

      {subStep === 'second' && (
        <>
          <View style={styles.otpHeader}>
            <Text style={styles.otpTitle} accessibilityRole="header">{t(secondWhatsapp ? 'authpw.second.title.WHATSAPP' : 'authpw.second.title.EMAIL')}</Text>
            <Text style={s.lead}>{t('authpw.second.lead')}</Text>
          </View>
          {!vm.secondSent ? (
            <View style={s.field}>
              <Text style={s.label}>{t(secondWhatsapp ? 'contacts.phoneLabel' : 'contacts.emailLabel')}</Text>
              <View style={[s.control, vm.secondProblem ? s.controlInvalid : null]}>
                {secondWhatsapp
                  ? <Text style={s.prefix}>{t('launch.create.countryCode')}</Text>
                  : <Icon name="mail-2" size={18} color={color.text2} />}
                <TextInput
                  style={s.controlInput}
                  value={vm.secondValue}
                  onChangeText={(val: string) => vm.setSecondValue(val)}
                  keyboardType={secondWhatsapp ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t(secondWhatsapp ? 'contacts.phoneLabel' : 'contacts.emailLabel')}
                />
              </View>
            </View>
          ) : (
            <View style={s.field}>
              <Text style={s.label}>{t('authpw.second.codeLabel')}</Text>
              <TextInput
                style={[s.control, styles.otpInput]}
                value={vm.secondCode}
                onChangeText={(val: string) => vm.setSecondCode(val)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                autoFocus
                accessibilityLabel={t('authpw.second.codeLabel')}
              />
              <Text style={s.hint}>{t('authpw.second.codeHint', { target: vm.secondMasked })}</Text>
            </View>
          )}
          {vm.secondProblem ? <SendErrorNative message={t(vm.secondProblem)} /> : null}
          <TouchableOpacity
            style={[s.primary, (!secondReady || vm.busy) && s.primaryOff]}
            onPress={() => void handleSecond()}
            disabled={!secondReady || vm.busy}
            accessibilityRole="button"
            aria-busy={vm.busy}
            accessibilityLabel={t(vm.secondSent ? 'authpw.second.verify' : 'authpw.second.send')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <Text style={[s.primaryText, !secondReady && s.primaryTextOff]}>{t(vm.secondSent ? 'authpw.second.verify' : 'authpw.second.send')}</Text>
            )}
          </TouchableOpacity>
          {vm.secondSent ? (
            <TouchableOpacity style={s.link} onPress={vm.editSecond} accessibilityRole="button" accessibilityLabel={t('authpw.second.edit')}>
              <Text style={s.linkText}>{t('authpw.second.edit')}</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

      {subStep === 'password' && (
        <>
          <View style={styles.otpHeader}>
            <Text style={styles.otpTitle} accessibilityRole="header">{t('authpw.create.title')}</Text>
            <Text style={s.lead}>{t('authpw.create.lead', { min: vm.passwordMinLength })}</Text>
          </View>
          {(['create', 'again'] as const).map((which) => (
            <View key={which} style={s.field}>
              <Text style={s.label}>{t(which === 'create' ? 'authpw.create.label' : 'authpw.create.again')}</Text>
              <View style={[s.control, vm.newPasswordProblem ? s.controlInvalid : null]}>
                <Icon name="lock-keyhole" size={18} color={color.text2} />
                <TextInput
                  style={s.controlInput}
                  value={which === 'create' ? vm.password : vm.passwordAgain}
                  onChangeText={(val: string) => (which === 'create' ? vm.setNewPassword(val) : vm.setPasswordAgain(val))}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  maxLength={PASSWORD_MAX_LENGTH}
                  accessibilityLabel={t(which === 'create' ? 'authpw.create.label' : 'authpw.create.again')}
                />
              </View>
            </View>
          ))}
          <Text style={s.hint}>{t('authpw.create.hint')}</Text>
          {vm.newPasswordProblem ? <SendErrorNative message={t(vm.newPasswordProblem, { min: vm.passwordMinLength })} /> : null}
          <TouchableOpacity
            style={[s.primary, (!vm.password || !vm.passwordAgain) && s.primaryOff]}
            onPress={handlePassword}
            disabled={!vm.password || !vm.passwordAgain}
            accessibilityRole="button"
            accessibilityLabel={t('authpw.create.continue')}
          >
            <Text style={[s.primaryText, (!vm.password || !vm.passwordAgain) && s.primaryTextOff]}>{t('authpw.create.continue')}</Text>
          </TouchableOpacity>
        </>
      )}

      {subStep === 'consent' && (
        <>
          <SignupConsentNative consent={vm.consent} privacyUrl={`${apiBaseUrl().replace(/\/api$/, '')}/privacy`} />
          {vm.error ? <SendErrorNative message={vm.error} /> : null}
          <TouchableOpacity
            style={[s.primary, (!vm.consent.complete || vm.busy) && s.primaryOff]}
            onPress={() => void handleCreate()}
            disabled={!vm.consent.complete || vm.busy}
            accessibilityRole="button"
            accessibilityLabel={vm.consent.complete ? t('auth.complete') : t('member.consent.incomplete')}
          >
            {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
              <Text style={[s.primaryText, !vm.consent.complete && s.primaryTextOff]}>{vm.consent.complete ? t('auth.complete') : t('member.consent.incomplete')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={s.footer}>
        {onNavigateToSignIn && (
          <TouchableOpacity style={s.link} onPress={onNavigateToSignIn} accessibilityRole="link" accessibilityLabel={t('auth.haveAccount')}>
            <Text style={s.linkText}>{t('auth.haveAccount')}</Text>
            <Icon name="arrow-right" size={16} color={color.action} />
          </TouchableOpacity>
        )}
        {subStep === 'contact' ? <Text style={s.terms}>{t('auth.terms')}</Text> : null}
        <LegalLinksNative />
      </View>
    </AuthNativeFrame>
  );
});

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  segment: { flex: 1, height: 6, borderRadius: radius.full, backgroundColor: color.actionSoft },
  segmentDone: { backgroundColor: color.action },
  position: { marginLeft: space.s6, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(800), color: color.text },
  head: { gap: space.s6 },
  otpInput: { fontSize: font.size.heading, fontWeight: fontWeight(800), letterSpacing: 8, textAlign: 'center', color: color.text },
  otpHeader: { gap: space.s4 },
  otpTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(800), color: color.text },
});
