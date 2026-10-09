import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { HealthVaultViewModel } from '../viewmodel/HealthVaultViewModel';

const day = (seconds: number) => new Date(seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Health records (design page 2: RecordsVault). Your documents, and who you've shared them with. */
export const HealthVaultNativeView = observer(function HealthVaultNativeView({ viewModel: vm }: { viewModel: HealthVaultViewModel }) {
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('vault.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('vault.title')}</Text>

      {vm.loading ? <Skeleton label={t('vault.loading')} lines={['90%', '70%', '80%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('vault.failedTitle')} body={t('vault.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {vm.documents ? (
        <Card>
          <Text style={styles.cardTitle}>{t('vault.documents', { count: vm.documents.length })}</Text>
          {vm.documents.length === 0 ? (
            <EmptyState title={t('vault.emptyTitle')} body={t('vault.emptyBody')} />
          ) : (
            vm.documents.map((doc) => (
              <View key={doc.id} style={styles.row}>
                <Text style={styles.item}>{doc.title}</Text>
                <Text style={styles.meta}>{`${doc.category.replace(/_/g, ' ').toLowerCase()} · ${t('vault.added', { date: day(doc.createdAt) })}`}</Text>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {vm.shares ? (
        <Card>
          <Text style={styles.cardTitle}>{t('vault.sharedWith')}</Text>
          {vm.activeShares.length === 0 ? (
            <Text style={styles.meta}>{t('vault.noShares')}</Text>
          ) : (
            vm.activeShares.map((share) => (
              <View key={share.id} style={styles.row}>
                <Text style={styles.item}>{share.clinician}</Text>
                <Text style={styles.meta}>{t('vault.until', { document: share.document, date: day(share.expiresAt) })}</Text>
                <Button
                  label={t('vault.withdraw')}
                  variant="secondary"
                  accessibilityLabel={t('vault.withdrawSpoken', { clinician: share.clinician, document: share.document })}
                  busy={vm.revokingId === share.id}
                  onPress={() => void vm.revoke(share.id)}
                />
              </View>
            ))
          )}
          {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
        </Card>
      ) : null}
    </ScrollView>
  );
});

export function HealthVaultRoute(): React.ReactElement {
  const [vm] = useState(() => new HealthVaultViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <HealthVaultNativeView viewModel={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  row: { gap: space.s4, paddingVertical: space.s8 },
  item: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
});
