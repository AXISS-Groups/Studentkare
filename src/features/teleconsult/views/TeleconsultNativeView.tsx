import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, CrisisLinks, Eyebrow, Note } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';

export interface TeleconsultLinks {
  bookAppointment: () => void;
}

/**
 * Video consult (design page 2: Teleconsult). There is no video service behind
 * the app yet — the backend only records a signalling handshake — so this
 * screen says so and offers what does work. It replaces 400 lines of call UI
 * (camera toggles, a live timer, an in-call chat) for a call that could never
 * start.
 */
export function TeleconsultNativeView({ links }: { links: TeleconsultLinks }): React.ReactElement {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Video consult</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Not available yet</Text>
      <Note tone="info" title="No call can be started from the app">
        Video consultations aren’t connected yet. You can book an in-person or clinic appointment instead.
      </Note>
      <Button label="Book an appointment" size="cta" fullWidth onPress={links.bookAppointment} />
      <CrisisLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
