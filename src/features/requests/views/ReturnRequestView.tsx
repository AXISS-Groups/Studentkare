import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, Chip, EmptyState, ErrorState, Note, Rise, Skeleton, TextField, Toast } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BackButton, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { orderRef } from '@/features/phoneKit/orderRef';
import { NewRequestViewModel } from '../viewmodel/RequestsViewModel';
import type { EligibleLine, ReturnReason } from '../viewmodel/RequestsViewModel';
import { ResultRefundView } from './ResultRefundView';
import { useScrollTopOn } from '@/features/phoneKit/useScrollTopOn';
import type { RequestedReturn } from './ResultRefundView';

type Pressed = { pressed: boolean; focused?: boolean };

const REASONS: readonly ReturnReason[] = ['DAMAGED', 'WRONG_ITEM', 'NOT_NEEDED', 'OTHER'];

/** A photo picked before sending; it is uploaded to the return once the return exists. */
export interface PickedPhoto { name: string; upload: (returnId: string) => Promise<void> }

export interface ReturnRequestLinks {
  /** Back to the student's requests (also where "Track refund" goes). */
  done: () => void;
  /** Web: open the file picker. Native has no picker here, so the photo row is not drawn. */
  pickPhoto?: () => Promise<PickedPhoto | null>;
}

const when = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * Return or refund (canvas ReturnRequest): pick the item, say what's wrong,
 * add a photo if you like, and send. One request covers one item (POST
 * /api/returns takes one order line). The refund line shows the item's price
 * and says plainly that the pharmacy decides first. Then ResultRefund.
 */
