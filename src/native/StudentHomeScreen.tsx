import React from 'react';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Eyebrow, Note, Rise } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { destinationsFor } from './homeDestinations';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';
import { useT } from '@/i18n';
import { M2ActiveProvider } from '@/design-system/m2';
import { M2HomeView } from '@/features/m2store/views/M2HomeView';
import { useM2HomeData } from '@/features/m2store/data/useM2Home';
import type { DestinationRoute } from './homeDestinations';
import { getSetting } from '@/data/services/config';

/** Values the destination hints may name (the Delete account hint states the grace period). */
const HINT_VARS = () => ({ graceDays: getSetting('privacy.deletion_grace_days') });

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

  // A student's home is Mobile 2.0 Home (canvas page 9 M2Home); the rest of the
  // app stays reachable from the list under it, and the pill nav.
  if (user.role === 'STUDENT') {
    return (
      <StudentM2Home
        name={user.fullName}
        campus={user.university ?? ''}
        verified={user.isVerifiedStudent === true}
        footer={(
          <View style={styles.list}>
            {destinations.map((d) => (
              <Card key={d.route}>
                <Text style={styles.cardTitle}>{t(d.label)}</Text>
                <Text style={styles.hint}>{t(d.hint, HINT_VARS())}</Text>
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
                <Text style={styles.hint}>{t(d.hint, HINT_VARS())}</Text>
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

/** Mobile 2.0 Home with the app's screens behind each part (no cart badge: the app's cart lives in Checkout). */
function StudentM2Home({ name, campus, verified, footer }: { name: string; campus: string; verified: boolean; footer: React.ReactNode }): React.ReactElement {
  const navigate = useNavigate();
  const focused = useIsFocused();
  const data = useM2HomeData();
  const go = (route: DestinationRoute | 'Emergency' | 'Checkout' | 'Medicines' | 'Labs' | 'Consults' | 'FindCare' | 'Insurance' | 'Vaccines' | 'More' | 'Profile' | 'HostelVisit' | 'Camp') => () => navigate(route);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <M2ActiveProvider value={focused}>
      <M2HomeView
        name={name}
        campus={campus}
        verified={verified}
        data={data}
        recent={[]}
        footer={footer}
        links={{
          sos: go('Emergency'),
          menu: go('More'),
          notifications: go('Notifications'),
          cart: go('Checkout'),
          search: go('Search'),
          uploadRx: go('Vault'),
          place: go('Profile'),
          services: { medicines: go('Medicines'), labs: go('Labs'), consults: go('Consults'), nearMe: go('FindCare'), vaccines: go('Vaccines'), insurance: go('Insurance'), campus: go('DigitalId') },
          labs: go('Labs'),
          generics: go('Medicines'),
          uploadReport: go('Vault'),
          meds: go('MedicineReminders'),
          buyAgain: go('Orders'),
          consult: go('Appointments'),
          bookConsult: go('Consults'),
          concern: go('Medicines'),
          product: go('Marketplace'),
          emergencyCard: go('Emergency'),
          pass: go('DigitalId'),
          hostelVisit: go('HostelVisit'),
          camp: go('Camp'),
        }}
      />
    </M2ActiveProvider>
    </SafeAreaView>
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
