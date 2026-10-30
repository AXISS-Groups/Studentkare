import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, Chip, ErrorState, Note, OfflineBanner, Skeleton, TextField, useOnline } from '@/design-system';
import { TELE_MANAS_NUMBER } from '@/design-system/CrisisLinks';
import { Icon } from '@/design-system/icons';
import { Pill } from '@/design-system/board/BoardKit';
import {
  M2Callout, M2Card, M2Countdown, M2Grid, M2Header, M2Heading, M2ListLine, M2PageHero, M2Tile3d, M2WideColumn, m2Text, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { CONFIRM_WORD, DeleteAccountViewModel, deletionGraceDays } from '../viewmodel/DeleteAccountViewModel';
import type { DeletionStatus } from '../viewmodel/DeleteAccountViewModel';

export interface DeleteAccountLinks {
  /** Download my data first, where the platform has it. */
  exportData?: () => void;
  /** Crisis support, from the "hard time" answer. */
  crisis?: () => void;
  /** Expo stack back; on the web the header's back is the browser's. */
  back?: () => void;
  /** The "not ready to delete?" alternatives (desktop column); each is drawn only when given. */
  leaveCampus?: () => void;
  security?: () => void;
  shares?: () => void;
  support?: () => void;
}

const DAY = 86400;

/** The scheduled date in the reader's language (the server's time, never a client clock). */
const dateIn = (s: number | null, lang: string) => (s ? new Date(s * 1000).toLocaleDateString(`${lang}-IN`, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Day n of N: N is the grace period from the settings registry
 * (privacy.deletion_grace_days, sent by the server with the request), n counts
 * from the server's own request time. Never a client constant.
 */
export function graceDay(state: DeletionStatus, nowSeconds: number): { day: number; of: number } | null {
  if (!state.requestedAt || !state.scheduledFor || state.scheduledFor <= state.requestedAt) return null;
  const of = deletionGraceDays(state);
  const day = Math.min(of, Math.max(1, Math.floor((nowSeconds - state.requestedAt) / DAY) + 1));
  return { day, of };
}

/** What the erasure job removes (backend/services/erasure.py: every row reachable from the account). */
const DELETED: readonly MessageKey[] = ['sf.del.gone1', 'sf.del.gone2', 'sf.del.gone3', 'sf.del.gone4'];

/** Optional answers. None is sent or kept; "a hard time" only adds the crisis lines, it never blocks deleting. */
const REASONS = ['unused', 'privacy', 'moving', 'hard', 'other'] as const;
type Reason = (typeof REASONS)[number];

/** An inline link in a sentence (the "not ready to delete?" card). */
function InlineLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={label} aria-label={label} onPress={onPress}
      style={({ focused }: PressState) => [styles.inlineLink, focused ? focusRing : null]}>
      <Text style={m2Text.link}>{label}</Text>
    </Pressable>
  );
}

/**
 * Delete my account, one view at every width (canvas page 2: DeleteAccount,
 * Tier 1 — approved by Krishna Chintakayala, 2026-10-21; canvas 3b
 * WebDeleteAccount, superseded; Tier 1 look T1DeleteAccount / Pending /
 * Desktop, approved 2026-10-24; plan tier1-parity-2026-10-24 §19). One source
 * for web and native. No animation beyond the countdown ring's single draw: a
 * destructive confirm (motion board). Everything time-based comes from
 * GET /records/deletion-request; the grace period from the settings registry.
 *
 * Not drawn, on purpose: the PDF + FHIR export (the server exports a JSON
 * file), the code sent to the phone (no server step, D6-9), the request id and
 * "we've emailed you" (the server returns and sends neither), and the board's
 * "kept because the law requires it" lines, which need legal sign-off — the
 * kept list says only what erasure.py really keeps.
 */
export const DeleteAccountView = observer(function DeleteAccountView({ viewModel: vm, links, wide = false }: { viewModel: DeleteAccountViewModel; links: DeleteAccountLinks; wide?: boolean }) {
  const s = vm.state;
  const t = useT();
  const { lang } = useLanguage();
  useOwnPhoneChrome();
  const online = useOnline();
  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [reason, setReason] = useState<Reason | null>(null);
  const [cancelledNow, setCancelledNow] = useState(false);

  const keep = async () => {
    await vm.cancel();
    if (!vm.error && !vm.scheduled) { setCancelledNow(true); setStep('info'); }
  };
  const progress = s && vm.scheduled ? graceDay(s, Date.now() / 1000) : null;
  const graceDays = s ? deletionGraceDays(s) : 0;

  const exportCard = links.exportData ? (
    <M2Card style={styles.card} testID="delete-export-card">
      <View style={styles.row}>
        <M2Tile3d icon="download" hue="indigo" />
        <View style={styles.grow}>
          <M2Heading style={m2Text.cardTitle}>{t('sf.del.exportTitle')}</M2Heading>
          <Text style={m2Text.meta}>{t('sf.del.exportMeta')}</Text>
        </View>
      </View>
      <Button label={t('del.export')} variant="secondary" fullWidth onPress={links.exportData} icon={<Icon name="download" size={16} color={color.action} />} testID="delete-export" />
    </M2Card>
  ) : null;

  const loading = !s && !vm.loadFailed ? <M2Card style={styles.card}><Skeleton label={t('common.loading')} lines={['90%', '70%']} /></M2Card> : null;
  const failed = vm.loadFailed ? <M2Card style={styles.card}><ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /></M2Card> : null;

  const scheduled = s && vm.scheduled ? (
    <M2Card style={styles.card} testID="delete-scheduled">
      <View style={styles.row}>
        <M2Tile3d icon="clock" hue="danger" size={48} />
        <View style={styles.grow} />
        <Pill label={t('sf.del.scheduled')} tone="danger" />
      </View>
      <M2Heading style={styles.bigTitle}>{t('del.scheduledTitle', { date: dateIn(s.scheduledFor, lang) })}</M2Heading>
      <Text style={m2Text.body}>{t('sf.del.scheduledBody')}</Text>
      {progress ? <M2Countdown day={progress.day} of={progress.of} label={t('sf.del.dayOf', { day: progress.day, of: progress.of })} testID="delete-countdown" /> : null}
      {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
      <Button testID="delete-keep" label={t('sf.del.keep')} size="cta" fullWidth busy={vm.busy} disabled={!online && !vm.busy} onPress={() => void keep()} />
    </M2Card>
  ) : null;

  const cancelled = s && !vm.scheduled && cancelledNow ? (
    <M2Card style={[styles.card, styles.centre]} testID="delete-cancelled">
      <View role="status" style={styles.centre}>
        <M2Tile3d icon="check" hue="green" size={56} />
        <M2Heading style={[styles.bigTitle, styles.centreText]}>{t('sf.del.stayingTitle')}</M2Heading>
        <Text style={[m2Text.body, styles.centreText]}>{t('sf.del.stayingBody')}</Text>
      </View>
      {links.back ? <Button label={t('sf.del.done')} variant="secondary" fullWidth onPress={links.back} /> : null}
    </M2Card>
  ) : null;

  const info = s && !vm.scheduled && !cancelledNow ? (
    <>
      <M2Card style={styles.card} testID="delete-gone">
        <View style={styles.row}>
          <M2Tile3d icon="trash" hue="danger" />
          <M2Heading style={[m2Text.section, styles.grow]}>{t('sf.del.goneTitle')}</M2Heading>
        </View>
        {DELETED.map((item) => <M2ListLine key={item} icon="x" ink={color.danger}>{t(item)}</M2ListLine>)}
      </M2Card>
      <M2Card style={styles.card} testID="delete-kept">
        <View style={styles.row}>
          <M2Tile3d icon="shield-check" hue="green" />
          <M2Heading style={[m2Text.section, styles.grow]}>{t('sf.del.keptTitle')}</M2Heading>
        </View>
        <Text style={m2Text.body}>{s.archiveRetentionDays ? t('del.p3days', { days: s.archiveRetentionDays }) : t('del.p3')}</Text>
        <Text style={m2Text.body}>{t('del.p4')}</Text>
      </M2Card>
      <M2Callout tone="neutral" icon="id-card" hue="indigo" body={t('sf.del.abha')} testID="delete-abha" />
    </>
  ) : null;

  const decide = s && !vm.scheduled && !cancelledNow ? (
    <M2Card style={styles.card} testID={step === 'info' ? 'delete-info' : 'delete-confirm'}>
      <M2Heading style={m2Text.section}>{t('swt.del.confirmTitle')}</M2Heading>
      <Text style={m2Text.cardTitle}>{t('sf.del.why')}</Text>
      <View role="radiogroup" accessibilityLabel={t('sf.del.why')} aria-label={t('sf.del.why')} style={styles.chips}>
        {REASONS.map((r) => (
          <Chip key={r} label={t(`sf.del.reason.${r}` as MessageKey)} selected={reason === r} onPress={() => setReason(reason === r ? null : r)} testID={`delete-reason-${r}`} />
        ))}
      </View>
      <Text style={m2Text.meta}>{t('sf.del.whyNote')}</Text>
      {reason === 'hard' ? (
        <View style={styles.hard} testID="delete-crisis">
          <Text style={[m2Text.cardTitle, { color: color.danger }]}>{t('sf.del.hardTitle')}</Text>
          <Text style={[m2Text.body, { color: color.text }]}>{t('sf.del.hardBody')}</Text>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('crisis.callTeleManasSpoken')} aria-label={t('crisis.callTeleManasSpoken')}
            onPress={() => void Linking.openURL(`tel:${TELE_MANAS_NUMBER}`)} testID="delete-call-telemanas"
            style={({ focused }: PressState) => [styles.callPill, focused ? focusRing : null]}>
            <Icon name="phone-2" size={18} color={color.onDangerFill} />
            <Text style={styles.callPillText}>{t('crisis.callTeleManas')}</Text>
          </Pressable>
          {links.crisis ? <InlineLink label={t('sf.del.hardMore')} onPress={links.crisis} /> : null}
        </View>
      ) : null}
      <M2Callout tone="danger" icon="phone-call" hue="danger" body={t('swt.del.crisisNote')} />
      {step === 'info' ? (
        <Button testID="delete-continue" label={t('sf.del.continue')} variant="dangerOutline" size="cta" fullWidth onPress={() => setStep('confirm')}
          icon={<Icon name="arrow-right" size={16} color={color.danger} />} />
      ) : (
        <View style={styles.confirmBox} testID="delete-confirm-box">
          <TextField label={t('del.typeToConfirm', { word: CONFIRM_WORD })} value={vm.confirmText} onChangeText={vm.setConfirmText} maxLength={10} testID="delete-word" />
          {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
          <Button testID="delete-confirm-button" label={t('del.confirm', { graceDays })} variant="danger" size="cta" fullWidth busy={vm.busy}
            disabled={(!vm.canConfirm || !online) && !vm.busy} onPress={() => void vm.confirm()} icon={<Icon name="trash" size={16} color={color.onAction} />} />
          <Button label={t('common.cancel')} variant="secondary" fullWidth onPress={() => { setStep('info'); vm.setConfirmText(''); }} />
        </View>
      )}
    </M2Card>
  ) : null;

  const notReady = links.leaveCampus || links.security || links.shares || links.support ? (
    <M2Card style={styles.card} testID="delete-not-ready">
      <M2Heading style={m2Text.section}>{t('swt.del.notReady')}</M2Heading>
      {links.leaveCampus ? <View style={styles.sentence}><Text style={m2Text.body}>{t('swt.del.leaving')}</Text><InlineLink label={t('swt.del.leavingLink')} onPress={links.leaveCampus} /></View> : null}
      {links.security && links.shares ? (
        <View style={styles.sentence}>
          <Text style={m2Text.body}>{t('swt.del.worried')}</Text>
          <InlineLink label={t('swt.del.worriedLink')} onPress={links.security} />
          <Text style={m2Text.body}>{t('swt.del.worriedAnd')}</Text>
          <InlineLink label={t('swt.del.shares')} onPress={links.shares} />
        </View>
      ) : null}
      {links.support ? <View style={styles.sentence}><Text style={m2Text.body}>{t('swt.del.questions')}</Text><InlineLink label={t('swt.del.questionsLink')} onPress={links.support} /></View> : null}
    </M2Card>
  ) : null;

  const offline = !online ? <OfflineBanner message={t('common.retryConnection')} /> : null;

  if (wide) {
    return (
      <M2WideColumn testID="delete-account">
        <M2Header backLabel={t('common.back')} onBack={links.back} title={t('del.title')} testID="delete-header" />
        <M2PageHero hue="indigo" icon="trash" title={t('del.what')} body={s ? `${t('del.p1', { graceDays })}\n${t('del.p2')}` : t('swt.del.sub')} testID="delete-hero"
          art={<View style={styles.heroArtRow}><M2Tile3d icon="trash" hue="danger" size={64} float /><M2Tile3d icon="download" hue="indigo" size={56} float /></View>} artOnPhone={false} />
        {offline}
        {loading}{failed}
        <M2Grid columns={{ desktop: 2, tablet: 1 }}>
          <View style={styles.column}>{scheduled}{cancelled}{info}</View>
          <View style={styles.column}>{exportCard}{decide}{notReady}</View>
        </M2Grid>
      </M2WideColumn>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="delete-account">
      <M2Header backLabel={t('common.back')} onBack={links.back} title={t('del.title')} testID="delete-header" />
      <View style={[styles.gutter, styles.column]}>
        <M2PageHero hue="indigo" icon="trash" body={t('sf.del.intro', { graceDays })} testID="delete-hero" />
        {offline}
        {loading}{failed}
        {scheduled}{cancelled}
        {exportCard}
        {info}
        {decide}
        {notReady}
      </View>
    </ScrollView>
  );
});

export function DeleteAccountRoute({ links, wide = false }: { links: DeleteAccountLinks; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new DeleteAccountViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <DeleteAccountView viewModel={vm} links={links} wide={wide} />;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.s14, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  column: { gap: space.s14 },
  card: { padding: space.s16, gap: space.s12 },
  centre: { alignItems: 'center' },
  centreText: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  bigTitle: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  hard: { gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerRule },
  callPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, minHeight: size.control, borderRadius: radius.full, backgroundColor: color.dangerFill },
  callPillText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  confirmBox: { gap: space.s12, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerRule },
  inlineLink: { minHeight: size.touchTarget, justifyContent: 'center' },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.s6 },
  heroArtRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
});
