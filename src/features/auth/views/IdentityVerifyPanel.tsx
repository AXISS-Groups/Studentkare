import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Eyebrow, Note, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { IdentityVerifyViewModel } from '../viewmodel/IdentityVerifyViewModel';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { CampusCheck } from '../viewmodel/IdentityVerifyViewModel';

export interface IdentityVerifyLinks {
  /** Where the student submits campus verification. Omitted where that screen does not exist yet. */
  openCampusVerification?: () => void;
  back: () => void;
}

const campusTone: Record<CampusCheck, 'positive' | 'attention' | 'danger' | 'info'> = {
  VERIFIED: 'positive', PENDING: 'attention', NOT_SUBMITTED: 'info', REJECTED: 'danger',
};

/** Checks that appear in the design but have no server-side verification yet. Shown, never faked. */
const NOT_AVAILABLE: MessageKey[] = ['verify.photo', 'verify.email', 'verify.govId'];

/** One source for web and native. Nothing here can turn a check green — only the server can. */
export const IdentityVerifyPanel = observer(function IdentityVerifyPanel({ viewModel: vm, links }: { viewModel: IdentityVerifyViewModel; links: IdentityVerifyLinks }) {
  const t = useT();
  const status = vm.campusStatus;
  const campus = status ? {
    tone: campusTone[status],
    title: t(`verify.campus.${status}.title` as MessageKey),
    body: t(`verify.campus.${status}.body` as MessageKey),
  } : null;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('verify.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('verify.title')}</Text>
      <Text style={styles.body}>{t('verify.intro')}</Text>

      {vm.loading ? <Skeleton label={t('verify.loading')} lines={['80%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('verify.loadFailedTitle')} body={t('verify.loadFailedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {campus ? (
        <Card>
          <Note tone={campus.tone} title={campus.title}>{campus.body}</Note>
          {!vm.campusVerified && links.openCampusVerification ? (
            <Button label={vm.campusStatus === 'PENDING' ? t('verify.viewCampus') : t('verify.verifyCampus')} fullWidth onPress={links.openCampusVerification} />
          ) : null}
          {!vm.campusVerified && !links.openCampusVerification ? (
            <Text style={styles.meta}>{t('verify.campusOnWeb')}</Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>{t('verify.notAvailable')}</Text>
        {NOT_AVAILABLE.map((key) => (
          <View key={key} style={styles.row}>
            <Text style={styles.item}>{t(key)}</Text>
            <Text style={styles.meta}>{t('verify.notConnected')}</Text>
          </View>
        ))}
        <Text style={styles.meta}>{t('verify.notConnectedNote')}</Text>
      </Card>

      <Button label={t('common.back')} variant="secondary" fullWidth onPress={links.back} />
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