export const ReturnRequestView = observer(function ReturnRequestView({ vm, links }: { vm: NewRequestViewModel; links: ReturnRequestLinks }) {
  const t = useT();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [sent, setSent] = useState<RequestedReturn | null>(null);
  const lines = vm.options?.lines ?? [];
  const chosen = lines.find((l) => l.orderLineId === vm.orderLineId) ?? null;
  useScrollTopOn(sent ? 'sent' : 'form');
  const groups = lines.reduce<Map<string, EligibleLine[]>>((m, l) => m.set(l.orderId, [...(m.get(l.orderId) ?? []), l]), new Map());

  useEffect(() => {
    if (!vm.done || sent || !chosen) return;
    const request = { returnId: vm.createdReturnId, item: chosen.item, orderId: chosen.orderId, pricePaise: chosen.pricePaise };
    setSent(request);
    if (photo && vm.createdReturnId) photo.upload(vm.createdReturnId).catch(() => setPhotoFailed(true));
  }, [vm.done, vm.createdReturnId, sent, chosen, photo]);

  if (sent) {
    return (
      <>
        <ResultRefundView request={sent} onBack={links.done} onTrack={links.done}
          onAnother={() => { setSent(null); setPhoto(null); vm.reset(); vm.set('orderLineId', null); vm.set('reason', null); vm.set('note', ''); void vm.load(); }} />
        {photoFailed ? <Toast message={t('phone.return.photoFailed')} tone="error" onDone={() => setPhotoFailed(false)} /> : null}
      </>
    );
  }

  return (
    <View style={phoneLayout.screen} testID="return-request">
      <View style={styles.top}>
        <BackButton label={t('common.back')} onPress={links.done} />
        <Text accessibilityRole="header" style={[phoneText.heading, phoneLayout.grow]}>{t('phone.return.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        {!vm.options && !vm.loadFailed ? <Skeleton label={t('common.loading')} lines={['100%', '70%', '100%']} /> : null}
        {vm.loadFailed ? <ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
        {vm.options && lines.length === 0 ? (
          <EmptyState title={t('req.nothingReturnTitle')} body={t('req.nothingReturnBody')} action={{ label: t('phone.return.backToRequests'), onPress: links.done }} />
        ) : null}

        {lines.length > 0 ? (
          <>
            <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.return.whichItem')}</Text>
            <View role="radiogroup" accessibilityLabel={t('phone.return.whichItem')} style={styles.group}>
              {Array.from(groups.entries()).map(([orderId, items]) => (
                <View key={orderId} style={styles.group}>
                  <View style={styles.order}>
                    <Text style={styles.orderRef}>{t('phone.return.order', { ref: orderRef(orderId) })}</Text>
                    <Text style={phoneText.meta}>{t('phone.return.ordered', { date: when(items[0]?.orderedAt ?? 0) })}</Text>
                  </View>
                  {items.map((l, i) => {
                    const on = vm.orderLineId === l.orderLineId;
                    return (
                      <Rise key={l.orderLineId} index={i}>
                        <Pressable role="radio" aria-checked={on} accessibilityRole="radio" accessibilityState={{ checked: on }}
                          accessibilityLabel={`${l.item}, ${money(l.pricePaise)}`} onPress={() => vm.set('orderLineId', l.orderLineId)}
                          testID={`return-line-${l.orderLineId}`} style={({ focused }: Pressed) => [styles.item, on ? styles.itemOn : null, focused ? focusRing : null]}>
                          <View style={[styles.box, on ? styles.boxOn : null]}>{on ? <Icon name="check-2" size={14} color={color.onAction} strokeWidth={3} /> : null}</View>
                          <View style={phoneLayout.grow}>
                            <Text style={phoneText.title}>{l.item}</Text>
                            <Text style={phoneText.meta}>{t('phone.return.qty', { count: l.quantity })}</Text>
                          </View>
                          <Text style={styles.price}>{money(l.pricePaise)}</Text>
                        </Pressable>
                      </Rise>
                    );
                  })}
                </View>
              ))}
            </View>

            <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.return.whatsWrong')}</Text>
            <View style={styles.chips}>
              {REASONS.map((r) => (
                <Chip key={r} label={t(`req.reason.${r}` as MessageKey)} selected={vm.reason === r} onPress={() => vm.set('reason', r)} testID={`return-reason-${r}`} />
              ))}
            </View>
            {vm.reason ? (
              <TextField label={vm.reason === 'OTHER' ? t('req.tellUs') : t('req.anythingElse')} value={vm.note} onChangeText={(v) => vm.set('note', v)} maxLength={500} />
            ) : null}

            {links.pickPhoto ? (
              <>
                <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.return.photo')}</Text>
                <Pressable role="button" accessibilityRole="button" testID="return-photo"
                  accessibilityLabel={photo ? t('phone.return.photoChosen', { name: photo.name }) : t('phone.return.addPhoto')}
                  onPress={() => { void links.pickPhoto?.().then((p) => { if (p) setPhoto(p); }, () => undefined); }}
                  style={({ focused }: Pressed) => [styles.photo, focused ? focusRing : null]}>
                  <Icon name="upload" size={18} color={color.action} />
                  <Text style={phoneText.link}>{photo ? t('phone.return.photoChosen', { name: photo.name }) : t('phone.return.addPhoto')}</Text>
                </Pressable>
              </>
            ) : null}

            <View style={styles.refund}>
              <View style={styles.refundHead}>
                <Text style={phoneText.title}>{t('phone.return.refund')}</Text>
                <Text style={styles.refundAmount} testID="return-amount">{money(chosen?.pricePaise ?? 0)}</Text>
              </View>
              <Text style={phoneText.meta}>{t('phone.return.refundNote')}</Text>
            </View>
            {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
          </>
        ) : null}
      </ScrollView>
      {lines.length > 0 ? (
        <View style={styles.cta}>
          <Button size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} testID="return-submit"
            label={vm.canSubmit && chosen ? t('phone.return.send', { amount: money(chosen.pricePaise) }) : t('phone.return.pick')}
            onPress={() => void vm.submit()} />
        </View>
      ) : null}
    </View>
  );
});

/** /return-request: the canvas board, on the shared requests view model. */
export function ReturnRequestRoute({ links }: { links: ReturnRequestLinks }): React.ReactElement {
  const [vm] = useState(() => new NewRequestViewModel('RETURN'));
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return <ReturnRequestView vm={vm} links={links} />;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text2 },
  group: { gap: space.s10 },
  order: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  orderRef: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  item: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  itemOn: { borderColor: color.selectedRule, borderWidth: 1.5 },
  box: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: color.ruleStrong, backgroundColor: color.surface },
  boxOn: { backgroundColor: color.action, borderColor: color.action },
  price: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  photo: {
    minHeight: size.controlLg + space.s10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s10,
    borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.selectedRule, backgroundColor: color.surface,
  },
  refund: { gap: space.s6, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  refundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refundAmount: { fontFamily: font.family.mono, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cta: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, backgroundColor: color.canvas },
});
