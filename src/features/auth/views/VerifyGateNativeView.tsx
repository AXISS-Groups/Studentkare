import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { skTokens } from '@/theme/tokens/generated/skTokens';

const color = skTokens.color.light;
const { space, radius } = skTokens;

interface VerifyGateNativeViewProps {
  serviceName?: string;
  onProceedVerify: () => void;
  onDismiss?: () => void;
}

export const VerifyGateNativeView: React.FC<VerifyGateNativeViewProps> = function VerifyGateNativeView({
  serviceName = 'clinical services',
  onProceedVerify,
  onDismiss,
}) {
  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityLabel="Verification gate modal">
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>VERIFICATION REQUIRED</Text>
          <Text style={styles.title} accessibilityRole="header">
            Verify identity to proceed
          </Text>
          <Text style={styles.subtitle}>
            Under clinical governance regulations and campus safety rules, access to {serviceName} requires a verified campus student profile.
          </Text>
        </View>

        <View style={styles.neededBox}>
          <Text style={styles.neededTitle}>What is needed (~2 minutes):</Text>
          <Text style={styles.neededItem}>• Campus student email verification</Text>
          <Text style={styles.neededItem}>• College roll number or student ID</Text>
          <Text style={styles.neededItem}>• Quick selfie liveness check</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onProceedVerify}
            accessibilityRole="button"
            accessibilityLabel="Proceed to identity verification"
          >
            <Text style={styles.primaryButtonText}>Verify identity now →</Text>
          </TouchableOpacity>

          {onDismiss && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss verification prompt"
            >
              <Text style={styles.secondaryButtonText}>Not now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: color.canvas,
    justifyContent: 'center',
    paddingHorizontal: space.gutterPhone,
    paddingVertical: space.s24,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.s24,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    gap: space.s16,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: space.s6 },
  eyebrow: { fontSize: skTokens.font.size.caption, fontWeight: '800', color: color.action, letterSpacing: 1 },
  title: { fontSize: skTokens.font.size.title, fontWeight: '800', color: color.text, letterSpacing: -0.5 },
  subtitle: { fontSize: skTokens.font.size.bodySm, color: color.text2, lineHeight: 20 },
  neededBox: { backgroundColor: color.surface3, padding: space.s14, borderRadius: radius.lg, gap: space.s6 },
  neededTitle: { fontSize: skTokens.font.size.bodySm, fontWeight: '700', color: color.text },
  neededItem: { fontSize: skTokens.font.size.caption, color: color.text2, lineHeight: 18 },
  actions: { gap: space.s10, marginTop: space.s6 },
  primaryButton: { minHeight: 48, backgroundColor: color.action, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: color.onAction, fontSize: skTokens.font.size.body, fontWeight: '700' },
  secondaryButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: color.text2, fontSize: skTokens.font.size.bodySm, fontWeight: '600' },
});
