import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { HealthVaultViewModel } from '../viewmodel/HealthVaultViewModel';

const day = (seconds: number) => new Date(seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Health records (design page 2: RecordsVault). Your documents, and who you've shared them with. */
export const HealthVaultNativeView = observer(function HealthVaultNativeView({ viewModel: vm }: { viewModel: HealthVaultViewModel }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Your records</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Health records</Text>

      {vm.loading ? <Skeleton label="Loading your records" lines={['90%', '70%', '80%']} /> : null}
      {vm.loadFailed ? <ErrorState title="Couldn't load your records" body="This is on our side, not yours. Try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}

      {vm.documents ? (
        <Card>
          <Text style={styles.cardTitle}>{`Documents (${vm.documents.length})`}</Text>
          {vm.documents.length === 0 ? (
            <EmptyState title="No records yet" body="Documents you upload on the Studentkare website appear here." />
          ) : (
            vm.documents.map((doc) => (
              <View key={doc.id} style={styles.row}>
                <Text style={styles.item}>{doc.title}</Text>
                <Text style={styles.meta}>{`${doc.category.replace(/_/g, ' ').toLowerCase()} · added ${day(doc.createdAt)}`}</Text>
              </View>
            ))
          )}
        </Card>
      ) : null}

      {vm.shares ? (
        <Card>
          <Text style={styles.cardTitle}>Shared with</Text>
          {vm.activeShares.length === 0 ? (
            <Text style={styles.meta}>No one else can see your records.</Text>
          ) : (
            vm.activeShares.map((share) => (
              <View key={share.id} style={styles.row}>
                <Text style={styles.item}>{share.clinician}</Text>
                <Text style={styles.meta}>{`${share.document} · until ${day(share.expiresAt)}`}</Text>
                <Button
                  label="Withdraw access"
                  variant="secondary"
                  accessibilityLabel={`Withdraw ${share.clinician}'s access to ${share.document}`}
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
