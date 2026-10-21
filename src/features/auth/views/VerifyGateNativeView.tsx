import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { color, space } from '@/design-system/theme';
import { CrisisLinks } from '@/design-system';
import { VerifyGateRoute } from './VerifyGateCard';
import type { AlwaysOpenLinks } from './VerifyGateCard';

interface VerifyGateNativeViewProps {
  onProceedVerify: () => void;
  onDismiss: () => void;
  /** Crisis support, SOS, emergency card (and help where it exists): never behind the gate. */
  always: AlwaysOpenLinks;
}

/**
 * Expo screen for the verification gate (canvas VerifyGate, Tier 1, approved
 * 2026-10-21): the same card as the web sheet, GET /identity for the rows.
 */
export function VerifyGateNativeView({ onProceedVerify, onDismiss, always }: VerifyGateNativeViewProps): React.ReactElement {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <VerifyGateRoute links={{ finish: onProceedVerify, notNow: onDismiss, always }} />
      <CrisisLinks titleKey="crisis.noVerify" testID="crisis-links" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16 },
});
