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

type VerificationStatus = 'todo' | 'busy' | 'verified';

interface IdentityVerifyNativeViewProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const IdentityVerifyNativeView: React.FC<IdentityVerifyNativeViewProps> = function IdentityVerifyNativeView({
  onBack,
  onSuccess,
}) {
  const [photoStatus, setPhotoStatus] = useState<VerificationStatus>('todo');
  const [emailStatus, setEmailStatus] = useState<VerificationStatus>('todo');
  const [campusStatus, setCampusStatus] = useState<VerificationStatus>('todo');
  const [govStatus, setGovStatus] = useState<VerificationStatus>('todo');

  const [emailInput, setEmailInput] = useState('');
  const [rollInput, setRollInput] = useState('');
  const [govIdInput, setGovIdInput] = useState('');
  const [activeModal, setActiveModal] = useState<'photo' | 'email' | 'campus' | 'gov' | null>(null);

  const isAllComplete =
    photoStatus === 'verified' &&
    emailStatus === 'verified' &&
    campusStatus === 'verified' &&
    govStatus === 'verified';

  const handleSimulateVerify = (pillar: 'photo' | 'email' | 'campus' | 'gov') => {
    if (pillar === 'photo') {
      setPhotoStatus('busy');
      setTimeout(() => {
        setPhotoStatus('verified');
        setActiveModal(null);
      }, 700);
    } else if (pillar === 'email') {
      if (!emailInput.trim()) return;
      setEmailStatus('busy');
      setTimeout(() => {
        setEmailStatus('verified');
        setActiveModal(null);
      }, 700);
    } else if (pillar === 'campus') {
      if (!rollInput.trim()) return;
      setCampusStatus('busy');
      setTimeout(() => {
        setCampusStatus('verified');
        setActiveModal(null);
      }, 700);
    } else if (pillar === 'gov') {
      if (!govIdInput.trim()) return;
      setGovStatus('busy');
      setTimeout(() => {
        setGovStatus('verified');
        setActiveModal(null);
      }, 700);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Identity verification screen"
      >
        <View style={styles.card}>
          {onBack && (
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
            <Text style={styles.eyebrow}>CAMPUS TRUST LEVEL 3</Text>
            <Text style={styles.title} accessibilityRole="header">
              Verify it’s you
            </Text>
            <Text style={styles.subtitle}>
              Clinical consultations, prescription dispensing, and health camps require identity verification under India’s DPDP Act.
            </Text>
          </View>

          <View style={styles.pillarsList}>
            {/* 1. Photo Liveness */}
            <View style={[styles.pillarRow, photoStatus === 'verified' && styles.pillarRowVerified]}>
              <View style={styles.pillarInfo}>
                <Text style={styles.pillarTitle}>1. Photo liveness check</Text>
                <Text style={styles.pillarSubtitle}>Quick selfie verification on your device camera</Text>
              </View>
              {photoStatus === 'verified' ? (
                <Text style={styles.statusVerified}>✓ Verified</Text>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActiveModal('photo')}
                  accessibilityRole="button"
                  accessibilityLabel="Start photo check"
                >
                  <Text style={styles.actionButtonText}>Verify</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2. Campus Email */}
            <View style={[styles.pillarRow, emailStatus === 'verified' && styles.pillarRowVerified]}>
              <View style={styles.pillarInfo}>
                <Text style={styles.pillarTitle}>2. Institute Email</Text>
                <Text style={styles.pillarSubtitle}>Confirms active university enrolment</Text>
              </View>
              {emailStatus === 'verified' ? (
                <Text style={styles.statusVerified}>✓ Verified</Text>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActiveModal('email')}
                  accessibilityRole="button"
                  accessibilityLabel="Verify institute email"
                >
                  <Text style={styles.actionButtonText}>Verify</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 3. Campus Roll Number */}
            <View style={[styles.pillarRow, campusStatus === 'verified' && styles.pillarRowVerified]}>
              <View style={styles.pillarInfo}>
                <Text style={styles.pillarTitle}>3. Student Roll Number</Text>
                <Text style={styles.pillarSubtitle}>Direct campus directory match</Text>
              </View>
              {campusStatus === 'verified' ? (
                <Text style={styles.statusVerified}>✓ Verified</Text>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActiveModal('campus')}
                  accessibilityRole="button"
                  accessibilityLabel="Verify student roll number"
                >
                  <Text style={styles.actionButtonText}>Verify</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 4. Government ID */}
            <View style={[styles.pillarRow, govStatus === 'verified' && styles.pillarRowVerified]}>
              <View style={styles.pillarInfo}>
                <Text style={styles.pillarTitle}>4. Government ID</Text>
                <Text style={styles.pillarSubtitle}>Aadhaar or PAN verification number</Text>
              </View>
              {govStatus === 'verified' ? (
                <Text style={styles.statusVerified}>✓ Verified</Text>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActiveModal('gov')}
                  accessibilityRole="button"
                  accessibilityLabel="Verify government ID"
                >
                  <Text style={styles.actionButtonText}>Verify</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Active Modal Drawer inline */}
          {activeModal === 'photo' && (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Take Liveness Selfie</Text>
              <Text style={styles.modalText}>Position your face inside the camera oval in good lighting.</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleSimulateVerify('photo')}
                accessibilityRole="button"
                accessibilityLabel="Capture photo and verify"
              >
                {photoStatus === 'busy' ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Capture &amp; Verify</Text>}
              </TouchableOpacity>
            </View>
          )}

          {activeModal === 'email' && (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Institute Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@college.edu.in"
                placeholderTextColor={color.text3}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Institute email"
              />
              <TouchableOpacity
                style={[styles.primaryButton, !emailInput.trim() && styles.buttonDisabled]}
                onPress={() => handleSimulateVerify('email')}
                disabled={!emailInput.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send OTP and verify email"
              >
                {emailStatus === 'busy' ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Verify Email</Text>}
              </TouchableOpacity>
            </View>
          )}

          {activeModal === 'campus' && (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Roll Number / ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 21B81A0501"
                placeholderTextColor={color.text3}
                value={rollInput}
                onChangeText={setRollInput}
                autoCapitalize="characters"
                accessibilityLabel="Roll number"
              />
              <TouchableOpacity
                style={[styles.primaryButton, !rollInput.trim() && styles.buttonDisabled]}
                onPress={() => handleSimulateVerify('campus')}
                disabled={!rollInput.trim()}
                accessibilityRole="button"
                accessibilityLabel="Confirm roll number"
              >
                {campusStatus === 'busy' ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Match Roll ID</Text>}
              </TouchableOpacity>
            </View>
          )}

          {activeModal === 'gov' && (
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Government ID (Aadhaar / PAN)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 12-digit Aadhaar or 10-digit PAN"
                placeholderTextColor={color.text3}
                value={govIdInput}
                onChangeText={setGovIdInput}
                autoCapitalize="characters"
                accessibilityLabel="Government ID number"
              />
              <TouchableOpacity
                style={[styles.primaryButton, !govIdInput.trim() && styles.buttonDisabled]}
                onPress={() => handleSimulateVerify('gov')}
                disabled={!govIdInput.trim()}
                accessibilityRole="button"
                accessibilityLabel="Verify government document"
              >
                {govStatus === 'busy' ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.primaryButtonText}>Verify ID</Text>}
              </TouchableOpacity>
            </View>
          )}

          {isAllComplete && (
            <TouchableOpacity
              style={styles.finishButton}
              onPress={onSuccess}
              accessibilityRole="button"
              accessibilityLabel="Identity verified: Complete"
            >
              <Text style={styles.finishButtonText}>Identity Verification Complete →</Text>
            </TouchableOpacity>
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
  eyebrow: { fontSize: skTokens.font.size.caption, fontWeight: '800', color: color.action, letterSpacing: 1 },
  title: { fontSize: skTokens.font.size.title, fontWeight: '800', color: color.text, letterSpacing: -0.5 },
  subtitle: { fontSize: skTokens.font.size.bodySm, color: color.text2, lineHeight: 20 },
  pillarsList: { gap: space.s10 },
  pillarRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.s14, borderRadius: radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface,
  },
  pillarRowVerified: { backgroundColor: color.positiveBg, borderColor: color.positive },
  pillarInfo: { flex: 1, gap: space.s2 },
  pillarTitle: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  pillarSubtitle: { fontSize: skTokens.font.size.caption, color: color.text2 },
  actionButton: {
    minHeight: 44, minWidth: 70, backgroundColor: color.action, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s12,
  },
  actionButtonText: { color: color.onAction, fontSize: skTokens.font.size.bodySm, fontWeight: '700' },
  statusVerified: { color: color.positive, fontWeight: '700', fontSize: skTokens.font.size.bodySm },
  modalBox: { backgroundColor: color.surface3, padding: space.s16, borderRadius: radius.lg, gap: space.s10 },
  modalTitle: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  modalText: { fontSize: skTokens.font.size.caption, color: color.text2 },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: color.ruleStrong, borderRadius: radius.lg,
    paddingHorizontal: space.s14, fontSize: skTokens.font.size.body, color: color.text, backgroundColor: color.surface,
  },
  primaryButton: { minHeight: 48, backgroundColor: color.action, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '700' },
  finishButton: { minHeight: 52, backgroundColor: color.positive, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  finishButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '800' },
});
