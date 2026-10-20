import React from 'react';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, Note, Rise } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { destinationsFor } from './homeDestinations';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';
import { useT } from '@/i18n';
import { HomeDiscoverView } from '@/features/discover/views/HomeDiscoverView';

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
  const t = useT();
  const { user, signOut } = useNativeSession();
  if (!user) return <View style={styles.screen} />;

  const destinations = destinationsFor(user.role);
  const firstName = user.fullName.split(' ')[0] ?? user.fullName;

  // A student's home is the Discover board (canvas HomeDiscover); the rest of
  // the app stays reachable from the list under it, and the tab bar.
  if (user.role === 'STUDENT') {
    return (
      <HomeDiscoverView
        brandRow
        campus={user.university ?? ''}
        verified={user.isVerifiedStudent === true}
        links={{
          openSearch: () => navigate('Search'),
          openCrisis: () => navigate('Emergency'),
          call112: () => void Linking.openURL('tel:112'),
          openShop: () => navigate('Marketplace'),
          openAyush: () => navigate('AiChat'),
          openNotifications: () => navigate('Notifications'),
        }}
        footer={(
          <View style={styles.list}>
            {destinations.map((d) => (
              <Card key={d.route}>
                <Text style={styles.cardTitle}>{t(d.label)}</Text>
                <Text style={styles.hint}>{t(d.hint)}</Text>
                <Button label={t('home.open', { label: t(d.label) })} variant="ghost" onPress={() => navigate(d.route)} />
              </Card>
            ))}
            <LanguageSetting />
            <Button label={t('home.signOut')} variant="secondary" fullWidth onPress={() => void signOut()} />
          </View>
        )}
      />
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>{t('home.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {t('home.greeting', { name: firstName })}
        </Text>
      </Rise>

      {/* Help is one tap away on every signed-in screen's entry point. */}
      <Rise index={1}>
        <Card>
          <Text style={styles.cardTitle}>{t('home.needHelp')}</Text>
          <Button label={t('crisis.call112')} variant="danger" fullWidth onPress={() => void Linking.openURL('tel:112')} />
          <Button label={t('home.sos')} variant="secondary" fullWidth onPress={() => navigate('Emergency')} />
        </Card>
      </Rise>

      {destinations.length === 0 ? (
        <Rise index={2}>
          <Note title={t('home.webConsoleTitle')}>{t('home.webConsoleBody')}</Note>
        </Rise>
      ) : (
        <View style={styles.list}>
          {destinations.map((d, i) => (
            <Rise key={d.route} index={i + 2}>
              <Card>
                <Text style={styles.cardTitle}>{t(d.label)}</Text>
                <Text style={styles.hint}>{t(d.hint)}</Text>
                <Button label={t('home.open', { label: t(d.label) })} variant="ghost" onPress={() => navigate(d.route)} />
              </Card>
            </Rise>
          ))}
        </View>
      )}

      <LanguageSetting />
      <Button label={t('home.signOut')} variant="secondary" fullWidth onPress={() => void signOut()} />
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
