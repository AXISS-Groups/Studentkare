import React, { useState } from 'react';
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
import type { AuthViewModel } from '../viewmodel/AuthViewModel';

const color = skTokens.color.light;
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
        accessibilityLabel="Create account screen"
      >
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            Create Student Account
          </Text>
          <Text style={styles.subtitle}>
            A portable, student-owned health record linked to your campus profile.
          </Text>

          {subStep === 'profile' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Full Legal Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="As per institute records"
                  placeholderTextColor={color.text3}
                  value={vm.fullName}
                  onChangeText={(val: string) => vm.setField('fullName', val)}
                  autoCapitalize="words"
                  accessibilityLabel="Full legal name"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>University or College</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SNIST / Delhi University"
                  placeholderTextColor={color.text3}
                  value={vm.university}
                  onChangeText={(val: string) => vm.setField('university', val)}
                  accessibilityLabel="University or college"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Roll Number / Student ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Campus roll number"
                  placeholderTextColor={color.text3}
                  value={vm.rollNumber}
                  onChangeText={(val: string) => vm.setField('rollNumber', val)}
                  autoCapitalize="characters"
                  accessibilityLabel="Roll number"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={color.text3}
                  value={vm.dob}
                  onChangeText={(val: string) => vm.setField('dob', val)}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel="Date of birth"
                />
                <Text style={styles.hint}>Studentkare is for students aged 18 and over.</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, !vm.fullName.trim() && styles.buttonDisabled]}
                onPress={handleProfileNext}
                disabled={!vm.fullName.trim()}
                accessibilityRole="button"
                accessibilityLabel="Next step: Contact info"
              >
                <Text style={styles.primaryButtonText}>Next: Contact info →</Text>
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
                  accessibilityLabel={vm.channel === 'WHATSAPP' ? 'WhatsApp, selected' : 'WhatsApp'}
                >
                  <Text style={[styles.channelText, vm.channel === 'WHATSAPP' && styles.channelTextActive]}>
                    WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.channelTab, vm.channel === 'EMAIL' && styles.channelTabActive]}
                  onPress={() => vm.setChannel('EMAIL')}
                  accessibilityRole="radio"
                  accessibilityLabel={vm.channel === 'EMAIL' ? 'Campus Email, selected' : 'Campus Email'}
                >
                  <Text style={[styles.channelText, vm.channel === 'EMAIL' && styles.channelTextActive]}>
                    Campus Email
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  {vm.channel === 'WHATSAPP' ? 'Mobile / WhatsApp Number *' : 'College Email Address *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={vm.channel === 'WHATSAPP' ? '10-digit mobile number' : 'you@college.edu.in'}
                  placeholderTextColor={color.text3}
                  value={vm.identifier}
                  onChangeText={(val: string) => vm.setIdentifier(val)}
                  keyboardType={vm.channel === 'WHATSAPP' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Phone or Email identifier"
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
                accessibilityLabel="Send OTP"
              >
                {vm.busy ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Send OTP Code</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setSubStep('profile')}
                accessibilityRole="button"
                accessibilityLabel="Back to profile details"
              >
                <Text style={styles.textButtonLabel}>← Back to profile details</Text>
              </TouchableOpacity>
            </>
          )}

          {subStep === 'otp' && (
            <>
              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle}>Verify Phone / Email</Text>
                <Text style={styles.otpSubtitle}>Enter 6-digit code sent to {vm.masked || vm.identifier}</Text>
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
                  accessibilityLabel="6-digit verification code"
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
                accessibilityLabel="Complete registration"
              >
                {vm.busy ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Complete Registration</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setSubStep('contact')}
                accessibilityRole="button"
                accessibilityLabel="Change contact info"
              >
                <Text style={styles.textButtonLabel}>Change contact information</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footerLinks}>
            {onNavigateToSignIn && (
              <TouchableOpacity
                style={styles.linkTouch}
                onPress={onNavigateToSignIn}
                accessibilityRole="link"
                accessibilityLabel="Already have an account? Sign in"
              >
                <Text style={styles.linkText}>Already have an account? Sign in →</Text>
              </TouchableOpacity>
            )}
          </View>
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
