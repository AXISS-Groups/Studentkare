import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Button, Card, CodeInput, CrisisLinks, ErrorState, Note, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, space } from '@/design-system/theme';
import type { TwoFactorViewModel } from '@/features/account/viewmodel/TwoFactorViewModel';

/** Groups the key in fours ("JBSW Y3DP EHPK 3PXP"): easier to type into an app. */
const grouped = (secret: string) => secret.replace(/(.{4})(?=.)/g, '$1 ');

/**
 * Native: a session the server holds until two-step sign-in is on.
 *
 * The account is signed in on the server but reaches nothing else, so this is
 * the only signed-in screen the app shows. Set-up happens here (the key as
 * grouped text and an otpauth link; a QR is no use on the phone that has to
 * scan it) or on the web. Sign-out and crisis help are always on screen. The
 * secret lives only in the view model's memory and goes when the screen does.
 */
export const TwoFactorHeldNativeView = observer(function TwoFactorHeldNativeView({
  viewModel: vm,
  onContinue,
  onSignOut,
}: {
  viewModel: TwoFactorViewModel;
  /** Re-read the session once 2FA is on (the server releases it). */
  onContinue: () => void;
  onSignOut: () => void;
}) {
  const t = useT();
  const status = vm.status;
  const enrolment = vm.enrolment;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Icon name="lock-keyhole" size={24} color={color.action} />
        <Text accessibilityRole="header" style={styles.title}>{t('auth.held.title')}</Text>
        <Text style={styles.body}>{t('auth.held.body')}</Text>
      </View>

      {vm.phase === 'loading' ? <Skeleton label={t('sec.loading')} lines={['60%', '100%', '80%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState title={t('sec.failedTitle')} body={t('sec.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      ) : null}

      {vm.phase === 'ready' && status ? (
        <Card testID="two-step-held">
          {vm.done ? <Note tone="positive">{t(vm.done)}</Note> : null}
          {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}

          {status.enabled ? (
            <Button label={t('sec.twofa.continue')} onPress={onContinue} icon={<Icon name="arrow-right" size={16} color={color.onAction} />} />
          ) : enrolment ? (
            <View style={styles.steps}>
              <Text style={styles.body}>{t('auth.held.keyStep')}</Text>
              <Text
                selectable
                style={styles.secret}
                accessibilityLabel={`${t('sec.twofa.cantScan')} ${enrolment.secret.split('').join(' ')}`}
                testID="two-step-secret"
              >
                {grouped(enrolment.secret)}
              </Text>
              <Button label={t('sec.twofa.openApp')} variant="secondary" onPress={() => void Linking.openURL(enrolment.otpauthUrl)} />
              <Text style={styles.body}>{t('sec.twofa.step2')}</Text>
              <CodeInput label={t('sec.twofa.codeLabel')} value={vm.code} onChangeText={vm.setCode} disabled={vm.busy} testID="two-step-code" />
              <Button label={t('sec.twofa.turnOn')} onPress={() => void vm.enable()} busy={vm.busy} disabled={!vm.canEnable && !vm.busy} />
              <Button label={t('common.cancel')} variant="ghost" onPress={vm.cancelSetup} disabled={vm.busy} />
            </View>
          ) : (
            <View style={styles.steps}>
              <Text style={styles.body}>{t('sec.twofa.statusOff')}</Text>
              <Button label={t('sec.twofa.setUp')} onPress={() => void vm.startSetup()} busy={vm.busy}
                icon={<Icon name="shield" size={16} color={color.onAction} />} />
              <Text style={styles.meta}>{t('auth.held.web')}</Text>
            </View>
          )}
        </Card>
      ) : null}

      <Button
        label={t('auth.held.signOut')}
        variant="ghost"
        onPress={onSignOut}
        disabled={vm.busy}
        icon={<Icon name="log-out" size={16} color={color.action} />}
        testID="two-step-held-sign-out"
      />

      <CrisisLinks testID="crisis-links" />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16 },
  head: { gap: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  steps: { gap: space.s12 },
  secret: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.clinicalValue, letterSpacing: 1 },
});
