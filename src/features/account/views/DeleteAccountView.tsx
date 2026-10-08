import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Eyebrow, Note, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { CONFIRM_WORD, DeleteAccountViewModel } from '../viewmodel/DeleteAccountViewModel';

export interface DeleteAccountLinks {
  /** Download my data first, where the platform has it. */
  exportData?: () => void;
}

const date = (s: number | null) => (s ? new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** One source for web and native. No animation: this is a destructive confirm (motion board). */
export const DeleteAccountView = observer(function DeleteAccountView({ viewModel: vm, links }: { viewModel: DeleteAccountViewModel; links: DeleteAccountLinks }) {
  const s = vm.state;
  const kept = s?.archiveRetentionDays
    ? `a sealed, encrypted copy for ${s.archiveRetentionDays} days`
    : 'a sealed, encrypted copy for a limited period';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Your account</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Delete my account</Text>

      {!s && !vm.loadFailed ? <Skeleton label="Loading" lines={['90%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title="Couldn't load this" body="This is on our side, not yours. Try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}

      {s && vm.scheduled ? (
        <>
          <Note tone="attention" title={`Your account will be deleted on ${date(s.scheduledFor)}`}>
            Until then everything works as normal, and you can change your mind.
          </Note>
          {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
          <Button label="Cancel — keep my account" size="cta" fullWidth busy={vm.busy} onPress={() => void vm.cancel()} />
        </>
      ) : null}

      {s && !vm.scheduled ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>What happens</Text>
            <Text style={styles.item}>• In 7 days, your account and everything in it — records, reports, prescriptions, readings, orders and messages — are removed from Studentkare. You can cancel until then.</Text>
            <Text style={styles.item}>• After that you can’t sign in, and nothing can be recovered by you.</Text>
            <Text style={styles.item}>• For legal and safety reasons we keep {kept}. Only a super administrator can open it, only with a recorded reason, and then it’s destroyed.</Text>
            <Text style={styles.item}>• Our audit log keeps a record that actions happened, with a random ID and never your name.</Text>
          </Card>
          {links.exportData ? <Button label="Download my data first" variant="secondary" fullWidth onPress={links.exportData} /> : null}
          <Card>
            <TextField label={`Type ${CONFIRM_WORD} to confirm`} value={vm.confirmText} onChangeText={vm.setConfirmText} maxLength={10} />
            {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
            <Button label="Delete my account in 7 days" variant="danger" size="cta" fullWidth busy={vm.busy} disabled={!vm.canConfirm && !vm.busy} onPress={() => void vm.confirm()} />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
});

export function DeleteAccountRoute({ links }: { links: DeleteAccountLinks }): React.ReactElement {
  const [vm] = useState(() => new DeleteAccountViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <DeleteAccountView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  item: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
});
