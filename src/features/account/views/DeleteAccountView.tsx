import { cardLabel } from '@/design-system/m2';
import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Chip, ErrorState, Note, Skeleton, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, TextLink, boardText } from '@/design-system/board/BoardKit';
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
}

type PressState = { pressed: boolean; focused?: boolean };

const DAY = 86400;

const date = (s: number | null) => (s ? new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

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

/**
 * Delete my account (canvas page 2: DeleteAccount, Tier 1 — approved by
 * Krishna Chintakayala, 2026-10-21). One source for web and native. No
 * animation: a destructive confirm (motion board). Everything time-based comes
 * from GET /records/deletion-request.
 *
 * Not drawn, on purpose: the PDF + FHIR export (the server exports a JSON
 * file), the code sent to the phone (no server step, D6-9), the request id and
 * "we've emailed you" (the server returns and sends neither), and the board's
 * "kept because the law requires it" lines, which need legal sign-off — the
 * kept list says only what erasure.py really keeps.
 */
export const DeleteAccountView = observer(function DeleteAccountView({ viewModel: vm, links }: { viewModel: DeleteAccountViewModel; links: DeleteAccountLinks }) {
  const s = vm.state;
  const t = useT();
  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [reason, setReason] = useState<Reason | null>(null);
  const [cancelledNow, setCancelledNow] = useState(false);

  const keep = async () => {
    await vm.cancel();
    if (!vm.error && !vm.scheduled) { setCancelledNow(true); setStep('info'); }
  };
  const progress = s && vm.scheduled ? graceDay(s, Date.now() / 1000) : null;

  return (
    <BoardScreen testID="delete-account">
      <BoardHeader title={t('del.title')} backIcon="chevron-left" backLabel={t('common.back')} onBack={links.back} />

      {!s && !vm.loadFailed ? <Skeleton label={t('common.loading')} lines={['90%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {s && vm.scheduled ? (
        <View style={styles.block} testID="delete-scheduled">
          <View style={styles.scheduled}>
            <Text style={[boardText.eyebrow, { color: color.attention }]}>{t('sf.del.scheduled')}</Text>
            <Text accessibilityRole="header" style={styles.scheduledTitle}>{t('del.scheduledTitle', { date: date(s.scheduledFor) })}</Text>
            <Text style={[boardText.body, { color: color.text }]}>{t('sf.del.scheduledBody')}</Text>
            {progress ? <Text style={[boardText.mono, { color: color.attention }]}>{t('sf.del.dayOf', { day: progress.day, of: progress.of })}</Text> : null}
          </View>
          {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
          <Button testID="delete-keep" label={t('sf.del.keep')} size="cta" fullWidth busy={vm.busy} onPress={() => void keep()} />
        </View>
      ) : null}

      {s && !vm.scheduled && cancelledNow ? (
        <View style={[styles.block, styles.center]} testID="delete-cancelled" role="status">
          <View style={styles.okMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Icon name="check" size={space.s32} color={color.positive} strokeWidth={3} />
          </View>
          <Text accessibilityRole="header" style={styles.scheduledTitle}>{t('sf.del.stayingTitle')}</Text>
          <Text style={[boardText.body, styles.centerText]}>{t('sf.del.stayingBody')}</Text>
          {links.back ? <Button label={t('sf.del.done')} variant="secondary" fullWidth onPress={links.back} /> : null}
        </View>
      ) : null}

      {s && !vm.scheduled && !cancelledNow && step === 'info' ? (
        <View style={styles.block} testID="delete-info">
          <Text style={boardText.body}>{t('sf.del.intro', { graceDays: deletionGraceDays(s) })}</Text>
          {links.exportData ? (
            <Pressable testID="delete-export" accessibilityRole="link" {...cardLabel(t('sf.del.exportTitle'))} onPress={links.exportData}
              style={({ focused }: PressState) => [styles.export, focused ? focusRing : null]}>
              <Icon name="download" size={size.navIcon} color={color.action} />
              <View style={styles.flex}>
                <Text style={[boardText.strong, { color: color.action }]}>{t('sf.del.exportTitle')}</Text>
                <Text style={[boardText.meta, { color: color.action }]}>{t('sf.del.exportMeta')}</Text>
              </View>
              <Icon name="arrow-right" size={size.navIcon} color={color.action} />
            </Pressable>
          ) : null}
          <View style={styles.gone}>
            <Text style={[boardText.eyebrow, { color: color.danger }]}>{t('sf.del.goneTitle')}</Text>
            {DELETED.map((item) => (
              <View key={item} style={styles.listRow}>
                <Icon name="x" size={space.s14} color={color.danger} strokeWidth={3} />
                <Text style={[styles.listText, styles.flex]}>{t(item)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.kept}>
            <Text style={[boardText.eyebrow, { color: color.attention }]}>{t('sf.del.keptTitle')}</Text>
            <View style={styles.listRow}>
              <View style={styles.keptDot} />
              <Text style={[styles.listText, styles.flex]}>{s.archiveRetentionDays ? t('del.p3days', { days: s.archiveRetentionDays }) : t('del.p3')}</Text>
            </View>
            <View style={styles.listRow}>
              <View style={styles.keptDot} />
              <Text style={[styles.listText, styles.flex]}>{t('del.p4')}</Text>
            </View>
          </View>
          <Text style={boardText.body}>{t('sf.del.abha')}</Text>
          <Button testID="delete-continue" label={t('sf.del.continue')} variant="dangerOutline" size="cta" fullWidth onPress={() => setStep('confirm')} />
        </View>
      ) : null}

      {s && !vm.scheduled && !cancelledNow && step === 'confirm' ? (
        <View style={styles.block} testID="delete-confirm">
          <Text style={boardText.eyebrow}>{t('sf.del.why')}</Text>
          <View role="radiogroup" accessibilityLabel={t('sf.del.why')} style={styles.chips}>
            {REASONS.map((r) => (
              <Chip key={r} label={t(`sf.del.reason.${r}` as MessageKey)} selected={reason === r} onPress={() => setReason(reason === r ? null : r)} testID={`delete-reason-${r}`} />
            ))}
          </View>
          <Text style={boardText.meta}>{t('sf.del.whyNote')}</Text>
          {reason === 'hard' ? (
            <View style={styles.hard} testID="delete-crisis">
              <Text style={boardText.strong}>{t('sf.del.hardTitle')}</Text>
              <Text style={boardText.body}>{t('sf.del.hardBody')}</Text>
              <Button label={t('crisis.callTeleManas')} accessibilityLabel={t('crisis.callTeleManasSpoken')} variant="secondary" fullWidth onPress={() => void Linking.openURL('tel:14416')} />
              {links.crisis ? <TextLink label={t('sf.del.hardMore')} onPress={links.crisis} /> : null}
            </View>
          ) : null}
          <TextField label={t('del.typeToConfirm', { word: CONFIRM_WORD })} value={vm.confirmText} onChangeText={vm.setConfirmText} maxLength={10} testID="delete-word" />
          {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
          <Button testID="delete-confirm-button" label={t('del.confirm', { graceDays: deletionGraceDays(s) })} variant="danger" size="cta" fullWidth busy={vm.busy} disabled={!vm.canConfirm && !vm.busy} onPress={() => void vm.confirm()} />
          <Button label={t('common.back')} variant="secondary" fullWidth onPress={() => setStep('info')} />
        </View>
      ) : null}
    </BoardScreen>
  );
});

export function DeleteAccountRoute({ links }: { links: DeleteAccountLinks }): React.ReactElement {
  const [vm] = useState(() => new DeleteAccountViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <DeleteAccountView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  block: { gap: space.s14 },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  export: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface3 },
  gone: { gap: space.s8, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.dangerBg },
  kept: { gap: space.s8, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.attentionBg },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  listText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
  keptDot: { width: space.s6, height: space.s6, borderRadius: radius.full, backgroundColor: color.attention, marginTop: space.s8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  hard: { gap: space.s10, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface3 },
  scheduled: { gap: space.s8, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.attentionBg },
  scheduledTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  okMark: { width: space.s40 * 2, height: space.s40 * 2, borderRadius: radius.full, backgroundColor: color.positiveBg, alignItems: 'center', justifyContent: 'center' },
});
