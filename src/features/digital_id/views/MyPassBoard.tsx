import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorState, Skeleton, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import {
  Gradient, GlossTile, M2Card, M2Header, M2Heading, M2ListRow, M2Note, M2SectionHead, M2Timeline, M2TimerRing, M2WideColumn, M2_NAV_CLEARANCE, NAVY_STOPS, m2Text,
  useM2Layout, useOwnPhoneChrome, webAttrs,
} from '@/design-system/m2';
import type { M2TimelineItem } from '@/design-system/m2';
import { color, font, fontWeight, radius, shadow, shadowStyle, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { ArtSource } from '@/features/phoneKit/artSource';
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
/** QR cell size: the phone's 6 px modules, a little larger on a desktop, within a scanner-friendly size. */
const QR_CELL_PHONE = 6;
const QR_CELL_WIDE = 7;

/** "155433" becomes "155 433", read out in two halves at the counter. */
export function spokenCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** Whole minutes of codes still held in memory (never stored), for the "works without signal" chip. */
export function offlineMinutes(identity: MemberIdentity | null, nowMs: number): number {
  const step = identity?.rotateSeconds ?? DEFAULT_STEP_SECONDS;
  return Math.floor((stepsLeft(identity, nowMs) * step) / 60);
}

function Chip({ icon, label }: { icon: 'wifi-off' | 'phone-off' | 'phone'; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={14} color={color.action} strokeWidth={2.2} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

/** What happens when staff scan the pass: only what /identity/verify really does. */
const STEPS: ReadonlyArray<{ key: string; icon: 'qr-code' | 'eye' | 'shield'; hue: 'indigo' | 'green' | 'sky'; title: MessageKey; body: MessageKey }> = [
  { key: 'scan', icon: 'qr-code', hue: 'indigo', title: 'swt.pass.step.scan', body: 'swt.pass.step.scanBody' },
  { key: 'see', icon: 'eye', hue: 'green', title: 'swt.pass.step.see', body: 'swt.pass.step.seeBody' },
  { key: 'not', icon: 'shield', hue: 'sky', title: 'swt.pass.step.not', body: 'swt.pass.step.notBody' },
];

/**
 * My check-in pass (canvas page 2: MyPass, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21; one view at both widths per the Tier 1 parity
 * plan 2026-10-24 §22, design boards T1Pass / T1PassDesktop / T1PassStale
 * approved 24 Oct 2026). The QR and the six-digit code are the server's signed
 * 30-second codes (GET /identity, livePass.ts); the next ten minutes are held
 * in memory only, never written to storage. A stale code is hidden, never left
 * up to fail at the counter; a refresh that fails is said, not swallowed.
 *
 * Not drawn, on purpose: "Identity verified · 4 of 4" (the line shows the
 * server's campus verification state instead), the face-photo promise, and
 * the recent check-ins with "This wasn't me" — there is no check-in record
 * or report API, so history is an honest empty state (D6-8).
 */
export function MyPassBoard({ identity: first, links, onRefresh, wide = false, art }: {
  identity: MemberIdentity; links: MyPassLinks; onRefresh: () => Promise<MemberIdentity>;
  /** Laid out wide in the desktop web shell: the pass on the left, how check-in works on the right. */
  wide?: boolean;
  /** The clinic art beside "how it works" (canvas `a-small-clinic-building…png`), decorative. */
  art?: ArtSource;
}): React.ReactElement {
  const t = useT();
  const online = useOnline();
  useOwnPhoneChrome();
  const layout = useM2Layout();
  const desktop = layout === 'desktop';
  const [identity, setIdentity] = useState(first);
  const [refreshFailed, setRefreshFailed] = useState(false);
  useEffect(() => { setIdentity(first); setRefreshFailed(false); }, [first]);
  // Next step's code, fetched in place. If it fails the board says so; the old code is hidden once it expires.
  const refresh = useCallback(() => {
    onRefresh().then((next) => { setIdentity(next); setRefreshFailed(false); }).catch(() => setRefreshFailed(true));
  }, [onRefresh]);
  const { entry, secondsLeft } = useLivePass(identity, refresh);
  const step = identity.rotateSeconds ?? DEFAULT_STEP_SECONDS;
  const minutes = offlineMinutes(identity, Date.now());
  const campus = identity.campusStatus;
  const verified = campus === 'VERIFIED';
  const gutter = layout === 'phone' ? styles.gutter : null;
  const live = Boolean(entry && entry.qrMatrix);

  const header = (
    <M2Header backLabel={t('common.back')} backIcon="chevron-left" onBack={links.back} title={t('pass.title')} testID="my-pass-header" />
  );

  const passCard = (
    <View style={styles.card} {...webAttrs({ role: 'region', 'aria-label': t('pass.card') })} testID="pass-card">
      <Gradient colors={NAVY_STOPS} style={[styles.cardTop, live ? styles.cardTopLive : null]}>
        <View pointerEvents="none" style={styles.cardRing} />
        <Text style={styles.cardEyebrow}>{t('pass.card')}</Text>
        <M2Heading style={styles.name}>{identity.fullName}</M2Heading>
        <Text style={styles.cardMeta}>
          {identity.university || t('id.campusNotProvided')}{identity.rollNumber ? ` · ${t('id.roll', { roll: identity.rollNumber })}` : ''}
        </Text>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={styles.avatarText}>{initialsOf(identity.fullName)}</Text></View>
      </Gradient>
      <View style={styles.cardBody}>
        {live && entry?.qrMatrix ? (
          <>
            <View style={[styles.qrBox, live ? styles.qrLift : null]} testID="pass-qr">
              <QrCells rows={entry.qrMatrix} label={t('id.qrLabel')} cell={desktop ? QR_CELL_WIDE : QR_CELL_PHONE} />
            </View>
            <View style={styles.codeRow}>
              <M2TimerRing secondsLeft={secondsLeft ?? 0} totalSeconds={step} label={t('swt.pass.seconds', { n: secondsLeft ?? 0 })} testID="pass-ring" />
              <View style={styles.codeWords}>
                <Text style={m2Text.meta}>{t('sf.pass.refreshesIn')}</Text>
                <Text style={styles.seconds} accessibilityLiveRegion="none" testID="pass-seconds">{t('sf.pass.seconds', { n: secondsLeft ?? 0 })}</Text>
                {entry.passCode ? (
                  <>
                    <Text style={m2Text.meta}>{t('sf.pass.sayCode')}</Text>
                    <Text testID="pass-code" style={styles.code} accessibilityLabel={entry.passCode.split('').join(' ')} aria-label={entry.passCode.split('').join(' ')}>{spokenCode(entry.passCode)}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <View style={styles.chips}>
              {minutes > 0 ? <Chip icon="wifi-off" label={t('sf.pass.offlineFor', { n: minutes })} /> : null}
              <Chip icon="phone-off" label={t('sf.pass.noScreenshots')} />
              <Chip icon="phone" label={t('sf.pass.neverShare')} />
            </View>
            {refreshFailed || !online ? (
              <M2Note tone="attention" icon="alert-triangle" announce testID="pass-refresh-failed">{t('sf.pass.refreshFailed', { n: minutes })}</M2Note>
            ) : null}
          </>
        ) : identity.issued ? (
          <>
            <View style={styles.stalePlaceholder} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="pass-stale-art">
              <GlossTile icon="qr-code" hue="indigo" size={64} iconSize={30} />
            </View>
            <M2Note tone="attention" icon="alert-triangle" announce testID="pass-stale">{t('member.pass.stale')}</M2Note>
            <Button label={t('common.retryConnection')} icon={<Icon name="refresh" size={16} color={color.onAction} strokeWidth={2.4} />} onPress={refresh} fullWidth testID="pass-retry" />
          </>
        ) : (
          <View style={styles.noPass} testID="pass-none">
            <Text style={m2Text.body}>{t('pass.noQr')}</Text>
            <Button label={t('pass.createId')} onPress={links.digitalId} fullWidth />
          </View>
        )}
      </View>
    </View>
  );

  const campusRow = (
    <M2ListRow icon={verified ? 'check' : 'shield'} hue={verified ? 'green' : 'amber'} tile="gloss" title={t(`verify.campus.${campus}.title` as MessageKey)} meta={t(`verify.campus.${campus}.body` as MessageKey)} testID="pass-verification" />
  );
  const recent = (
    <View>
      <M2SectionHead title={t('pass.recent')} />
      <M2Card style={styles.recent} testID="pass-history-empty"><Text style={m2Text.body}>{t('pass.noCheckins')}</Text></M2Card>
    </View>
  );
  const steps: M2TimelineItem[] = STEPS.map((s) => ({ key: s.key, icon: s.icon, hue: s.hue, title: t(s.title), body: t(s.body) }));

  let body: React.ReactNode;
  if (desktop) {
    body = (
      <>
        <Text style={[m2Text.body, styles.sub]}>{t('swt.pass.sub')}</Text>
        <View style={styles.columns}>
          <View style={styles.passCol}>
            {passCard}
            <Text style={[m2Text.meta, styles.centre]}>{t('swt.pass.memberId', { id: identity.memberId })}</Text>
            {campusRow}
          </View>
          <View style={styles.sideCol}>
            <M2Card style={styles.how} testID="pass-how">
              {art ? <View style={styles.artBox}><Image source={art} resizeMode="contain" accessibilityIgnoresInvertColors {...webAttrs({ 'aria-hidden': 'true' })} style={styles.art} /></View> : null}
              <M2Timeline items={steps} testID="pass-steps" />
            </M2Card>
            <M2Note tone="attention" icon="devices">{t('swt.pass.laptop')}</M2Note>
            <M2ListRow icon="id-card" hue="indigo" tile="gloss" title={t('pb.id.title')} meta={t('pass.note')} onPress={links.digitalId} testID="pass-digital-id" />
            {recent}
          </View>
        </View>
      </>
    );
  } else {
    body = (
      <View style={[styles.stack, gutter]}>
        <M2Note tone="attention" icon="sun">{t('sf.pass.brightness')}</M2Note>
        {passCard}
        {campusRow}
        <Text style={m2Text.body}>{t('pass.note')}</Text>
        {recent}
      </View>
    );
  }

  if (wide) {
    return (
      <M2WideColumn testID="my-pass">
        {header}
        {body}
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="my-pass">
      {header}
      {body}
    </ScrollView>
  );
}

/** Route /pass: the phone frame at phone width, the student web shell above it (`wide`). */
export function MyPassRoute({ links, wide = false, art }: { links: MyPassLinks; wide?: boolean; art?: ArtSource }): React.ReactElement {
  const t = useT();
  const resource = useApiResource<MemberIdentity>('/identity');
  const refresh = useCallback(() => apiRequest<MemberIdentity>('/identity'), []);
  if (resource.data) return <MyPassBoard identity={resource.data} links={links} onRefresh={refresh} wide={wide} art={art} />;
  const state = resource.error
    ? <ErrorState title={t('sf.pass.failedTitle')} body={t('sf.pass.failedBody')} retryLabel={t('common.tryAgain')} onRetry={resource.reload} />
    : <Skeleton label={t('sf.pass.loading')} lines={['60%', '100%', '80%']} />;
  const header = <M2Header backLabel={t('common.back')} backIcon="chevron-left" onBack={links.back} title={t('pass.title')} testID="my-pass-header" />;
  if (wide) return <M2WideColumn testID="my-pass">{header}{state}</M2WideColumn>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="my-pass">
      {header}
      <View style={styles.gutter}>{state}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  gutter: { paddingHorizontal: space.gutterPhone },
  stack: { gap: space.s14 },
  sub: { maxWidth: 760 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s24 },
  passCol: { width: 460, gap: space.s12 },
  sideCol: { flex: 1, minWidth: 0, gap: space.s16 },
  centre: { textAlign: 'center' },
  card: { borderRadius: 24, backgroundColor: color.surface, overflow: 'hidden', ...shadowStyle(shadow.card) },
  cardTop: { padding: space.s20, paddingBottom: space.s20, alignItems: 'center', gap: space.s2, overflow: 'hidden' },
  cardTopLive: { paddingBottom: space.s40 + space.s8 },
  cardRing: { position: 'absolute', right: -40, top: -60, width: 170, height: 170, borderRadius: radius.full, borderWidth: 24, borderColor: color.onHeroRule },
  cardEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHeroLabel },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, textAlign: 'center' },
  cardMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2, textAlign: 'center' },
  avatar: { position: 'absolute', left: space.s16, top: space.s16, width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.onHeroVeil, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  cardBody: { padding: space.s16, gap: space.s14, alignItems: 'stretch' },
  qrBox: { alignSelf: 'center', backgroundColor: color.qrBackground, borderRadius: radius.xl, padding: space.s12, ...shadowStyle(shadow.float) },
  qrLift: { marginTop: -(space.s40 + space.s16) },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s16 },
  codeWords: { gap: space.s2 },
  seconds: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  code: { fontFamily: font.family.mono, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 3, color: color.clinicalValue },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, borderRadius: radius.full, borderWidth: 1, borderColor: color.ruleSoft, backgroundColor: color.surface2, paddingHorizontal: space.s10, paddingVertical: space.s6 },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  stalePlaceholder: { alignSelf: 'center', width: 230, height: 230, borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.ruleStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface2 },
  noPass: { gap: space.s12 },
  recent: { padding: space.s16 },
  how: { padding: space.s20, gap: space.s16 },
  artBox: { height: 150, alignItems: 'center', justifyContent: 'center' },
  art: { width: 200, height: 150 },
});
