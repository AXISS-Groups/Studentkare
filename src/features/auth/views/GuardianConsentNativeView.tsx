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
import { skTokens } from '@/theme/tokens/generated/skTokens';

const color = skTokens.color.light;
const { space, radius } = skTokens;

interface GuardianConsentNativeViewProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const GuardianConsentNativeView: React.FC<GuardianConsentNativeViewProps> = function GuardianConsentNativeView({
  onBack,
  onSuccess,
}) {
  const [step, setStep] = useState<'form' | 'sent' | 'approved'>('form');
  const [guardianName, setGuardianName] = useState('');
  const [relation, setRelation] = useState<'Mother' | 'Father' | 'Legal Guardian'>('Mother');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!guardianName.trim() || !guardianPhone.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('sent');
    }, 700);
  };

  const handleSimulateApproval = () => {
    setStep('approved');
    if (onSuccess) {
      setTimeout(onSuccess, 1000);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Guardian consent screen"
      >
        <View style={styles.card}>
          {onBack && step !== 'approved' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.eyebrow}>RULE 8 · UNDER 18 PROTECTION GATE</Text>
            <Text style={styles.title} accessibilityRole="header">
              Guardian consent required
            </Text>
            <Text style={styles.subtitle}>
              For students under 18 years of age, clinical consultations and prescription dispensing require parental or guardian digital authorization under DPDP rules.
            </Text>
          </View>

          {step === 'form' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Parent or Legal Guardian Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={color.text3}
                  value={guardianName}
                  onChangeText={setGuardianName}
                  autoCapitalize="words"
                  accessibilityLabel="Guardian full name"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Relationship *</Text>
                <View style={styles.relationRow} accessibilityRole="radiogroup">
                  {(['Mother', 'Father', 'Legal Guardian'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.relationChip, relation === r && styles.relationChipSelected]}
                      onPress={() => setRelation(r)}
                      accessibilityRole="radio"
                      accessibilityLabel={relation === r ? `${r}, selected` : r}
                    >
                      <Text style={[styles.relationText, relation === r && styles.relationTextSelected]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Parent Mobile Number (WhatsApp / SMS) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={color.text3}
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  keyboardType="phone-pad"
                  accessibilityLabel="Guardian phone number"
                />
                <Text style={styles.hint}>
                  A secure, single-use consent approval link will be delivered via SMS/WhatsApp.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!guardianName.trim() || !guardianPhone.trim() || isSubmitting) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!guardianName.trim() || !guardianPhone.trim() || isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Send consent request to guardian"
              >
                {isSubmitting ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Send Consent Request →</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'sent' && (
            <View style={styles.sentBox}>
              <Text style={styles.sentTitle}>Consent Link Dispatched</Text>
              <Text style={styles.sentBody}>
                We sent a secure digital approval link to {guardianPhone}. Clinical features remain locked until approval is confirmed.
              </Text>
              <TouchableOpacity
                style={styles.simulateButton}
                onPress={handleSimulateApproval}
                accessibilityRole="button"
                accessibilityLabel="Simulate approval for testing"
              >
                <Text style={styles.simulateButtonText}>Confirm Guardian Approval (Test Mode)</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'approved' && (
            <View style={styles.approvedBox}>
              <Text style={styles.approvedTitle}>✓ Consent Confirmed</Text>
              <Text style={styles.approvedBody}>
                Your parent/guardian has authorized health services. Clinical booking is unlocked.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.gutterPhone, paddingVertical: space.s24 },
  card: {
    backgroundColor: color.surface, borderRadius: radius.xl, padding: space.s20,
    borderWidth: 1, borderColor: color.ruleSoft, gap: space.s16, maxWidth: 520, width: '100%', alignSelf: 'center',
  },
  backButton: { minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: skTokens.font.size.bodySm, color: color.action, fontWeight: '600' },
  header: { gap: space.s4 },
  eyebrow: { fontSize: skTokens.font.size.caption, fontWeight: '800', color: color.attention, letterSpacing: 1 },
  title: { fontSize: skTokens.font.size.title, fontWeight: '800', color: color.text, letterSpacing: -0.5 },
  subtitle: { fontSize: skTokens.font.size.bodySm, color: color.text2, lineHeight: 20 },
  field: { gap: space.s6 },
  label: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: color.ruleStrong, borderRadius: radius.lg,
    paddingHorizontal: space.s14, fontSize: skTokens.font.size.body, color: color.text, backgroundColor: color.surface,
  },
  hint: { fontSize: skTokens.font.size.caption, color: color.text3 },
  relationRow: { flexDirection: 'row', gap: space.s8, flexWrap: 'wrap' },
  relationChip: {
    minHeight: 44, paddingHorizontal: space.s14, borderRadius: radius.md, borderWidth: 1,
    borderColor: color.rule, backgroundColor: color.surface, justifyContent: 'center', alignItems: 'center',
  },
  relationChipSelected: { backgroundColor: color.action, borderColor: color.action },
  relationText: { fontSize: skTokens.font.size.bodySm, color: color.text, fontWeight: '600' },
  relationTextSelected: { color: color.onAction, fontWeight: '700' },
  primaryButton: { minHeight: 48, backgroundColor: color.action, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { backgroundColor: color.actionSoft, opacity: 0.7 },
  primaryButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '700' },
  sentBox: { backgroundColor: color.surface3, padding: space.s16, borderRadius: radius.lg, gap: space.s10 },
  sentTitle: { fontSize: skTokens.font.size.titleSm, fontWeight: '700', color: color.text },
  sentBody: { fontSize: skTokens.font.size.bodySm, color: color.text2, lineHeight: 20 },
  simulateButton: { minHeight: 44, backgroundColor: color.attention, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s12 },
  simulateButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: skTokens.font.size.caption },
  approvedBox: { backgroundColor: color.positiveBg, padding: space.s16, borderRadius: radius.lg, gap: space.s6 },
  approvedTitle: { fontSize: skTokens.font.size.titleSm, fontWeight: '800', color: color.positive },
  approvedBody: { fontSize: skTokens.font.size.bodySm, color: color.text, lineHeight: 20 },
});
