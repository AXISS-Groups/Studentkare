import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, Eyebrow, Note, Rise } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { LostPhoneViewModel } from '../viewmodel/LostPhoneViewModel';

export interface LostPhoneLinks {
  /** Go to sign-in, returning here afterwards. */
  signIn: () => void;
  /** Re-issue the check-in pass on this device, where the platform has that screen. */
  openDigitalId?: () => void;
}

/**
 * Lost phone, one source for web and native. Tier 1 (DESIGN.md §5): this is
 * the minimum honest version, built on endpoints that exist, pending a named
 * design review of the full canvas flow.
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
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>Lost your phone?</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          Sign out of every other device
        </Text>
        <Text style={styles.body}>
          This ends every Studentkare session except the one on this device, and cancels your check-in pass so its QR stops
          working.
        </Text>
      </Rise>

      <Button label="Emergency? Call 112" variant="danger" fullWidth onPress={() => void Linking.openURL('tel:112')} />

      {!signedIn ? (
        <Card>
          <Text style={styles.cardTitle}>First, sign in on this device</Text>
          <Text style={styles.body}>Use your email or WhatsApp — the codes come to you, not to the lost phone’s app.</Text>
          <Button label="Sign in" fullWidth onPress={links.signIn} />
        </Card>
      ) : null}

      {signedIn && (vm.phase === 'ready' || vm.phase === 'busy') ? (
        <Button label="Sign out of all other devices" variant="danger" size="cta" fullWidth busy={vm.phase === 'busy'} onPress={() => void vm.revokeOthers()} />
      ) : null}

      {vm.phase === 'done' ? (
        <>
          <Note tone="positive" title="Done">
            {vm.summary}
          </Note>
          {vm.result?.passCancelled && links.openDigitalId ? (
            <Button label="Get a new check-in pass here" variant="secondary" fullWidth onPress={links.openDigitalId} />
          ) : null}
        </>
      ) : null}

      {vm.phase === 'failed' ? (
        <>
          <Note tone="danger" title="Nothing was signed out">
            We couldn’t reach Studentkare, so your other devices are still signed in. Try again when you’re connected.
          </Note>
          <Button label="Try again" fullWidth onPress={() => void vm.revokeOthers()} />
        </>
      ) : null}
    </ScrollView>
  );
});

export function LostPhoneRoute({ signedIn, links }: { signedIn: boolean; links: LostPhoneLinks }): React.ReactElement {
  const [vm] = useState(() => new LostPhoneViewModel());
  useEffect(() => () => vm.dispose(), [vm]);
  return <LostPhonePanel viewModel={vm} signedIn={signedIn} links={links} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 560 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
});
