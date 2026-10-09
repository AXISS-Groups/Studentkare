import React from 'react';
import { useT } from '@/i18n';
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
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('consult.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('consult.title')}</Text>
      <Note tone="info" title={t('consult.noteTitle')}>{t('consult.noteBody')}</Note>
      <Button label={t('consult.book')} size="cta" fullWidth onPress={links.bookAppointment} />
      <CrisisLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
