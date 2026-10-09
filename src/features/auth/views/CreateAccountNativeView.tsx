import React, { useState } from 'react';
import { channelFieldCopy } from './channelCopy';
import { useT } from '@/i18n';
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


const { space, radius } = skTokens;

interface CreateAccountNativeViewProps {
  vm: AuthViewModel;
  onNavigateToSignIn?: () => void;
  onSuccess?: () => void;
}

export const CreateAccountNativeView: React.FC<CreateAccountNativeViewProps> = observer(function CreateAccountNativeView({
  vm,
  onNavigateToSignIn,
  onSuccess,
}) {
  const [subStep, setSubStep] = useState<'profile' | 'contact' | 'otp'>('profile');
  const t = useT();

  const handleProfileNext = () => {
    if (!vm.fullName.trim()) return;
    setSubStep('contact');
  };

  const handleContactNext = async () => {
    await vm.sendCode();
    if (!vm.error) {
      setSubStep('otp');
    }
  };

  const handleOtpSubmit = async () => {
    await vm.verify(() => {
      if (!vm.error && onSuccess) {
        onSuccess();
      }
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel={t('auth.signup.title')}
      >
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {t('auth.signup.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.signup.lead')}
          </Text>

          {subStep === 'profile' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>{`${t('auth.fullName')} *`}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.fullNameHint')}
                  placeholderTextColor={color.text3}
                  value={vm.fullName}
                  onChangeText={(val: string) => vm.setField('fullName', val)}
                  autoCapitalize="words"
                  accessibilityLabel={t('auth.fullName')}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.university')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.universityPlaceholder')}
                  placeholderTextColor={color.text3}
                  value={vm.university}
                  onChangeText={(val: string) => vm.setField('university', val)}
                  accessibilityLabel={t('auth.university')}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.roll')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.roll')}
                  placeholderTextColor={color.text3}
                  value={vm.rollNumber}
                  onChangeText={(val: string) => vm.setField('rollNumber', val)}
                  autoCapitalize="characters"
                  accessibilityLabel={t('auth.roll')}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('auth.dobFormat')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={color.text3}
                  value={vm.dob}
                  onChangeText={(val: string) => vm.setField('dob', val)}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel={t('auth.dob')}
                />
                <Text style={styles.hint}>{t('auth.adultsOnly')}</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, !vm.fullName.trim() && styles.buttonDisabled]}
                onPress={handleProfileNext}
                disabled={!vm.fullName.trim()}
                accessibilityRole="button"
                accessibilityLabel={t('auth.nextContact')}
              >
                <Text style={styles.primaryButtonText}>{`${t('auth.nextContact')} →`}</Text>
              </TouchableOpacity>
            </>
          )}

          {subStep === 'contact' && (
            <>
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
                <Text style={styles.label}>
                  {`${t(vm.channel === 'WHATSAPP' ? 'auth.field.WHATSAPP' : 'auth.field.EMAIL')} *`}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={channelFieldCopy(vm.channel).placeholder}
                  placeholderTextColor={color.text3}
                  value={vm.identifier}
                  onChangeText={(val: string) => vm.setIdentifier(val)}
                  keyboardType={vm.channel === 'WHATSAPP' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t(vm.channel === 'WHATSAPP' ? 'auth.field.WHATSAPP' : 'auth.field.EMAIL')}
                />
              </View>

              {vm.error ? (
                <View style={styles.errorNotice} accessibilityRole="alert">
                  <Text style={styles.errorText}>{vm.error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, (!vm.identifier.trim() || vm.busy) && styles.buttonDisabled]}
                onPress={() => void handleContactNext()}
                disabled={!vm.identifier.trim() || vm.busy}
                accessibilityRole="button"
                accessibilityLabel={t('auth.sendCode')}
              >
                {vm.busy ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>{t('auth.sendCode')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setSubStep('profile')}
                accessibilityRole="button"
                accessibilityLabel={t('auth.backProfile')}
              >
                <Text style={styles.textButtonLabel}>{`← ${t('auth.backProfile')}`}</Text>
              </TouchableOpacity>
            </>
          )}

          {subStep === 'otp' && (
            <>
              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle}>{t('auth.verifyContact')}</Text>
                <Text style={styles.otpSubtitle}>{t('auth.code.sentShort', { masked: vm.masked || vm.identifier })}</Text>
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
                onPress={() => void handleOtpSubmit()}
                disabled={vm.code.length < 6 || vm.busy}
                accessibilityRole="button"
                accessibilityLabel={t('auth.complete')}
              >
                {vm.busy ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>{t('auth.complete')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setSubStep('contact')}
                accessibilityRole="button"
                accessibilityLabel={t('auth.changeContact')}
              >
                <Text style={styles.textButtonLabel}>{t('auth.changeContact')}</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footerLinks}>
            {onNavigateToSignIn && (
              <TouchableOpacity
                style={styles.linkTouch}
                onPress={onNavigateToSignIn}
                accessibilityRole="link"
                accessibilityLabel={t('auth.haveAccount')}
              >
                <Text style={styles.linkText}>{`${t('auth.haveAccount')} →`}</Text>
              </TouchableOpacity>
            )}
          </View>

          <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.gutterPhone, paddingVertical: space.s24 },
  card: {
    backgroundColor: color.surface, borderRadius: radius.xl, padding: space.s20,
    borderWidth: 1, borderColor: color.ruleSoft, gap: space.s16, maxWidth: 520, width: '100%', alignSelf: 'center',
  },
  title: { fontSize: skTokens.font.size.title, fontWeight: '800', color: color.text, letterSpacing: -0.5 },
  subtitle: { fontSize: skTokens.font.size.bodySm, color: color.text2, lineHeight: 20 },
  field: { gap: space.s6 },
  label: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: color.ruleStrong, borderRadius: radius.lg,
    paddingHorizontal: space.s14, fontSize: skTokens.font.size.body, color: color.text, backgroundColor: color.surface,
  },
  otpInput: { fontSize: 24, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
  hint: { fontSize: skTokens.font.size.caption, color: color.text3 },
  channelRow: { flexDirection: 'row', backgroundColor: color.surface3, borderRadius: radius.md, padding: space.s4, gap: space.s4 },
  channelTab: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm },
  channelTabActive: { backgroundColor: color.surface },
  channelText: { fontSize: skTokens.font.size.bodySm, fontWeight: '600', color: color.text2 },
  channelTextActive: { color: color.action, fontWeight: '700' },
  primaryButton: { minHeight: 48, backgroundColor: color.action, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s16 },
  buttonDisabled: { backgroundColor: color.actionSoft, opacity: 0.7 },
  primaryButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '700' },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  textButtonLabel: { color: color.action, fontSize: skTokens.font.size.bodySm, fontWeight: '600' },
  errorNotice: { backgroundColor: color.dangerBg, padding: space.s12, borderRadius: radius.md },
  errorText: { fontSize: skTokens.font.size.caption, color: color.danger, fontWeight: '600' },
  otpHeader: { gap: space.s4 },
  otpTitle: { fontSize: skTokens.font.size.titleSm, fontWeight: '700', color: color.text },
  otpSubtitle: { fontSize: skTokens.font.size.bodySm, color: color.text2 },
  footerLinks: { borderTopWidth: 1, borderTopColor: color.ruleSoft, paddingTop: space.s12 },
  linkTouch: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: skTokens.font.size.bodySm, color: color.action, fontWeight: '600' },
});
