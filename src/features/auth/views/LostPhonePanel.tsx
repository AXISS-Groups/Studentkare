import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Note, Sheet } from '@/design-system';
import { PhoneHeader } from '@/design-system/navigation/PhoneHeader';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { LostPhoneViewModel } from '../viewmodel/LostPhoneViewModel';

export interface LostPhoneLinks {
  /** Go to sign-in, returning here afterwards. */
  signIn: () => void;
  /** Re-issue the check-in pass on this device, where the platform has that screen. */
  openDigitalId?: () => void;
  /** Back (the header's chevron-left). */
  back?: () => void;
  /** Help, to report care someone got in your name; omitted where there is no help screen. */
  openHelp?: () => void;
}

/** India's emergency number and Tele-MANAS. Numbers are never translated. */
const CRISIS: readonly { tel: string; label: MessageKey; spoken: MessageKey }[] = [
  { tel: '112', label: 'ident.lost.call112', spoken: 'crisis.call112Spoken' },
  { tel: '14416', label: 'ident.lost.callManas', spoken: 'crisis.callTeleManasSpoken' },
];

/** The lead's crisis line: "Crisis help: 112 · Tele-MANAS 14416", each a call link (red: crisis). */
export function LostPhoneCrisisLine(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.crisis} testID="lost-crisis">
      <Text style={styles.crisisLead}>{t('ident.lost.crisis')}</Text>
      {CRISIS.map((line) => (
        <Pressable
          key={line.tel}
          role="link"
          accessibilityRole="link"
          accessibilityLabel={t(line.spoken)}
          aria-label={t(line.spoken)}
          onPress={() => void Linking.openURL(`tel:${line.tel}`)}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.crisisLink, focused ? focusRing : null]}
        >
          <Text style={styles.crisisText}>{t(line.label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Lost your phone (canvas LostPhone, Tier 1, approved 2026-10-21; decision D3-7).
 * One source for the web phone frame and the Expo app.
 *
 * Signed out (a friend's phone): sign in with a code first; the code goes to
 * email or WhatsApp, never asked for by phone. Signed in: one "sign out every
 * other device" action, confirmed in a sheet, reporting only what
 * POST /auth/sessions/revoke-others confirmed. There is no device list or
 * check-in log on the server yet, so the board's device picker and "was it
 * you?" are not drawn, and "Got a new phone?" waits for NewDevice.
 */
export const LostPhonePanel = observer(function LostPhonePanel({
  viewModel: vm,
  signedIn,
  links,
}: {
  viewModel: LostPhoneViewModel;
  signedIn: boolean;
  links: LostPhoneLinks;
}) {
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PhoneHeader
        title={t('ident.lost.title')}
        back={links.back ? { label: t('common.back'), onPress: links.back, icon: 'chevron-left' } : undefined}
      />
      <Text style={styles.body}>{t('ident.lost.lead')}</Text>
      <LostPhoneCrisisLine />

      {!signedIn ? (
        <View style={styles.block}>
          <Text style={styles.strongBody}>{t('ident.lost.signedOut')}</Text>
          <Button label={t('ident.lost.signIn')} size="cta" fullWidth onPress={links.signIn} testID="lost-sign-in" />
          <Text style={styles.small}>{t('ident.otp.never')}</Text>
        </View>
      ) : null}

      {signedIn && vm.phase !== 'done' ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('lost.title')}</Text>
          <Text style={styles.body}>{t('lost.body')}</Text>
          <Text style={styles.small}>{t('ident.lost.noList')}</Text>
          <Button
            testID="lost-secure"
            label={t('ident.lost.secure')}
            size="cta"
            fullWidth
            busy={vm.phase === 'busy'}
            onPress={vm.askConfirm}
          />
        </View>
      ) : null}

      {vm.phase === 'failed' ? (
        <View style={styles.block} accessibilityRole="alert">
          <Note tone="danger" title={t('lost.failedTitle')}>{t('lost.failedBody')}</Note>
          {links.openHelp ? <Button variant="secondary" label={t('ident.lost.help')} fullWidth onPress={links.openHelp} /> : null}
        </View>
      ) : null}

      {vm.phase === 'done' ? <LostPhoneResult viewModel={vm} links={links} /> : null}

      <Sheet visible={vm.phase === 'confirm' || vm.phase === 'busy'} busy={vm.phase === 'busy'} title={t('ident.lost.confirmTitle')} onClose={vm.cancelConfirm} testID="lost-confirm">
        <Text style={styles.sheetBody}>{t('ident.lost.confirmBody')}</Text>
        <View style={styles.sheetActions}>
          <Button label={t('ident.lost.confirmCancel')} variant="secondary" fullWidth disabled={vm.phase === 'busy'} onPress={vm.cancelConfirm} />
          <Button label={t('ident.lost.confirmYes')} variant="danger" fullWidth busy={vm.phase === 'busy'} onPress={() => void vm.revokeOthers()} testID="lost-confirm-yes" />
        </View>
      </Sheet>
    </ScrollView>
  );
});

/** What the server confirmed, as a checked list; "no pass" is an open circle, not a tick. */
export const LostPhoneResult = observer(function LostPhoneResult({ viewModel: vm, links }: { viewModel: LostPhoneViewModel; links: LostPhoneLinks }) {
  const t = useT();
  const [devices] = vm.summary;
  const pass = vm.result?.passCancelled === true;
  const steps: { done: boolean; text: string }[] = devices ? [
    { done: true, text: t(devices.key, devices.vars) },
    { done: pass, text: t(pass ? 'lost.passCancelled' : 'ident.lost.noPass') },
    { done: true, text: t('ident.lost.private') },
  ] : [];
  return (
    <View style={styles.card} testID="lost-result">
      <Text accessibilityRole="header" style={styles.cardTitle}>{t('lost.done')}</Text>
      <View role="list" style={styles.steps}>
        {steps.map((step) => (
          <View key={step.text} role="listitem" style={styles.step}>
            <Icon name={step.done ? 'check' : 'circle'} size={18} color={step.done ? color.positive : color.text3} strokeWidth={2.6} />
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
      {pass && links.openDigitalId ? (
        <Pressable
          role="link"
          accessibilityRole="link"
          onPress={links.openDigitalId}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.nextLink, focused ? focusRing : null]}
        >
          <Text style={styles.nextText}>{t('lost.newPass')}</Text>
          <Icon name="arrow-right" size={16} color={color.action} />
        </Pressable>
      ) : null}
    </View>
  );
});

export function LostPhoneRoute({ signedIn, links }: { signedIn: boolean; links: LostPhoneLinks }): React.ReactElement {
  const [vm] = useState(() => new LostPhoneViewModel());
  useEffect(() => () => vm.dispose(), [vm]);
  return <LostPhonePanel viewModel={vm} signedIn={signedIn} links={links} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: size.phoneWidth, width: '100%', alignSelf: 'center' },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  strongBody: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  small: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, textAlign: 'center', lineHeight: font.size.caption * font.lineHeight.body },
  block: { gap: space.s12 },
  crisis: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.s10 },
  crisisLead: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2 },
  crisisLink: { minHeight: size.touchTarget, justifyContent: 'center' },
  crisisText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  card: { gap: space.s12, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  steps: { gap: space.s10 },
  step: { flexDirection: 'row', gap: space.s10, alignItems: 'flex-start' },
  stepText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
  nextLink: { flexDirection: 'row', alignItems: 'center', gap: space.s6, minHeight: size.touchTarget },
  nextText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  sheetBody: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body, marginBottom: space.s16 },
  sheetActions: { gap: space.s10 },
});
