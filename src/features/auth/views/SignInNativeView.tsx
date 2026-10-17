import React from 'react';
import { useT } from '@/i18n';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { color } from '@/design-system/theme';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { CrisisLinks } from '@/design-system';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable } from './channelCopy';


const { space, radius } = skTokens;

interface SignInNativeViewProps {
  vm: AuthViewModel;
  onNavigateToSignUp?: () => void;
  onNavigateToLostPhone?: () => void;
  onSuccess?: () => void;
}

export const SignInNativeView: React.FC<SignInNativeViewProps> = observer(function SignInNativeView({
  vm,
  onNavigateToSignUp,
  onNavigateToLostPhone,
  onSuccess,
}) {
  const t = useT();
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.channels);

  const handleIdentifierSubmit = async () => {
    await vm.sendCode();
  };

  const handleCodeSubmit = async () => {
    await vm.verify(() => {
      if (onSuccess) {
        onSuccess();
      }
    });
  };

  // Only a correct authenticator code opens a session; anything else starts
  // sign-in again (the view model closes the spent attempt).
  const handleTwoFaSubmit = async () => {
    await vm.verify2FA(() => {
      if (onSuccess) {
        onSuccess();
      }
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel={t('auth.signin.title')}
      >
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {t('auth.signin.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.signin.lead')}
          </Text>

          {vm.step === 1 && (
            <>
              {vm.twoFaRestart ? (
                <View style={styles.notice} accessibilityRole="alert" testID="twofa-restart">
                  <Text style={styles.noticeText}>{t(vm.twoFaRestart)}</Text>
                </View>
              ) : null}

              <View style={styles.channelRow} accessibilityRole="radiogroup">
                <TouchableOpacity
                  style={[styles.channelTab, vm.channel === 'WHATSAPP' && styles.channelTabActive]}
                  onPress={() => vm.setChannel('WHATSAPP')}
                  accessibilityRole="radio"
                  accessibilityLabel={vm.channel === 'WHATSAPP' ? t('auth.channelSelected', { channel: t('auth.channel.WHATSAPP') }) : t('auth.channel.WHATSAPP')}
                >
                  <Text style={[styles.channelText, vm.channel === 'WHATSAPP' && styles.channelTextActive]}>
                    {t('auth.channel.WHATSAPP')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.channelTab, vm.channel === 'EMAIL' && styles.channelTabActive]}
                  onPress={() => vm.setChannel('EMAIL')}
                  accessibilityRole="radio"
                  accessibilityLabel={vm.channel === 'EMAIL' ? t('auth.channelSelected', { channel: t('auth.channel.EMAIL') }) : t('auth.channel.EMAIL')}
                >
                  <Text style={[styles.channelText, vm.channel === 'EMAIL' && styles.channelTextActive]}>
                    {t('auth.channel.EMAIL')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t(copy.label)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.placeholder}
                  placeholderTextColor={color.text3}
                  value={vm.identifier}
                  onChangeText={(val: string) => vm.setIdentifier(val)}
                  keyboardType={vm.channel === 'WHATSAPP' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={254}
                  accessibilityLabel={t(copy.label)}
                />
                <Text style={styles.hint}>
                  {t(vm.channel === 'EMAIL' ? 'auth.signin.hint.EMAIL' : 'auth.signin.hint.WHATSAPP')}
                </Text>
              </View>

              {vm.optionsError ? (
                <View style={styles.notice} accessibilityRole="alert">
                  <Text style={styles.noticeText}>{vm.optionsError}</Text>
                </View>
              ) : null}

              {vm.error ? (
                <View style={styles.errorNotice} accessibilityRole="alert">
                  <Text style={styles.errorText}>{vm.error}</Text>
                </View>
              ) : null}

              {!deliverable ? (
                <View style={styles.notice} accessibilityRole="alert">
                  <Text style={styles.noticeText}>
                    {t('auth.notConfigured', { channel: vm.channel === 'EMAIL' ? t('auth.channel.EMAIL') : t('auth.channel.WHATSAPP') })}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, (!deliverable || vm.busy) && styles.buttonDisabled]}
                onPress={() => void handleIdentifierSubmit()}
                disabled={!deliverable || vm.busy}
                accessibilityRole="button"
                accessibilityLabel={t('auth.continueToCode')}
              >
                {vm.busy ? (
                  <ActivityIndicator color={color.onAction} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.continue')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {vm.step === 3 && (
            <>
              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle}>{t('auth.code.enter')}</Text>
                <Text style={styles.otpSubtitle}>
                  {t('auth.code.sentShort', { masked: vm.masked || vm.identifier })}
                </Text>
              </View>

              <View style={styles.field}>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor={color.text3}
                  value={vm.code}
                  onChangeText={(val: string) => vm.setCode(val)}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                  accessibilityLabel={t('auth.code.a11y')}
                />
              </View>

              {vm.error ? (
                <View style={styles.errorNotice} accessibilityRole="alert">
                  <Text style={styles.errorText}>{vm.error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, (vm.code.length < 6 || vm.busy) && styles.buttonDisabled]}
                onPress={() => void handleCodeSubmit()}
                disabled={vm.code.length < 6 || vm.busy}
                accessibilityRole="button"
                accessibilityLabel={t('auth.verifySignIn')}
              >
                {vm.busy ? (
                  <ActivityIndicator color={color.onAction} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.verifySignIn')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => vm.reset()}
                accessibilityRole="button"
                accessibilityLabel={t(vm.channel === 'EMAIL' ? 'auth.changeChannel.EMAIL' : 'auth.changeChannel.WHATSAPP')}
              >
                <Text style={styles.textButtonLabel}>{t(vm.channel === 'EMAIL' ? 'auth.changeChannel.EMAIL' : 'auth.changeChannel.WHATSAPP')}</Text>
              </TouchableOpacity>
            </>
          )}

          {vm.step === 7 && (
            <>
              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle} accessibilityRole="header">{t('auth.twofa.title')}</Text>
                <Text style={styles.otpSubtitle}>{t('auth.twofa.body')}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.twofa.label')}</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
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
                style={[styles.primaryButton, (vm.twoFaCode.length < 6 || vm.busy) && styles.buttonDisabled]}
                onPress={() => void handleTwoFaSubmit()}
                disabled={vm.twoFaCode.length < 6 || vm.busy}
                accessibilityRole="button"
                accessibilityLabel={t('auth.verifySignIn')}              >
                {vm.busy ? (
                  <ActivityIndicator color={color.onAction} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.verifySignIn')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footerLinks}>
            {onNavigateToLostPhone && (
              <TouchableOpacity
                style={styles.linkTouch}
                onPress={onNavigateToLostPhone}
                accessibilityRole="link"
                accessibilityLabel={t('auth.lostPhone')}
              >
                <Text style={styles.linkText}>{t('auth.lostPhone')} →</Text>
              </TouchableOpacity>
            )}

            {onNavigateToSignUp && (
              <TouchableOpacity
                style={styles.linkTouch}
                onPress={onNavigateToSignUp}
                accessibilityRole="link"
                accessibilityLabel={t('auth.newStudent')}
              >
                <Text style={styles.linkTextSecondary}>{t('auth.newStudent')} →</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.termsText}>
            {t('auth.terms')}
          </Text>

          <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
          <LanguageSetting />
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.gutterPhone,
    paddingVertical: space.s24,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s20,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: space.s16,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: skTokens.font.size.title,
    fontWeight: '800',
    color: color.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: skTokens.font.size.bodySm,
    color: color.text2,
    lineHeight: 20,
  },
  channelRow: {
    flexDirection: 'row',
    backgroundColor: color.surface3,
    borderRadius: radius.md,
    padding: space.s4,
    gap: space.s4,
  },
  channelTab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  channelTabActive: {
    backgroundColor: color.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  channelText: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '600',
    color: color.text2,
  },
  channelTextActive: {
    color: color.action,
    fontWeight: '700',
  },
  field: {
    gap: space.s6,
  },
  label: {
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '700',
    color: color.text,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: radius.lg,
    paddingHorizontal: space.s14,
    fontSize: skTokens.font.size.body,
    color: color.text,
    backgroundColor: color.surface,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: skTokens.font.size.caption,
    color: color.text3,
    lineHeight: 16,
  },
  notice: {
    backgroundColor: color.surface3,
    padding: space.s12,
    borderRadius: radius.md,
  },
  noticeText: {
    fontSize: skTokens.font.size.caption,
    color: color.text2,
  },
  errorNotice: {
    backgroundColor: color.dangerBg,
    padding: space.s12,
    borderRadius: radius.md,
  },
  errorText: {
    fontSize: skTokens.font.size.caption,
    color: color.danger,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: color.action,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.s16,
  },
  buttonDisabled: {
    backgroundColor: color.actionSoft,
    opacity: 0.7,
  },
  primaryButtonText: {
    color: color.onAction,
    fontSize: skTokens.font.size.body,
    fontWeight: '700',
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textButtonLabel: {
    color: color.action,
    fontSize: skTokens.font.size.bodySm,
    fontWeight: '600',
  },
  otpHeader: {
    gap: space.s4,
  },
  otpTitle: {
    fontSize: skTokens.font.size.titleSm,
    fontWeight: '700',
    color: color.text,
  },
  otpSubtitle: {
    fontSize: skTokens.font.size.bodySm,
    color: color.text2,
  },
  footerLinks: {
    borderTopWidth: 1,
    borderTopColor: color.ruleSoft,
    paddingTop: space.s12,
    gap: space.s8,
  },
  linkTouch: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: skTokens.font.size.bodySm,
    color: color.action,
    fontWeight: '600',
  },
  linkTextSecondary: {
    fontSize: skTokens.font.size.bodySm,
    color: color.text2,
    fontWeight: '600',
  },
  termsText: {
    fontSize: skTokens.font.size.caption,
    color: color.text3,
    textAlign: 'center',
    lineHeight: 16,
  },
});
