import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Eyebrow, Note, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { IdentityVerifyViewModel } from '../viewmodel/IdentityVerifyViewModel';
import type { CampusCheck } from '../viewmodel/IdentityVerifyViewModel';

export interface IdentityVerifyLinks {
  /** Where the student submits campus verification. Omitted where that screen does not exist yet. */
  openCampusVerification?: () => void;
  back: () => void;
}

const campusCopy: Record<CampusCheck, { tone: 'positive' | 'attention' | 'danger' | 'info'; title: string; body: string }> = {
  VERIFIED: { tone: 'positive', title: 'Campus verified', body: 'Your campus confirmed you are a student there.' },
  PENDING: { tone: 'attention', title: 'Campus review pending', body: 'Your campus has your details and has not decided yet.' },
  NOT_SUBMITTED: { tone: 'info', title: 'Campus not verified', body: 'Send your university and roll number to your campus for review.' },
  REJECTED: { tone: 'danger', title: 'Campus verification rejected', body: 'Check your university and roll number, then send them again.' },
};

/** Checks that appear in the design but have no server-side verification yet. Shown, never faked. */
const NOT_AVAILABLE = ['Photo liveness', 'Campus email', 'Government ID'];

/** One source for web and native. Nothing here can turn a check green — only the server can. */
export const IdentityVerifyPanel = observer(function IdentityVerifyPanel({ viewModel: vm, links }: { viewModel: IdentityVerifyViewModel; links: IdentityVerifyLinks }) {
  const campus = vm.campusStatus ? campusCopy[vm.campusStatus] : null;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Your identity</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Verify it’s you</Text>
      <Text style={styles.body}>Consultations, dispensing and health camps need your identity confirmed. Only checks we can actually confirm are shown as done.</Text>

      {vm.loading ? <Skeleton label="Loading your verification status" lines={['80%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title="Couldn't load your status" body="Nothing is marked as verified until we can check. Try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}

      {campus ? (
        <Card>
          <Note tone={campus.tone} title={campus.title}>{campus.body}</Note>
          {!vm.campusVerified && links.openCampusVerification ? (
            <Button label={vm.campusStatus === 'PENDING' ? 'View campus details' : 'Verify my campus'} fullWidth onPress={links.openCampusVerification} />
          ) : null}
          {!vm.campusVerified && !links.openCampusVerification ? (
            <Text style={styles.meta}>Campus verification is done from your profile on the Studentkare website.</Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>Not available yet</Text>
        {NOT_AVAILABLE.map((name) => (
          <View key={name} style={styles.row}>
            <Text style={styles.item}>{name}</Text>
            <Text style={styles.meta}>Not connected</Text>
          </View>
        ))}
        <Text style={styles.meta}>We will add these when we can confirm them on our servers. Until then they stay unverified.</Text>
      </Card>

      <Button label="Back" variant="secondary" fullWidth onPress={links.back} />
    </ScrollView>
  );
});

export function IdentityVerifyRoute({ links }: { links: IdentityVerifyLinks }): React.ReactElement {
  const [vm] = useState(() => new IdentityVerifyViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <IdentityVerifyPanel viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  item: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
});
