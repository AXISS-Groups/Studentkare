import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { isBiometricsAvailable, authenticateWithBiometrics } from '@/native/hardware/biometrics';

const color = skTokens.color.light;
const { space, radius } = skTokens;

interface DeviceItem {
  id: string;
  name: string;
  meta: string;
  note: string;
  isCurrent: boolean;
}

interface LostPhoneNativeViewProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const LostPhoneNativeView: React.FC<LostPhoneNativeViewProps> = function LostPhoneNativeView({
  onBack,
  onSuccess,
}) {
  const [step, setStep] = useState<'pick' | 'confirm' | 'done'>('pick');
  const [selectedDev, setSelectedDev] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const devices: DeviceItem[] = [
    {
      id: 'phone',
      name: 'Mobile Phone · Studentkare app',
      meta: 'Last active today · Campus block',
      note: 'Holds check-in pass and encrypted health vault cache',
      isCurrent: false,
    },
    {
      id: 'tablet',
      name: 'Tablet Device · Studentkare app',
      meta: 'Last active 3 days ago · Library Wi-Fi',
      note: 'Secondary device — active session',
      isCurrent: false,
    },
  ];

  const revocationConsequences = [
    'Check-in passes cancelled immediately — cryptographic tokens invalidated',
    'Session revoked — device forcibly signed out',
    'Local health vault cache scheduled for remote wipe on reconnection',
    'Privacy firewall maintained — no public broadcast to campus administrators',
  ];

  const handleRevoke = async () => {
    setBusy(true);
    setBioError(null);
    const hasBio = await isBiometricsAvailable();
    if (hasBio) {
      const bioAuth = await authenticateWithBiometrics('Authenticate to confirm device revocation');
      if (!bioAuth.success) {
        setBusy(false);
        setBioError(bioAuth.error || 'Biometric authentication required to revoke device passes.');
        return;
      }
    }
    // Simulate fail-closed revocation network call
    setTimeout(() => {
      setBusy(false);
      setStep('done');
      if (onSuccess) onSuccess();
    }, 800);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Lost phone recovery screen"
      >
        <View style={styles.card}>
          {onBack && step !== 'done' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
            >
              <Text style={styles.backText}>← Back to sign in</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title} accessibilityRole="header">
            {step === 'done' ? 'Device unlinked' : 'Lost your phone?'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'done'
              ? 'Your account has been secured and the device pass was revoked.'
              : 'Unbind your registered device, invalidate check-in passes, and safeguard your vault.'}
          </Text>

          {step === 'pick' && (
            <>
              <View style={styles.warningNotice} accessibilityRole="alert">
                <Text style={styles.warningTitle}>Security Protection</Text>
                <Text style={styles.warningBody}>
                  Select the lost or stolen device to immediately sever its session tokens and block access.
                </Text>
              </View>

              <View style={styles.list}>
                {devices.map((dev, idx) => (
                  <TouchableOpacity
                    key={dev.id}
                    style={[styles.deviceItem, selectedDev === idx && styles.deviceItemSelected]}
                    onPress={() => setSelectedDev(idx)}
                    accessibilityRole="radio"
                    accessibilityLabel={selectedDev === idx ? `${dev.name}, selected` : dev.name}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{dev.name}</Text>
                      <Text style={styles.deviceMeta}>{dev.meta}</Text>
                      <Text style={styles.deviceNote}>{dev.note}</Text>
                    </View>
                    <View style={[styles.radioDot, selectedDev === idx && styles.radioDotSelected]} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.dangerButton, selectedDev === null && styles.buttonDisabled]}
                onPress={() => setStep('confirm')}
                disabled={selectedDev === null}
                accessibilityRole="button"
                accessibilityLabel="Proceed to confirmation"
              >
                <Text style={styles.dangerButtonText}>Proceed to unbind device →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'confirm' && (
            <>
              <View style={styles.confirmBox}>
                <Text style={styles.confirmHeader}>Confirm device unbind</Text>
                <Text style={styles.confirmDevName}>{selectedDev !== null ? devices[selectedDev].name : ''}</Text>
                <View style={styles.consequencesList}>
                  {revocationConsequences.map((c, i) => (
                    <Text key={i} style={styles.consequenceItem}>
                      • {c}
                    </Text>
                  ))}
                </View>
              </View>

              {bioError ? (
                <View style={styles.errorNotice} accessibilityRole="alert">
                  <Text style={styles.errorText}>{bioError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.dangerButton, busy && styles.buttonDisabled]}
                onPress={() => void handleRevoke()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Confirm and revoke device passes"
              >
                {busy ? <ActivityIndicator color={color.onAction} /> : <Text style={styles.dangerButtonText}>Revoke passes &amp; unbind now</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setStep('pick')}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.textButtonLabel}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <View style={styles.successNotice}>
                <Text style={styles.successTitle}>Security lock successful</Text>
                <Text style={styles.successBody}>
                  The selected device will no longer be permitted to access your medical records or check-in passes. You may log in afresh on a new device whenever ready.
                </Text>
              </View>

              {onBack && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Return to sign in"
                >
                  <Text style={styles.primaryButtonText}>Return to sign in</Text>
                </TouchableOpacity>
              )}
            </>
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
  title: { fontSize: skTokens.font.size.title, fontWeight: '800', color: color.text, letterSpacing: -0.5 },
  subtitle: { fontSize: skTokens.font.size.bodySm, color: color.text2, lineHeight: 20 },
  warningNotice: { backgroundColor: color.attentionBg, padding: space.s14, borderRadius: radius.md, gap: space.s4 },
  warningTitle: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.attention },
  warningBody: { fontSize: skTokens.font.size.caption, color: color.text },
  list: { gap: space.s10 },
  deviceItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.s14, borderWidth: 1, borderColor: color.rule, borderRadius: radius.lg, backgroundColor: color.surface,
  },
  deviceItemSelected: { borderColor: color.danger, backgroundColor: color.dangerBg },
  deviceInfo: { flex: 1, gap: space.s2 },
  deviceName: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  deviceMeta: { fontSize: skTokens.font.size.caption, color: color.text2 },
  deviceNote: { fontSize: skTokens.font.size.caption, color: color.text3 },
  radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.ruleStrong },
  radioDotSelected: { borderColor: color.danger, backgroundColor: color.danger },
  dangerButton: { minHeight: 48, backgroundColor: color.danger, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s16 },
  dangerButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '700' },
  primaryButton: { minHeight: 48, backgroundColor: color.action, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s16 },
  primaryButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  confirmBox: { backgroundColor: color.surface3, padding: space.s16, borderRadius: radius.lg, gap: space.s8 },
  confirmHeader: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  confirmDevName: { fontSize: skTokens.font.size.titleSm, fontWeight: '800', color: color.danger },
  consequencesList: { gap: space.s6, marginTop: space.s6 },
  consequenceItem: { fontSize: skTokens.font.size.caption, color: color.text2, lineHeight: 18 },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  textButtonLabel: { color: color.text2, fontSize: skTokens.font.size.bodySm, fontWeight: '600' },
  successNotice: { backgroundColor: color.positiveBg, padding: space.s16, borderRadius: radius.lg, gap: space.s6 },
  successTitle: { fontSize: skTokens.font.size.titleSm, fontWeight: '800', color: color.positive },
  successBody: { fontSize: skTokens.font.size.bodySm, color: color.text, lineHeight: 20 },
  errorNotice: { backgroundColor: color.dangerBg, padding: space.s12, borderRadius: radius.md, borderWidth: 1, borderColor: color.danger, marginTop: space.s4 },
  errorText: { color: color.danger, fontSize: skTokens.font.size.caption, fontWeight: '600' },
});
