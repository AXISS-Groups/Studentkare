import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { MyRequestsViewModel, NewRequestViewModel, canCancel, statusLabel } from '../viewmodel/RequestsViewModel';
import type { RequestItem, ReturnReason, VisitService } from '../viewmodel/RequestsViewModel';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/**
 * My requests, Return or refund, Hostel room visit, Refill request — one
 * source for web and native (design page 2, Tier 3; data model approved).
 */

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const clock = (s: number) => new Date(s * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export interface RequestsLinks {
  newReturn: () => void;
  newHostelVisit: () => void;
  newRefill: () => void;
}

function Detail({ item }: { item: RequestItem }) {
  const t = useT();
  const d = item.detail;
  if (!d) return null;
  return (
    <>
      {item.kind === 'RETURN' && d.refundStatus === 'TO_ARRANGE' && d.refundPaise ? (
        <Text style={styles.meta}>{t('req.refund', { amount: rupees(d.refundPaise) })}</Text>
      ) : null}
      {item.kind === 'HOSTEL_VISIT' && d.windowStart && d.windowEnd ? (
        <Text style={styles.meta}>{t('req.visitLine', { block: d.hostelBlock ?? '', room: d.room ?? '', date: when(d.windowStart), from: clock(d.windowStart), to: clock(d.windowEnd) })}</Text>
      ) : null}
      {item.kind === 'REFILL' && d.pharmacy ? <Text style={styles.meta}>{t('req.refillLine', { pharmacy: d.pharmacy, quantity: d.quantity ?? '' })}</Text> : null}
      {d.decisionNote ? <Text style={styles.meta}>{t('sos.theirNote', { note: d.decisionNote })}</Text> : null}
    </>
  );
}

export const MyRequestsView = observer(function MyRequestsView({ viewModel: vm, links }: { viewModel: MyRequestsViewModel; links: RequestsLinks }) {
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('req.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('req.title')}</Text>
      <View style={styles.actions}>
        <Button label={t('req.newReturn')} variant="secondary" onPress={links.newReturn} />
        <Button label={t('req.newVisit')} variant="secondary" onPress={links.newHostelVisit} />
        <Button label={t('req.newRefill')} variant="secondary" onPress={links.newRefill} />
      </View>
      {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
      {vm.items === null && !vm.loadFailed ? <Skeleton label={t('req.loading')} lines={['100%', '80%', '100%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('req.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
      {vm.items && vm.items.length === 0 ? <EmptyState title={t('req.emptyTitle')} body={t('req.emptyBody')} /> : null}
      {vm.items?.map((item) => (
        <Card key={`${item.kind}-${item.id}`}>
          <Text style={styles.kind}>{`${t(`req.kind.${item.kind}` as MessageKey).toUpperCase()} · ${when(item.createdAt)}`}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.status}>{statusLabel(item, t)}</Text>
          <Detail item={item} />
          {canCancel(item) ? <Button label={t('req.cancel')} variant="ghost" busy={vm.busyId === item.id} onPress={() => void vm.cancel(item)} /> : null}
        </Card>
      ))}
    </ScrollView>
  );
});

const REASONS: readonly ReturnReason[] = ['WRONG_ITEM', 'DAMAGED', 'NOT_NEEDED', 'OTHER'];
const SERVICES: readonly VisitService[] = ['LAB_PICKUP', 'NURSE_VISIT'];
const HOURS = ['1', '2', '3'] as const;

export interface NewRequestLinks {
  done: () => void;
  /** Web only: attach a photo to the return just created. */
  attachReturnPhoto?: (returnId: string) => Promise<void>;
}

export const NewRequestView = observer(function NewRequestView({ viewModel: vm, links }: { viewModel: NewRequestViewModel; links: NewRequestLinks }) {
  const o = vm.options;
  const t = useT();
  const [photoNote, setPhotoNote] = useState<MessageKey | null>(null);

  if (vm.done) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Note tone="positive" title={t('req.sentTitle')}>{t('req.sentBody')}</Note>
        {vm.kind === 'RETURN' && vm.createdReturnId && links.attachReturnPhoto ? (
          <Button label={t('req.addPhoto')} variant="secondary" fullWidth onPress={() => {
            links.attachReturnPhoto?.(vm.createdReturnId).then(() => setPhotoNote('req.photoAdded'), () => setPhotoNote('req.photoFailed'));
          }} />
        ) : null}
        {photoNote ? <Text style={styles.meta}>{t(photoNote)}</Text> : null}
        <Button label={t('req.backToList')} fullWidth onPress={links.done} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('req.newEyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t(`req.form.${vm.kind}` as MessageKey)}</Text>
      {!o && !vm.loadFailed ? <Skeleton label={t('common.loading')} lines={['100%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {o && vm.kind === 'RETURN' ? (
        o.lines.length === 0 ? (
          <EmptyState title={t('req.nothingReturnTitle')} body={t('req.nothingReturnBody')} />
        ) : (
          <Card>
            <RadioGroup label={t('req.whichItem')} options={o.lines.map((l) => ({ value: l.orderLineId, label: `${l.item} · ${rupees(l.pricePaise)}` }))}
              value={vm.orderLineId} onChange={(v) => vm.set('orderLineId', v)} />
            <RadioGroup label={t('req.whatsWrong')} options={REASONS.map((r) => ({ value: r, label: t(`req.reason.${r}` as MessageKey) }))} value={vm.reason} onChange={(v) => vm.set('reason', v)} />
            <TextField label={vm.reason === 'OTHER' ? t('req.tellUs') : t('req.anythingElse')} value={vm.note} onChangeText={(v) => vm.set('note', v)} maxLength={500} />
            <Text style={styles.meta}>{t('req.refundNote')}</Text>
          </Card>
        )
      ) : null}

      {o && vm.kind === 'HOSTEL_VISIT' ? (
        <Card>
          <RadioGroup label={t('req.whatNeed')} options={SERVICES.map((sv) => ({ value: sv, label: t(`req.service.${sv}` as MessageKey) }))} value={vm.service} onChange={(v) => vm.set('service', v)} />
          <TextField label={t('req.block')} value={vm.hostelBlock} onChangeText={(v) => vm.set('hostelBlock', v)} maxLength={80} />
          <TextField label={t('req.room')} value={vm.room} onChangeText={(v) => vm.set('room', v)} maxLength={40} />
          <TextField label={t('req.date')} mono value={vm.date} onChangeText={(v) => vm.set('date', v.trim())} maxLength={10} />
          <TextField label={t('req.from')} mono value={vm.startTime} onChangeText={(v) => vm.set('startTime', v.trim())} maxLength={5} />
          <RadioGroup label={t('req.howLong')} options={HOURS.map((h) => ({ value: h, label: h === '1' ? t('req.hour1') : t('req.hoursN', { count: h }) }))} value={vm.hours} onChange={(v) => vm.set('hours', v)} />
          {vm.date && vm.startTime && vm.hours && !vm.window ? <Text style={styles.warn}>{t('req.badWindow')}</Text> : null}
          <Text style={styles.meta}>{t('req.visitNote')}</Text>
        </Card>
      ) : null}

      {o && vm.kind === 'REFILL' ? (
        o.plans.length === 0 ? (
          <EmptyState title={t('req.noMedsTitle')} body={t('req.noMedsBody')} />
        ) : o.pharmacies.length === 0 ? (
          <EmptyState title={t('req.noPharmTitle')} body={t('req.noPharmBody')} />
        ) : (
          <Card>
            <RadioGroup label={t('req.whichMed')} options={o.plans.map((p) => ({ value: p.id, label: p.dosage ? `${p.name} · ${p.dosage}` : p.name }))}
              value={vm.planId} onChange={(v) => vm.set('planId', v)} />
            <RadioGroup label={t('req.whichPharmacy')} options={o.pharmacies.map((p) => ({ value: p.id, label: p.name }))}
              value={vm.providerId} onChange={(v) => vm.set('providerId', v)} />
            <TextField label={t('req.qty')} value={vm.quantity} onChangeText={(v) => vm.set('quantity', v.replace(/\D/g, ''))} keyboardType="numeric" maxLength={2} />
            <TextField label={t('req.pharmNote')} value={vm.note} onChangeText={(v) => vm.set('note', v)} maxLength={500} />
            <Text style={styles.meta}>{t('req.refillPrivacy')}</Text>
          </Card>
        )
      ) : null}

      {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
      {o ? <Button label={t('req.send')} size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} onPress={() => void vm.submit()} /> : null}
    </ScrollView>
  );
});

export function MyRequestsRoute({ links }: { links: RequestsLinks }): React.ReactElement {
  const [vm] = useState(() => new MyRequestsViewModel());
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return <MyRequestsView viewModel={vm} links={links} />;
}

export function NewRequestRoute({ kind, links }: { kind: NewRequestViewModel['kind']; links: NewRequestLinks }): React.ReactElement {
  const [vm] = useState(() => new NewRequestViewModel(kind));
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return <NewRequestView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 640 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  kind: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, color: color.text3 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  status: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  warn: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.danger },
});
