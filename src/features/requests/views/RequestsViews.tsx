import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { MyRequestsViewModel, NewRequestViewModel, canCancel, statusLabel } from '../viewmodel/RequestsViewModel';
import type { RequestItem, RequestKind, ReturnReason, VisitService } from '../viewmodel/RequestsViewModel';

/**
 * My requests, Return or refund, Hostel room visit, Refill request — one
 * source for web and native (design page 2, Tier 3; data model approved).
 */

const KIND: Record<RequestKind, string> = {
  ORDER: 'Order', APPOINTMENT: 'Appointment', RETURN: 'Return', HOSTEL_VISIT: 'Hostel visit', REFILL: 'Refill', SUPPORT: 'Support',
};
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const clock = (s: number) => new Date(s * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export interface RequestsLinks {
  newReturn: () => void;
  newHostelVisit: () => void;
  newRefill: () => void;
}

function Detail({ item }: { item: RequestItem }) {
  const d = item.detail;
  if (!d) return null;
  return (
    <>
      {item.kind === 'RETURN' && d.refundStatus === 'TO_ARRANGE' && d.refundPaise ? (
        <Text style={styles.meta}>Refund of {rupees(d.refundPaise)} is arranged with the partner — Studentkare doesn’t move the money.</Text>
      ) : null}
      {item.kind === 'HOSTEL_VISIT' && d.windowStart && d.windowEnd ? (
        <Text style={styles.meta}>{d.hostelBlock} · Room {d.room} · {when(d.windowStart)}, {clock(d.windowStart)}–{clock(d.windowEnd)}</Text>
      ) : null}
      {item.kind === 'REFILL' && d.pharmacy ? <Text style={styles.meta}>{d.pharmacy} · Quantity {d.quantity}</Text> : null}
      {d.decisionNote ? <Text style={styles.meta}>Their note: {d.decisionNote}</Text> : null}
    </>
  );
}

export const MyRequestsView = observer(function MyRequestsView({ viewModel: vm, links }: { viewModel: MyRequestsViewModel; links: RequestsLinks }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Your requests</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Everything you’ve asked for</Text>
      <View style={styles.actions}>
        <Button label="Return an item" variant="secondary" onPress={links.newReturn} />
        <Button label="Hostel room visit" variant="secondary" onPress={links.newHostelVisit} />
        <Button label="Refill a medicine" variant="secondary" onPress={links.newRefill} />
      </View>
      {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
      {vm.items === null && !vm.loadFailed ? <Skeleton label="Loading your requests" lines={['100%', '80%', '100%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title="Couldn't load your requests" body="This is on our side, not yours. Try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}
      {vm.items && vm.items.length === 0 ? <EmptyState title="No requests yet" body="Orders, appointments, returns, visits and refills you make show up here." /> : null}
      {vm.items?.map((item) => (
        <Card key={`${item.kind}-${item.id}`}>
          <Text style={styles.kind}>{KIND[item.kind].toUpperCase()} · {when(item.createdAt)}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.status}>{statusLabel(item)}</Text>
          <Detail item={item} />
          {canCancel(item) ? <Button label="Cancel this request" variant="ghost" busy={vm.busyId === item.id} onPress={() => void vm.cancel(item)} /> : null}
        </Card>
      ))}
    </ScrollView>
  );
});

const REASONS: ReadonlyArray<{ value: ReturnReason; label: string }> = [
  { value: 'WRONG_ITEM', label: 'Wrong item' },
  { value: 'DAMAGED', label: 'Damaged or seal broken' },
  { value: 'NOT_NEEDED', label: 'Don’t need it any more' },
  { value: 'OTHER', label: 'Something else' },
];
const SERVICES: ReadonlyArray<{ value: VisitService; label: string }> = [
  { value: 'LAB_PICKUP', label: 'Lab sample pickup' },
  { value: 'NURSE_VISIT', label: 'Nurse visit' },
];
const HOURS: ReadonlyArray<{ value: '1' | '2' | '3'; label: string }> = [
  { value: '1', label: '1 hour' }, { value: '2', label: '2 hours' }, { value: '3', label: '3 hours' },
];
const TITLE = { RETURN: 'Return or refund', HOSTEL_VISIT: 'Hostel room visit', REFILL: 'Refill a medicine' } as const;

export interface NewRequestLinks {
  done: () => void;
  /** Web only: attach a photo to the return just created. */
  attachReturnPhoto?: (returnId: string) => Promise<void>;
}

export const NewRequestView = observer(function NewRequestView({ viewModel: vm, links }: { viewModel: NewRequestViewModel; links: NewRequestLinks }) {
  const o = vm.options;
  const [photoNote, setPhotoNote] = useState('');

  if (vm.done) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Note tone="positive" title="Request sent">You’ll see updates in My requests and get a notification when it changes.</Note>
        {vm.kind === 'RETURN' && vm.createdReturnId && links.attachReturnPhoto ? (
          <Button label="Add a photo (helps the partner decide)" variant="secondary" fullWidth onPress={() => {
            links.attachReturnPhoto?.(vm.createdReturnId).then(() => setPhotoNote('Photo added.'), () => setPhotoNote("The photo wasn't added. Use a PNG or JPEG up to 5 MB."));
          }} />
        ) : null}
        {photoNote ? <Text style={styles.meta}>{photoNote}</Text> : null}
        <Button label="Back to My requests" fullWidth onPress={links.done} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>New request</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{TITLE[vm.kind]}</Text>
      {!o && !vm.loadFailed ? <Skeleton label="Loading" lines={['100%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title="Couldn't load this" body="This is on our side, not yours. Try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}

      {o && vm.kind === 'RETURN' ? (
        o.lines.length === 0 ? (
          <EmptyState title="Nothing to return" body="Items can be returned once they’ve been dispatched or delivered." />
        ) : (
          <Card>
            <RadioGroup label="Which item?" options={o.lines.map((l) => ({ value: l.orderLineId, label: `${l.item} · ${rupees(l.pricePaise)}` }))}
              value={vm.orderLineId} onChange={(v) => vm.set('orderLineId', v)} />
            <RadioGroup label="What’s wrong?" options={REASONS} value={vm.reason} onChange={(v) => vm.set('reason', v)} />
            <TextField label={vm.reason === 'OTHER' ? 'Tell us what’s wrong' : 'Anything else? (optional)'} value={vm.note} onChangeText={(t) => vm.set('note', t)} maxLength={500} />
            <Text style={styles.meta}>If approved, the refund is arranged with the partner and goes back the way you paid. Studentkare doesn’t hold or move the money.</Text>
          </Card>
        )
      ) : null}

      {o && vm.kind === 'HOSTEL_VISIT' ? (
        <Card>
          <RadioGroup label="What do you need?" options={SERVICES} value={vm.service} onChange={(v) => vm.set('service', v)} />
          <TextField label="Hostel block" value={vm.hostelBlock} onChangeText={(t) => vm.set('hostelBlock', t)} maxLength={80} />
          <TextField label="Room" value={vm.room} onChangeText={(t) => vm.set('room', t)} maxLength={40} />
          <TextField label="Date (YYYY-MM-DD)" mono value={vm.date} onChangeText={(t) => vm.set('date', t.trim())} maxLength={10} />
          <TextField label="From (24-hour, e.g. 08:30)" mono value={vm.startTime} onChangeText={(t) => vm.set('startTime', t.trim())} maxLength={5} />
          <RadioGroup label="For how long?" options={HOURS} value={vm.hours} onChange={(v) => vm.set('hours', v)} />
          {vm.date && vm.startTime && vm.hours && !vm.window ? <Text style={styles.warn}>Choose a real date and time from now onwards.</Text> : null}
          <Text style={styles.meta}>A partner takes the request and comes in your window. Your room number is shared only with them.</Text>
        </Card>
      ) : null}

      {o && vm.kind === 'REFILL' ? (
        o.plans.length === 0 ? (
          <EmptyState title="No medicines to refill" body="Add a medicine to your plan first, then request a refill here." />
        ) : o.pharmacies.length === 0 ? (
          <EmptyState title="No pharmacy partners yet" body="No partner lists medicines right now, so a refill can’t be sent." />
        ) : (
          <Card>
            <RadioGroup label="Which medicine?" options={o.plans.map((p) => ({ value: p.id, label: p.dosage ? `${p.name} · ${p.dosage}` : p.name }))}
              value={vm.planId} onChange={(v) => vm.set('planId', v)} />
            <RadioGroup label="Which pharmacy?" options={o.pharmacies.map((p) => ({ value: p.id, label: p.name }))}
              value={vm.providerId} onChange={(v) => vm.set('providerId', v)} />
            <TextField label="Quantity (packs, 1–12)" value={vm.quantity} onChangeText={(t) => vm.set('quantity', t.replace(/\D/g, ''))} keyboardType="numeric" maxLength={2} />
            <TextField label="Note for the pharmacist (optional)" value={vm.note} onChangeText={(t) => vm.set('note', t)} maxLength={500} />
            <Text style={styles.meta}>Notifications about this refill never name the medicine.</Text>
          </Card>
        )
      ) : null}

      {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
      {o ? <Button label="Send request" size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} onPress={() => void vm.submit()} /> : null}
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
