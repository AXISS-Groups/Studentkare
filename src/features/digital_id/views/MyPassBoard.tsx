import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorState, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, boardText } from '@/design-system/board/BoardKit';
import { CountdownRing } from '@/design-system/data/CountdownRing';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { initialsOf } from '@/features/account/views/StudentProfileBoard';
import { stepsLeft, useLivePass } from '../viewmodel/livePass';
import { QrCells } from './DigitalIdNativeView';

export interface MyPassLinks {
  back?: () => void;
  /** Digital ID, where the pass is created or replaced. */
  digitalId: () => void;
}

/** The server's step length when it does not say (livePass: one signed code per 30 s step). */
const DEFAULT_STEP_SECONDS = 30;

/** "155433" becomes "155 433", read out in two halves at the counter. */
export function spokenCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** Whole minutes of codes still held in memory (never stored), for the "works without signal" chip. */
export function offlineMinutes(identity: MemberIdentity | null, nowMs: number): number {
  const step = identity?.rotateSeconds ?? DEFAULT_STEP_SECONDS;
  return Math.floor((stepsLeft(identity, nowMs) * step) / 60);
}

function Chip({ label }: { label: string }) {
  return <View style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>;
}

/**
 * My check-in pass (canvas page 2: MyPass, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). The QR and the six-digit code are the server's
 * signed 30-second codes (GET /identity, livePass.ts); the next ten minutes are
 * held in memory only, never written to storage.
 *
 * Not drawn, on purpose: "Identity verified · 4 of 4" (the line shows the
 * server's campus verification state instead), the face-photo promise, and
 * the recent check-ins with "This wasn't me" — there is no check-in record
 * or report API, so history is an honest empty state (D6-8).
 */
export function MyPassBoard({ identity: first, links, onRefresh }: { identity: MemberIdentity; links: MyPassLinks; onRefresh: () => Promise<MemberIdentity> }): React.ReactElement {
  const t = useT();
  const [identity, setIdentity] = useState(first);
  useEffect(() => setIdentity(first), [first]);
  // Next step's code, fetched in place. If it fails the old code is hidden once it expires.
  const refresh = useCallback(() => { onRefresh().then(setIdentity).catch(() => undefined); }, [onRefresh]);
  const { entry, secondsLeft } = useLivePass(identity, refresh);
  const step = identity.rotateSeconds ?? DEFAULT_STEP_SECONDS;
  const minutes = offlineMinutes(identity, Date.now());
  const verified = identity.campusStatus === 'VERIFIED';

  return (
    <BoardScreen testID="my-pass">
      <BoardHeader title={t('pass.title')} backIcon="chevron-left" backLabel={t('common.back')} onBack={links.back} />
      <View style={styles.tip}>
        <Icon name="sun" size={space.s16} color={color.positive} />
        <Text style={[boardText.meta, { color: color.positive }]}>{t('sf.pass.brightness')}</Text>
      </View>

      <View style={styles.card} accessibilityLabel={t('pass.card')}>
        <View style={styles.who}>
          <View style={[styles.avatar, verified ? styles.avatarVerified : null]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.avatarText}>{initialsOf(identity.fullName)}</Text>
          </View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.name}>{identity.fullName}</Text>
            <Text style={boardText.meta}>
              {identity.university || t('id.campusNotProvided')}{identity.rollNumber ? ` · ${t('id.roll', { roll: identity.rollNumber })}` : ''}
            </Text>
            <View style={styles.status} testID="pass-verification">
              {verified ? <Icon name="check" size={space.s14} color={color.positive} strokeWidth={3} /> : null}
              <Text style={[styles.statusText, { color: verified ? color.positive : color.text2 }]}>{t(`verify.campus.${identity.campusStatus}.title` as MessageKey)}</Text>
            </View>
          </View>
        </View>

        {entry && entry.qrMatrix ? (
          <>
            <View style={styles.qrBox} testID="pass-qr">
              <QrCells rows={entry.qrMatrix} label={t('id.qrLabel')} />
            </View>
            <View style={styles.codeRow}>
              <View style={styles.refresh}>
                <CountdownRing secondsLeft={secondsLeft ?? 0} totalSeconds={step} />
                <View>
                  <Text style={boardText.eyebrow}>{t('sf.pass.refreshesIn')}</Text>
                  <Text style={styles.seconds} accessibilityLiveRegion="none">{t('sf.pass.seconds', { n: secondsLeft ?? 0 })}</Text>
                </View>
              </View>
              {entry.passCode ? (
                <View style={styles.codeBox}>
                  <Text style={boardText.eyebrow}>{t('sf.pass.sayCode')}</Text>
                  <Text testID="pass-code" style={styles.code} accessibilityLabel={entry.passCode.split('').join(' ')}>{spokenCode(entry.passCode)}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.chips}>
              {minutes > 0 ? <Chip label={t('sf.pass.offlineFor', { n: minutes })} /> : null}
              <Chip label={t('sf.pass.noScreenshots')} />
              <Chip label={t('sf.pass.neverShare')} />
            </View>
          </>
        ) : identity.issued ? (
          <View style={styles.stale} role="status" testID="pass-stale">
            <Icon name="alert-triangle" size={space.s20} color={color.attention} />
            <Text style={[boardText.body, styles.flex, { color: color.attention }]}>{t('member.pass.stale')}</Text>
          </View>
        ) : (
          <View style={styles.noPass} testID="pass-none">
            <Text style={boardText.body}>{t('pass.noQr')}</Text>
            <Button label={t('pass.createId')} onPress={links.digitalId} fullWidth />
          </View>
        )}
      </View>

      <Text style={boardText.body}>{t('pass.note')}</Text>

      <BoardSection label={t('pass.recent')}>
        <View style={styles.empty} testID="pass-history-empty"><Text style={boardText.body}>{t('pass.noCheckins')}</Text></View>
      </BoardSection>
    </BoardScreen>
  );
}

