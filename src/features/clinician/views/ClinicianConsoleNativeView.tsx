import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Eyebrow, Note } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';

/**
 * Clinician console on the native app (design page 5: ClinicianConsole).
 *
 * Patient records, prescribing and report review live on the web console,
 * where they are wired to the backend. This screen used to render, in dev
 * builds, invented patients with vitals and an "AI differential diagnosis"
 * with confidence scores — clinician-facing prediction belongs to the separate
 * M18 service (guardrail 5), not this app. It now states what is available.
 */
export function ClinicianConsoleNativeView(): React.ReactElement {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Clinician</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Clinician console</Text>
      <Note tone="info" title="Use the web console for patient work">
        Patient records aren’t available in the app. Prescribing, report reviews, encounter notes and your appointments are on the Studentkare clinician console on the web.
      </Note>
      <Card>
        <Text style={styles.item}>In the app you can read your notifications.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  item: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
});
