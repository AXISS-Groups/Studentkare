import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, Note, Rise } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { destinationsFor } from './homeDestinations';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * The signed-in hub of the native app. Before this, signing in landed on the
 * health vault with no way out, and eleven registered screens had no link.
 *
 * Each role sees only what it can use. The staff consoles live on the web, and
 * this screen says so rather than linking to a phone screen that cannot do
 * the job.
 */

export function StudentHomeScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { user, signOut } = useNativeSession();
  if (!user) return <View style={styles.screen} />;

  const destinations = destinationsFor(user.role);
  const firstName = user.fullName.split(' ')[0] ?? user.fullName;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>Your care</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          Hi, {firstName}
        </Text>
      </Rise>

      {/* Help is one tap away on every signed-in screen's entry point. */}
      <Rise index={1}>
        <Card>
          <Text style={styles.cardTitle}>Need help now?</Text>
          <Button label="Call 112" variant="danger" fullWidth onPress={() => void Linking.openURL('tel:112')} />
          <Button label="Emergency SOS" variant="secondary" fullWidth onPress={() => navigate('Emergency')} />
        </Card>
      </Rise>

      {destinations.length === 0 ? (
        <Rise index={2}>
          <Note title="Your console is on the web">
            Sign in at studentkare.co on a computer to open your workspace. The phone app covers student and clinician tools.
          </Note>
        </Rise>
      ) : (
        <View style={styles.list}>
          {destinations.map((d, i) => (
            <Rise key={d.route} index={i + 2}>
              <Card>
                <Text style={styles.cardTitle}>{d.label}</Text>
                <Text style={styles.hint}>{d.hint}</Text>
                <Button label={`Open ${d.label.toLowerCase()}`} variant="ghost" onPress={() => navigate(d.route)} />
              </Card>
            </Rise>
          ))}
        </View>
      )}

      <Button label="Sign out" variant="secondary" fullWidth onPress={() => void signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16 },
  title: {
    fontFamily: font.family.sans,
    fontSize: font.size.heading,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.text,
    marginTop: space.s4,
  },
  list: { gap: space.s12 },
  cardTitle: {
    fontFamily: font.family.sans,
    fontSize: font.size.titleSm,
    fontWeight: fontWeight(font.weight.strong),
    color: color.text,
  },
  hint: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
});
