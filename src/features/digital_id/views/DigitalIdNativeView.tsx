import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Eyebrow, Note, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { DigitalIdViewModel } from '../viewmodel/DigitalIdViewModel';


const CELL = 6;

/**
 * Paints the server-issued QR from its cell rows. Each row is drawn as runs of
 * dark cells, so a 37×37 code is a few hundred views, not 1,369.
 */
export function QrCells({ rows, label }: { rows: string[]; label: string }): React.ReactElement {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.qr}>
      {rows.map((row, y) => {
        const runs: { start: number; length: number }[] = [];
        for (let x = 0; x < row.length; x += 1) {
          if (row[x] !== '1') continue;
          const last = runs[runs.length - 1];
          if (last && last.start + last.length === x) last.length += 1;
          else runs.push({ start: x, length: 1 });
        }
        return (
          <View key={y} style={[styles.qrRow, { width: row.length * CELL }]}>
            {runs.map((run) => (
              <View key={run.start} style={[styles.qrDark, { left: run.start * CELL, width: run.length * CELL }]} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** Member ID (design page 2: DigitalId). Shows only what GET /identity returns. */
export const DigitalIdNativeView = observer(function DigitalIdNativeView({ viewModel: vm }: { viewModel: DigitalIdViewModel }) {
  const id = vm.identity;
  const t = useT();
  const campusLabel = (status: MemberIdentity['campusStatus']) => t(`verify.campus.${status}.title` as MessageKey);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('id.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('id.title')}</Text>

      {vm.loading ? <Skeleton label={t('id.loading')} lines={['70%', '50%', '90%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('id.failedTitle')} body={t('id.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {id ? (
        <>
          <Card>
            <Text style={styles.name}>{id.fullName}</Text>
            <Text style={styles.meta}>{id.university || t('id.campusNotProvided')}{id.rollNumber ? ` · ${t('id.roll', { roll: id.rollNumber })}` : ''}</Text>
            <Text style={styles.meta}>{campusLabel(id.campusStatus)}</Text>
            <Text style={styles.mono}>{id.memberId}</Text>
          </Card>

          <Card>
            {id.issued && id.qrMatrix && vm.live ? (
              <>
                <View style={styles.qrWrap}>
                  <QrCells rows={id.qrMatrix} label={t('id.qrLabel')} />
                </View>
                <Text style={styles.meta}>{t('member.pass.code')} <Text style={styles.mono}>{id.passCode}</Text></Text>
                <Text style={styles.meta}>{t('member.pass.changesIn', { n: vm.secondsLeft ?? 0 })}</Text>
                <Text style={styles.meta}>{t('id.qrNote')}</Text>
              </>
            ) : id.issued ? (
              <Note tone="attention">{t('member.pass.stale')}</Note>
            ) : (
              <Text style={styles.meta}>{t('id.noQr')}</Text>
            )}
            {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
            <Button label={id.issued ? t('id.replace') : t('id.create')} variant={id.issued ? 'secondary' : 'primary'} fullWidth busy={vm.busy} onPress={() => void vm.issue()} />
            {id.issued && !vm.confirmingRevoke ? <Button label={t('id.revoke')} variant="ghost" fullWidth onPress={vm.askRevoke} /> : null}
            {vm.confirmingRevoke ? (
              <Note tone="attention" title={t('id.revokeTitle')}>{t('id.revokeBody')}</Note>
            ) : null}
            {vm.confirmingRevoke ? <Button label={t('id.revokeYes')} variant="danger" fullWidth busy={vm.busy} onPress={() => void vm.revoke()} /> : null}
            {vm.confirmingRevoke ? <Button label={t('id.keep')} variant="secondary" fullWidth onPress={vm.cancelRevoke} /> : null}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
});

export function DigitalIdRoute(): React.ReactElement {
  const [vm] = useState(() => new DigitalIdViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <DigitalIdNativeView viewModel={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  mono: { fontFamily: font.family.mono, fontSize: font.size.bodySm, color: color.text },
  qrWrap: { alignItems: 'center' },
  // A QR needs true black on white to scan, whatever the theme, so these two
  // colours are deliberately not theme tokens.
  // eslint-disable-next-line no-restricted-syntax
  qr: { backgroundColor: '#FFFFFF' },
  qrRow: { height: CELL, position: 'relative' },
  // eslint-disable-next-line no-restricted-syntax
  qrDark: { position: 'absolute', top: 0, height: CELL, backgroundColor: '#000000' },
});