/** Route /pass at phone width. */
export function MyPassRoute({ links }: { links: MyPassLinks }): React.ReactElement {
  const t = useT();
  const resource = useApiResource<MemberIdentity>('/identity');
  const refresh = useCallback(() => apiRequest<MemberIdentity>('/identity'), []);
  if (resource.data) return <MyPassBoard identity={resource.data} links={links} onRefresh={refresh} />;
  return (
    <BoardScreen testID="my-pass">
      <BoardHeader title={t('pass.title')} backIcon="chevron-left" backLabel={t('common.back')} onBack={links.back} />
      {resource.error
        ? <ErrorState title={t('sf.pass.failedTitle')} body={t('sf.pass.failedBody')} retryLabel={t('common.tryAgain')} onRetry={resource.reload} />
        : <Skeleton label={t('sf.pass.loading')} lines={['60%', '100%', '80%']} />}
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, alignSelf: 'flex-end', backgroundColor: color.positiveBg, borderRadius: radius.full, paddingHorizontal: space.s12, paddingVertical: space.s6 },
  card: { backgroundColor: color.surface2, borderRadius: radius.sheet, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16, gap: space.s16 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  avatar: { width: space.s40 + space.s16, height: space.s40 + space.s16, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color.surface },
  avatarVerified: { borderColor: color.positive },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  name: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  statusText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  qrBox: { alignSelf: 'center', backgroundColor: color.qrBackground, borderRadius: radius.xl, padding: space.s16 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12, flexWrap: 'wrap' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  seconds: { fontFamily: font.family.mono, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  codeBox: { alignItems: 'flex-end' },
  code: { fontFamily: font.family.mono, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 3, color: color.clinicalValue },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s8 },
  chip: { borderRadius: radius.full, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface, paddingHorizontal: space.s12, paddingVertical: space.s6 },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  stale: { flexDirection: 'row', alignItems: 'center', gap: space.s10, backgroundColor: color.attentionBg, borderRadius: radius.md, padding: space.s14 },
  noPass: { gap: space.s12 },
  empty: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16 },
});
