import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
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
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>{t('lost.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {t('lost.title')}
        </Text>
        <Text style={styles.body}>
          {t('lost.body')}
        </Text>
      </Rise>

      <Button label={t('lost.emergency')} variant="danger" fullWidth onPress={() => void Linking.openURL('tel:112')} />

      {!signedIn ? (
        <Card>
          <Text style={styles.cardTitle}>{t('lost.signInTitle')}</Text>
          <Text style={styles.body}>{t('lost.signInBody')}</Text>
          <Button label={t('auth.signIn')} fullWidth onPress={links.signIn} />
        </Card>
      ) : null}

      {signedIn && (vm.phase === 'ready' || vm.phase === 'busy') ? (
        <Button label={t('lost.signOutAll')} variant="danger" size="cta" fullWidth busy={vm.phase === 'busy'} onPress={() => void vm.revokeOthers()} />
      ) : null}

      {vm.phase === 'done' ? (
        <>
          <Note tone="positive" title={t('lost.done')}>
            {vm.summary.map((p) => t(p.key, p.vars)).join(' ')}
          </Note>
          {vm.result?.passCancelled && links.openDigitalId ? (
            <Button label={t('lost.newPass')} variant="secondary" fullWidth onPress={links.openDigitalId} />
          ) : null}
        </>
      ) : null}

      {vm.phase === 'failed' ? (
        <>
          <Note tone="danger" title={t('lost.failedTitle')}>{t('lost.failedBody')}</Note>
          <Button label={t('common.tryAgain')} fullWidth onPress={() => void vm.revokeOthers()} />
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
