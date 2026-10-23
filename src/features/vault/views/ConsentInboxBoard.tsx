import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorState, Note, Sheet, Skeleton } from '@/design-system';
import { BoardCard, BoardScreen, BoardSection, Pill, boardText } from '@/design-system/board/BoardKit';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { space } from '@/design-system/theme';
import { apiRequest } from '@/data/services/http';
import type { RecordShare } from '@/data/types/workflowTypes';
import { useApiResource } from '@/hooks/api/useApiResource';
import { shortDate } from '@/features/phoneboards/format';
import { useT } from '@/i18n';

export interface ConsentInboxLinks {
  back?: () => void;
  /** Health records, where a record is shared with a clinician. */
  records: () => void;
}

const DAY_SECONDS = 86400;

/** Whole days left on a grant, from the server's expiry (0 on its last day). */
export function daysLeft(expiresAt: number, nowSeconds: number): number {
  return Math.max(0, Math.floor((expiresAt - nowSeconds) / DAY_SECONDS));
}

/**
 * Consent inbox (canvas page 2: ConsentInbox, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). "Active now" is the student's real clinician
 * shares (GET /records/shares) with what they cover and when they end, and
 * "Revoke now" withdraws one at once (POST /records/shares/{id}/revoke).
 *
 * Not drawn (D6-13): requests awaiting a decision (no access-request API, so
 * "Awaiting you" says nothing can ask yet), lab "until done" grants and family
 * grants (no API). The campus row is a fixed fact: the campus sees enrolment
 * status, never records.
 */
export function ConsentInboxBoard({ links, embedded = false }: { links: ConsentInboxLinks; embedded?: boolean }): React.ReactElement {
  const t = useT();
  const shares = useApiResource<{ items: RecordShare[] }>('/records/shares');
  const [asking, setAsking] = useState<RecordShare | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const active = (shares.data?.items ?? []).filter((share) => share.active);
  const now = Date.now() / 1000;

  const revoke = () => {
    if (!asking) return;
    setRevoking(true);
    setFailed(false);
    setRevoked(false);
    apiRequest(`/records/shares/${encodeURIComponent(asking.id)}/revoke`, { method: 'POST' })
      .then(() => { setAsking(null); setRevoked(true); shares.reload(); }, () => setFailed(true))
      .finally(() => setRevoking(false));
  };

  return (
    <BoardScreen testID="consent-inbox">
      {embedded ? null : <BoardHeader title={t('sf.consent.header')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />}
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={boardText.title}>{t('sf.consent.title')}</Text>
        <Text style={boardText.body}>{t('sf.consent.intro')}</Text>
      </View>

      <BoardSection label={t('sf.consent.awaiting')}>
        <BoardCard testID="consent-awaiting-empty"><Text style={boardText.body}>{t('access.noRequests')}</Text></BoardCard>
      </BoardSection>

      <BoardSection label={t('sf.consent.active')}>
        {shares.loading && !shares.data ? <Skeleton label={t('sf.consent.loading')} lines={['80%', '60%']} /> : null}
        {shares.error && !shares.data ? <ErrorState title={t('sf.consent.failedTitle')} body={t('sf.consent.failedBody')} retryLabel={t('common.tryAgain')} onRetry={shares.reload} /> : null}
        {failed && !asking ? <Note tone="danger">{t('sf.consent.revokeFailed')}</Note> : null}
        {revoked ? <Note tone="positive">{t('sf.consent.revoked')}</Note> : null}
        {shares.data && !active.length ? (
          <BoardCard testID="consent-none">
            <Text style={boardText.body}>{t('sf.consent.none')}</Text>
            <Button label={t('access.openRecords')} variant="secondary" fullWidth onPress={links.records} />
          </BoardCard>
        ) : null}
        {active.map((share) => {
          const left = daysLeft(share.expiresAt, now);
          return (
            <BoardCard key={share.id} testID={`consent-share-${share.id}`}>
              <View style={styles.head}>
                <Text style={[boardText.strong, styles.flex]}>{share.clinician}</Text>
                <Pill label={t('sf.consent.activePill')} tone="positive" />
              </View>
              <Text style={boardText.body}>{t('sf.consent.what', { document: share.document })}</Text>
              <Text style={boardText.meta}>{t('sf.consent.expires', { date: shortDate(share.expiresAt), days: left })}</Text>
              <Button label={t('sf.consent.revoke')} variant="secondary" fullWidth onPress={() => { setFailed(false); setAsking(share); }}
                accessibilityLabel={t('sf.consent.revokeLabel', { name: share.clinician, document: share.document })} testID={`consent-revoke-${share.id}`} />
            </BoardCard>
          );
        })}
        <BoardCard testID="consent-campus">
          <View style={styles.head}>
            <Text style={[boardText.strong, styles.flex]}>{t('sf.consent.campus')}</Text>
            <Pill label={t('sf.consent.required')} tone="neutral" />
          </View>
          <Text style={boardText.body}>{t('sf.consent.campusWhat')}</Text>
          <Text style={boardText.meta}>{t('sf.consent.campusMeta')}</Text>
        </BoardCard>
      </BoardSection>

      <Text style={boardText.meta}>{t('sf.consent.footnote')}</Text>

      <Sheet visible={asking !== null} title={t('sf.consent.confirmTitle', { name: asking?.clinician ?? '' })} onClose={() => setAsking(null)} busy={revoking} testID="consent-sheet">
        <View style={styles.sheet}>
          <Text style={boardText.body}>{t('sf.consent.confirmBody', { document: asking?.document ?? '' })}</Text>
          {failed ? <Note tone="danger">{t('sf.consent.revokeFailed')}</Note> : null}
          <Button label={t('sf.consent.revoke')} size="cta" fullWidth busy={revoking} onPress={revoke} testID="consent-revoke-confirm" />
          <Button label={t('sf.consent.keep')} variant="secondary" fullWidth onPress={() => setAsking(null)} />
        </View>
      </Sheet>
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  intro: { gap: space.s8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  sheet: { gap: space.s12 },
});
