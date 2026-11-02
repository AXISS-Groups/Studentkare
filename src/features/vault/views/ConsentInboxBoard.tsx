import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorState, Note, Sheet, Skeleton } from '@/design-system';
import { BoardArt, BoardScreen, Pill } from '@/design-system/board/BoardKit';
import { M2Card, M2Grid, M2Header, M2Heading, M2PageHero, M2SectionHead, M2Tile3d, M2WideColumn, m2Text, useM2Layout } from '@/design-system/m2';
import { color, font, fontWeight, space } from '@/design-system/theme';
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
 * Chintakayala, 2026-10-21; Tier 1 look T1ConsentInbox / T1ConsentInboxDesktop
 * / T1ConsentInboxConfirm, approved 2026-10-24, plan tier1-parity-2026-10-24
 * §15). "Active now" is the student's real clinician shares (GET
 * /records/shares) with what they cover and when they end, and "Revoke now"
 * withdraws one at once (POST /records/shares/{id}/revoke) behind the same
 * confirm, which names the clinician and the document.
 *
 * Not drawn (D6-13): requests awaiting a decision (no access-request API, so
 * "Awaiting you" says nothing can ask yet), lab "until done" grants and family
 * grants (no API). The campus row is a fixed fact: the campus sees enrolment
 * status, never records. The hero art is the canvas picture `image-420a70.png`.
 */
export function ConsentInboxBoard({ links, embedded = false, wide = false }: { links: ConsentInboxLinks; embedded?: boolean; wide?: boolean }): React.ReactElement {
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

  const awaiting = (
    <View style={styles.section}>
      <M2SectionHead title={t('sf.consent.awaiting')} />
      <M2Card style={styles.card} testID="consent-awaiting-empty">
        <View style={styles.row}>
          <M2Tile3d icon="rows-split" hue="indigo" />
          <Text style={[m2Text.body, styles.grow]}>{t('access.noRequests')}</Text>
        </View>
      </M2Card>
      <M2Card style={styles.card}>
        <View style={styles.row}>
          <M2Tile3d icon="clock" hue="indigo" />
          <Text style={[m2Text.body, styles.grow]}>{t('sf.consent.footnote')}</Text>
        </View>
      </M2Card>
    </View>
  );

  const activeNow = (
    <View style={styles.section}>
      <M2SectionHead title={t('sf.consent.active')} />
      {shares.loading && !shares.data ? <Skeleton label={t('sf.consent.loading')} lines={['80%', '60%']} /> : null}
      {shares.error && !shares.data ? <ErrorState title={t('sf.consent.failedTitle')} body={t('sf.consent.failedBody')} retryLabel={t('common.tryAgain')} onRetry={shares.reload} /> : null}
      {failed && !asking ? <Note tone="danger">{t('sf.consent.revokeFailed')}</Note> : null}
      {revoked ? <Note tone="positive">{t('sf.consent.revoked')}</Note> : null}
      {shares.data && !active.length ? (
        <M2Card style={styles.card} testID="consent-none">
          <Text style={m2Text.body}>{t('sf.consent.none')}</Text>
          <Button label={t('access.openRecords')} variant="secondary" fullWidth onPress={links.records} />
        </M2Card>
      ) : null}
      {active.map((share) => {
        const left = daysLeft(share.expiresAt, now);
        return (
          <M2Card key={share.id} style={styles.card} testID={`consent-share-${share.id}`}>
            <View style={styles.row}>
              <M2Tile3d icon="stetho" hue="indigo" />
              <View style={styles.grow}>
                <M2Heading style={m2Text.cardTitle}>{share.clinician}</M2Heading>
                <Text style={m2Text.body}>{t('sf.consent.what', { document: share.document })}</Text>
                <Text style={styles.until}>{t('sf.consent.expires', { date: shortDate(share.expiresAt), days: left })}</Text>
              </View>
              <Pill label={t('sf.consent.activePill')} tone="positive" />
            </View>
            <View style={styles.actions}>
              <Button label={t('sf.consent.revoke')} variant="dangerOutline" onPress={() => { setFailed(false); setAsking(share); }}
                accessibilityLabel={t('sf.consent.revokeLabel', { name: share.clinician, document: share.document })} testID={`consent-revoke-${share.id}`} />
            </View>
          </M2Card>
        );
      })}
      <M2Card style={styles.card} testID="consent-campus">
        <View style={styles.row}>
          <M2Tile3d icon="graduation-cap" hue="amber" />
          <View style={styles.grow}>
            <M2Heading style={m2Text.cardTitle}>{t('sf.consent.campus')}</M2Heading>
            <Text style={m2Text.body}>{t('sf.consent.campusWhat')}</Text>
            <Text style={m2Text.meta}>{t('sf.consent.campusMeta')}</Text>
          </View>
          <Pill label={t('sf.consent.required')} tone="neutral" />
        </View>
      </M2Card>
    </View>
  );

  const content = (
    <>
      {embedded ? null : <M2Header backLabel={t('common.back')} onBack={links.back} title={t('sf.consent.header')} testID="consent-header" />}
      <M2PageHero hue="indigo" icon="eye" eyebrow={t('sf.consent.header')} title={t('sf.consent.title')} body={t('sf.consent.intro')} testID="consent-hero"
        art={<BoardArt name="image-420a70.png" width={200} height={130} />} artOnPhone={false} />
      <Wide activeNow={activeNow} awaiting={awaiting} />
      <Sheet visible={asking !== null} title={t('sf.consent.confirmTitle', { name: asking?.clinician ?? '' })} onClose={() => setAsking(null)} busy={revoking} testID="consent-sheet">
        <View style={styles.sheet}>
          <View style={styles.sheetArt}><M2Tile3d icon="eye-off" hue="danger" size={52} /></View>
          <Text style={m2Text.body}>{t('sf.consent.confirmBody', { document: asking?.document ?? '' })}</Text>
          {failed ? <Note tone="danger">{t('sf.consent.revokeFailed')}</Note> : null}
          <Button label={t('sf.consent.keep')} variant="secondary" size="cta" fullWidth onPress={() => setAsking(null)} />
          <Button label={t('sf.consent.revoke')} variant="danger" size="cta" fullWidth busy={revoking} onPress={revoke} testID="consent-revoke-confirm" />
        </View>
      </Sheet>
    </>
  );
  if (wide) return <M2WideColumn testID="consent-inbox">{content}</M2WideColumn>;
  return <BoardScreen testID="consent-inbox">{content}</BoardScreen>;
}

/** Phone: awaiting first, then active (the board's order). Desktop: active left, awaiting right. */
function Wide({ activeNow, awaiting }: { activeNow: React.ReactNode; awaiting: React.ReactNode }) {
  const desktop = useM2Layout() === 'desktop';
  if (!desktop) return <>{awaiting}{activeNow}</>;
  return <M2Grid columns={{ desktop: 2 }}>{activeNow}{awaiting}</M2Grid>;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  section: { gap: space.s12 },
  card: { padding: space.s16, gap: space.s12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  until: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.attention },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  sheet: { gap: space.s12 },
  sheetArt: { alignItems: 'flex-start' },
});
