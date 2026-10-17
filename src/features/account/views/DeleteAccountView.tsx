import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
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
  const t = useT();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('del.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('del.title')}</Text>

      {!s && !vm.loadFailed ? <Skeleton label={t('common.loading')} lines={['90%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {s && vm.scheduled ? (
        <>
          <Note tone="attention" title={t('del.scheduledTitle', { date: date(s.scheduledFor) })}>{t('del.scheduledBody')}</Note>
          {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
          <Button label={t('del.keep')} size="cta" fullWidth busy={vm.busy} onPress={() => void vm.cancel()} />
        </>
      ) : null}

      {s && !vm.scheduled ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>{t('del.what')}</Text>
            <Text style={styles.item}>{`• ${t('del.p1')}`}</Text>
            <Text style={styles.item}>{`• ${t('del.p2')}`}</Text>
            <Text style={styles.item}>{`• ${s.archiveRetentionDays ? t('del.p3days', { days: s.archiveRetentionDays }) : t('del.p3')}`}</Text>
            <Text style={styles.item}>{`• ${t('del.p4')}`}</Text>
          </Card>
          {links.exportData ? <Button label={t('del.export')} variant="secondary" fullWidth onPress={links.exportData} /> : null}
          <Card>
            <TextField label={t('del.typeToConfirm', { word: CONFIRM_WORD })} value={vm.confirmText} onChangeText={vm.setConfirmText} maxLength={10} />
            {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
            <Button label={t('del.confirm')} variant="danger" size="cta" fullWidth busy={vm.busy} disabled={!vm.canConfirm && !vm.busy} onPress={() => void vm.confirm()} />
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
