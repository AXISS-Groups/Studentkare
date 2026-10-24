import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, Skeleton, useOnline } from '@/design-system';
import { BrandLogo, Icon } from '@/design-system/icons';
import {
  Gradient, GlossTile, M2Card, M2Header, M2Heading, M2ListRow, M2Note, M2Pill, M2TimerRing, M2WideColumn, M2_NAV_CLEARANCE, NAVY_STOPS, heroStops, m2Text, useM2Layout,
  useOwnPhoneChrome, webAttrs,
} from '@/design-system/m2';
import { color, font, fontWeight, radius, shadow, shadowStyle, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { initialsOf } from '@/features/account/views/StudentProfileBoard';
import type { ArtSource } from '@/features/phoneKit/artSource';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { DigitalIdViewModel } from '../viewmodel/DigitalIdViewModel';
import type { DigitalIdError } from '../viewmodel/DigitalIdViewModel';

const CELL = 6;
/** The server's step length when it does not say (livePass: one signed code per 30 s step). */
const DEFAULT_STEP_SECONDS = 30;

/**
 * Paints the server-issued QR from its cell rows. Each row is drawn as runs of
 * dark cells, so a 37×37 code is a few hundred views, not 1,369. Black modules
 * on white in both schemes (`qr-foreground` / `qr-background`): an inverted
 * QR is a scan risk (DESIGN.md §3).
 */
export function QrCells({ rows, label, cell = CELL }: { rows: string[]; label: string; cell?: number }): React.ReactElement {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} {...webAttrs({ role: 'img', 'aria-label': label })} style={styles.qr} testID="qr-cells">
      {rows.map((row, y) => {
        const runs: { start: number; length: number }[] = [];
        for (let x = 0; x < row.length; x += 1) {
          if (row[x] !== '1') continue;
          const last = runs[runs.length - 1];
          if (last && last.start + last.length === x) last.length += 1;
          else runs.push({ start: x, length: 1 });
        }
        return (
          <View key={y} style={[styles.qrRow, { width: row.length * cell, height: cell }]}>
            {runs.map((run) => (
              <View key={run.start} style={[styles.qrDark, { left: run.start * cell, width: run.length * cell, height: cell }]} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

export interface DigitalIdLinks {
  back?: () => void;
  /** The check-in pass page (a row under the card). */
  pass?: () => void;
  abha?: () => void;
  insurance?: () => void;
  /** Desktop only: the Health passport QR screen (unchanged, opened as its own panel). */
  passport?: () => void;
}

interface PolicyLine { id: string; insurer: string; validUntil: string }

const ERROR_KEY: Record<DigitalIdError, MessageKey> = { issue: 'id.issueFailed', revoke: 'id.revokeFailed' };

/**
 * Digital health ID (design page 2: DigitalId; Tier 1 parity plan 2026-10-24
 * §12, design boards T1DigitalId / T1DigitalIdDesktop / T1DigitalIdNotIssued
 * approved 24 Oct 2026): one view on one view-model at both widths and on
 * Expo. Shows only what GET /identity and GET /health/policies return; the
 * card carries no clinical value. The QR, its code and the create / replace /
 * revoke controls are the view-model's (issue / revoke confirm unchanged); a
 * refresh that fails is said, never swallowed, and a stale code is hidden.
 */
export const DigitalIdNativeView = observer(function DigitalIdNativeView({ viewModel: vm, links = {}, wide = false, art }: {
  viewModel: DigitalIdViewModel; links?: DigitalIdLinks;
  /** Laid out wide in the desktop web shell: the card left, the QR and its controls right, the privacy note beside them. */
  wide?: boolean;
  /** Desktop art (canvas `image-5aff5e.png`), decorative. */
  art?: ArtSource;
}) {
  const id = vm.identity;
  const t = useT();
  const online = useOnline();
  useOwnPhoneChrome();
  const layout = useM2Layout();
  const desktop = layout === 'desktop';
  const policies = useApiResource<{ items: PolicyLine[] }>('/health/policies');
  const campusLabel = (status: MemberIdentity['campusStatus']) => t(`verify.campus.${status}.title` as MessageKey);
  const verified = id?.campusStatus === 'VERIFIED';
  const today = new Date().toISOString().slice(0, 10);
  const policy = policies.data?.items.find((p) => p.validUntil >= today) ?? policies.data?.items[0];
  const gutter = layout === 'phone' ? styles.gutter : null;
  const entry = vm.entry;
  const step = id?.rotateSeconds ?? DEFAULT_STEP_SECONDS;
  const canAct = online && !vm.busy;

  const header = <M2Header backLabel={t('common.back')} onBack={links.back} title={t('pb.id.title')} testID="digital-id-header" />;

  const card = id ? (
    <Gradient colors={NAVY_STOPS} style={styles.card} testID="digital-id-card">
      <View pointerEvents="none" style={styles.cardRingBig} />
      <View pointerEvents="none" style={styles.cardRingSmall} />
      <View style={styles.cardTop}>
        <View style={styles.glass}><BrandLogo size={20} label="" /></View>
        <Text style={styles.brand}>{t('phone.brand')}</Text>
        <M2Pill label={id.issued ? t('pb.id.active') : t('pb.id.notIssued')} tone="hero" testID="digital-id-status" />
      </View>
      <View style={styles.who}>
        <Gradient colors={heroStops('orange')} style={styles.avatar}><Text style={styles.initials}>{initialsOf(id.fullName)}</Text></Gradient>
        <View style={styles.flex}>
          <M2Heading style={styles.name}>{id.fullName}</M2Heading>
          <Text style={styles.heroMeta}>{[id.university || t('id.campusNotProvided'), id.rollNumber ? t('id.roll', { roll: id.rollNumber }) : ''].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={styles.fields}>
        <Field label={t('pb.id.eduId')} value={id.memberId} mono />
        <Field label={t('pb.id.campus')} value={id.university || t('id.campusNotProvided')} />
      </View>
      <View style={styles.verifiedChip} testID="digital-id-campus">
        {verified ? <Icon name="check" size={14} color={color.onHeroPositive} strokeWidth={3} /> : null}
        <Text style={[styles.verifiedText, { color: verified ? color.onHero : color.onHeroAttention }]}>{campusLabel(id.campusStatus)}</Text>
      </View>
    </Gradient>
  ) : null;

  const qrCard = id ? (
    <M2Card style={styles.qrCard} testID="digital-id-qr">
      {entry?.qrMatrix ? (
        <>
          <View style={styles.qrBox}><QrCells rows={entry.qrMatrix} label={t('id.qrLabel')} cell={desktop ? CELL + 1 : CELL} /></View>
          <View style={styles.codeRow}>
            <View style={styles.flex}>
              <Text style={m2Text.meta}>{t('member.pass.code')}</Text>
              <Text style={styles.code} accessibilityLabel={entry.passCode.split('').join(' ')} aria-label={entry.passCode.split('').join(' ')} testID="digital-id-code">{entry.passCode}</Text>
            </View>
            <M2TimerRing secondsLeft={vm.secondsLeft ?? 0} totalSeconds={step} label={String(vm.secondsLeft ?? 0)} size={40} />
            <M2Pill label={t('member.pass.changesIn', { n: vm.secondsLeft ?? 0 })} tone="action" />
          </View>
          <Text style={m2Text.body}>{t('id.qrNote')}</Text>
          {vm.refreshFailed || !online ? <M2Note tone="attention" icon="alert-triangle" announce testID="digital-id-refresh-failed">{t('id.refreshFailed')}</M2Note> : null}
        </>
      ) : id.issued ? (
        <>
          <View style={styles.notIssued} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><GlossTile icon="qr-code" hue="indigo" size={72} iconSize={34} /></View>
          <M2Note tone="attention" icon="alert-triangle" announce testID="digital-id-stale">{t('member.pass.stale')}</M2Note>
        </>
      ) : (
        <View style={styles.notIssued} testID="digital-id-not-issued">
          <GlossTile icon="qr-code" hue="indigo" size={72} iconSize={34} />
          <Text style={[m2Text.body, styles.centre]}>{t('id.noQr')}</Text>
        </View>
      )}
      {vm.error ? <M2Note tone="danger" icon="alert-triangle" announce testID="digital-id-error">{t(ERROR_KEY[vm.error])}</M2Note> : null}
      {!online ? <Text style={m2Text.meta} testID="digital-id-offline">{t('m2v.up.needsConnection')}</Text> : null}
      {id.issued ? (
        vm.confirmingRevoke ? (
          <>
            <M2Note tone="attention" icon="alert-triangle" title={t('id.revokeTitle')} testID="digital-id-revoke-confirm">{t('id.revokeBody')}</M2Note>
            <View style={styles.actions}>
              <Button label={t('id.revokeYes')} variant="danger" busy={vm.busy} disabled={!online} onPress={() => void vm.revoke()} testID="digital-id-revoke-yes" />
              <Button label={t('id.keep')} variant="secondary" onPress={vm.cancelRevoke} testID="digital-id-revoke-keep" />
            </View>
          </>
        ) : (
          <View style={styles.actions}>
            <Button label={t('id.replace')} variant="secondary" busy={vm.busy} disabled={!canAct} icon={<Icon name="refresh" size={16} color={color.action} strokeWidth={2.4} />} onPress={() => void vm.issue()} testID="digital-id-replace" />
            <Button label={t('id.revoke')} variant="dangerOutline" disabled={!canAct} onPress={vm.askRevoke} testID="digital-id-revoke" />
          </View>
        )
      ) : (
        <>
          <Button label={t('id.create')} fullWidth busy={vm.busy} disabled={!canAct} icon={<Icon name="plus" size={16} color={color.onAction} strokeWidth={2.4} />} onPress={() => void vm.issue()} testID="digital-id-create" />
          <Text style={m2Text.meta}>{t('id.qrNote')}</Text>
        </>
      )}
    </M2Card>
  ) : null;

  const rows = id ? (
    <View style={styles.rows} testID="digital-id-rows">
      {links.pass ? <M2ListRow icon="qr-code" hue="indigo" tile="gloss" title={t('pb.id.openPass')} meta={t('pb.id.passNote')} onPress={links.pass} trailing={<Icon name="arrow-right" size={18} color={color.text3} strokeWidth={2.4} />} testID="digital-id-pass" /> : null}
      {links.abha ? <M2ListRow icon="shield-2" hue="sky" tile="gloss" title={t('pb.id.abha')} meta={t('pb.id.abhaMeta')} onPress={links.abha} testID="digital-id-abha" /> : null}
      {policy ? (
        <M2ListRow icon="briefcase" hue="amber" tile="gloss" title={policy.insurer} meta={t('pb.id.policyMeta', { date: policy.validUntil })} onPress={links.insurance}
          trailing={<M2Pill label={policy.validUntil >= today ? t('pb.id.active') : t('pb.id.expired')} tone={policy.validUntil >= today ? 'positive' : 'neutral'} />} testID="digital-id-policy" />
      ) : links.insurance ? (
        <M2ListRow icon="briefcase" hue="amber" tile="gloss" title={t('pb.id.noPolicy')} meta={t('pb.id.noPolicyMeta')} onPress={links.insurance} testID="digital-id-insurance" />
      ) : null}
      {links.passport ? <M2ListRow icon="heart-pulse" hue="rose" tile="gloss" title={t('member.digitalId.tabPassport')} onPress={links.passport} testID="digital-id-passport" /> : null}
    </View>
  ) : null;
  const privacy = <M2Note tone="info" icon="lock-3" testID="digital-id-privacy">{t('pb.id.privacy')}</M2Note>;

  const state = (
    <>
      {vm.loading ? <Skeleton label={t('id.loading')} lines={['70%', '50%', '90%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('id.failedTitle')} body={t('id.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
    </>
  );

  let body: React.ReactNode;
  if (desktop && id) {
    body = (
      <View style={styles.columns}>
        <View style={[styles.col, styles.colCard]}>{card}{rows}</View>
        <View style={styles.col}>{qrCard}</View>
        <View style={[styles.col, styles.colAside]}>
          <M2Card style={styles.artCard}>
            {art ? <View style={styles.artBox}><Image source={art} resizeMode="contain" accessibilityIgnoresInvertColors {...webAttrs({ 'aria-hidden': 'true' })} style={styles.art} /></View> : null}
            {privacy}
          </M2Card>
        </View>
      </View>
    );
  } else {
    body = <View style={[styles.stack, gutter]}>{state}{card}{qrCard}{rows}{id ? privacy : null}</View>;
  }

  if (wide) {
    return (
      <M2WideColumn testID="digital-id">
        {header}
        {desktop ? <View>{state}</View> : null}
        {body}
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="digital-id">
      {header}
      {body}
    </ScrollView>
  );
});

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono ? { fontFamily: font.family.mono } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function DigitalIdRoute({ links, wide = false, art }: { links?: DigitalIdLinks; wide?: boolean; art?: ArtSource }): React.ReactElement {
  const [vm] = useState(() => new DigitalIdViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <DigitalIdNativeView viewModel={vm} links={links} wide={wide} art={art} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  gutter: { paddingHorizontal: space.gutterPhone },
  stack: { gap: space.s14 },
  flex: { flex: 1, minWidth: 0, gap: space.s2 },
  centre: { textAlign: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s24 },
  col: { flex: 1, minWidth: 0, gap: space.s16 },
  colCard: { flex: 1.15 },
  colAside: { flex: 0.9 },
  card: { borderRadius: 26, padding: space.s20, gap: space.s14, overflow: 'hidden', ...shadowStyle(shadow.float) },
  cardRingBig: { position: 'absolute', right: -40, bottom: -60, width: 190, height: 190, borderRadius: radius.full, borderWidth: 26, borderColor: color.onHeroRule },
  cardRingSmall: { position: 'absolute', right: 40, top: -50, width: 120, height: 120, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  glass: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  brand: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.s14 },
  avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...shadowStyle(shadow.card) },
  initials: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.onHero },
  heroMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  field: { flexGrow: 1, flexBasis: '40%', gap: space.s2 },
  fieldLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.6, textTransform: 'uppercase', color: color.onHeroLabel },
  fieldValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: space.s8, borderRadius: radius.md, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule, paddingHorizontal: space.s10, paddingVertical: space.s8 },
  verifiedText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  qrCard: { padding: space.s16, gap: space.s14 },
  qrBox: { alignSelf: 'center', backgroundColor: color.qrBackground, borderRadius: radius.xl, padding: space.s10, ...shadowStyle(shadow.float) },
  qr: { backgroundColor: color.qrBackground },
  qrRow: { position: 'relative' },
  qrDark: { position: 'absolute', top: 0, backgroundColor: color.qrForeground },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  code: { fontFamily: font.family.mono, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 2, color: color.clinicalValue },
  notIssued: { alignItems: 'center', gap: space.s12, paddingVertical: space.s8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10 },
  rows: { gap: space.s8 },
  artCard: { padding: space.s14, gap: space.s12 },
  artBox: { height: 210, alignItems: 'center', justifyContent: 'flex-end' },
  art: { width: 240, height: 200 },
});
