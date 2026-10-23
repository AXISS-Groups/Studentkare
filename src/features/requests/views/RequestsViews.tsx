import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Note, RadioGroup, Sheet, Skeleton, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardRow, BoardScreen, BoardSection, ChoiceCard, Pill, TextLink, boardText } from '@/design-system/board/BoardKit';
import type { BoardTone } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { MyRequestsViewModel, NewRequestViewModel, canCancel, statusLabel } from '../viewmodel/RequestsViewModel';
import type { RequestItem, ReturnReason, VisitService } from '../viewmodel/RequestsViewModel';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/**
 * My requests, Return or refund, Hostel room visit, Refill request — one
 * source for web and native (design page 2: MyRequests, HostelVisit; Tier 2).
 * The view models are unchanged; these are their boards.
 */

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const clock = (s: number) => new Date(s * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

type PressState = { pressed: boolean; focused?: boolean };

export interface RequestsLinks {
  newReturn: () => void;
  newHostelVisit: () => void;
  newRefill: () => void;
  back?: () => void;
  /** Emergencies are never a request: the board's "112" opens SOS. */
  crisis?: () => void;
}

const DONE = new Set(['COMPLETED', 'RESOLVED', 'PICKED_UP', 'READY', 'DISPATCHED']);
const STOPPED = new Set(['DECLINED', 'CANCELLED']);

function toneOf(status: string): BoardTone {
  if (DONE.has(status)) return 'positive';
  if (STOPPED.has(status)) return 'neutral';
  return 'action';
}

function Detail({ item }: { item: RequestItem }) {
  const t = useT();
  const d = item.detail;
  if (!d) return null;
  return (
    <>
      {item.kind === 'RETURN' && d.refundStatus === 'TO_ARRANGE' && d.refundPaise ? (
        <Text style={boardText.body}>{t('req.refund', { amount: rupees(d.refundPaise) })}</Text>
      ) : null}
      {item.kind === 'HOSTEL_VISIT' && d.windowStart && d.windowEnd ? (
        <Text style={boardText.body}>{t('req.visitLine', { block: d.hostelBlock ?? '', room: d.room ?? '', date: when(d.windowStart), from: clock(d.windowStart), to: clock(d.windowEnd) })}</Text>
      ) : null}
      {item.kind === 'REFILL' && d.pharmacy ? <Text style={boardText.body}>{t('req.refillLine', { pharmacy: d.pharmacy, quantity: d.quantity ?? '' })}</Text> : null}
      {d.decisionNote ? <Text style={boardText.body}>{t('sos.theirNote', { note: d.decisionNote })}</Text> : null}
    </>
  );
}

export const MyRequestsView = observer(function MyRequestsView({ viewModel: vm, links }: { viewModel: MyRequestsViewModel; links: RequestsLinks }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const pick = (go: () => void) => { setChoosing(false); go(); };
  return (
    <BoardScreen testID="my-requests">
      <BoardHeader
        title={t('pb.req.title')}
        backIcon="chevron-left"
        backLabel={t('common.back')}
        onBack={links.back}
        trailingKey="new"
        trailing={<Button label={t('pb.req.new')} onPress={() => setChoosing(true)} testID="my-requests-new" />}
      />
      <Text style={boardText.body}>
        {t('pb.req.intro')}
        {links.crisis ? <Text accessibilityRole="link" onPress={links.crisis} style={styles.emergency}>{` ${t('pb.req.emergency')}`}</Text> : null}
      </Text>

      {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
      {vm.items === null && !vm.loadFailed ? <Skeleton label={t('req.loading')} lines={['100%', '80%', '100%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('req.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
      {vm.items && vm.items.length === 0 ? <EmptyState title={t('req.emptyTitle')} body={t('req.emptyBody')} action={{ label: t('pb.req.new'), onPress: () => setChoosing(true) }} /> : null}

      {vm.items?.map((item) => {
        const key = `${item.kind}-${item.id}`;
        const expanded = open === key;
        return (
          <View key={key} style={[styles.card, expanded ? styles.cardOpen : null]} testID={`request-${key}`}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              aria-expanded={expanded}
              accessibilityLabel={`${item.title}, ${statusLabel(item, t)}`}
              onPress={() => setOpen(expanded ? null : key)}
              style={({ focused }: PressState) => [styles.cardHead, focused ? focusRing : null]}
            >
              <View style={styles.flex}>
                <Text style={styles.ref}>{`${t(`req.kind.${item.kind}` as MessageKey).toUpperCase()} · ${when(item.createdAt)}`}</Text>
                <Text style={boardText.strong}>{item.title}</Text>
              </View>
              <Pill label={statusLabel(item, t)} tone={toneOf(item.status)} />
            </Pressable>
            {expanded ? (
              <View style={styles.detail}>
                <Detail item={item} />
                {canCancel(item) ? <TextLink label={t('req.cancel')} tone="danger" onPress={() => void vm.cancel(item)} /> : null}
                {vm.busyId === item.id ? <Text style={boardText.meta}>{t('common.loading')}</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <Sheet visible={choosing} title={t('pb.req.newTitle')} onClose={() => setChoosing(false)}>
        <View style={styles.choices}>
          <BoardRow title={t('req.newVisit')} meta={t('pb.req.visitMeta')} onPress={() => pick(links.newHostelVisit)} />
          <BoardRow title={t('req.newReturn')} meta={t('pb.req.returnMeta')} onPress={() => pick(links.newReturn)} />
          <BoardRow title={t('req.newRefill')} meta={t('pb.req.refillMeta')} onPress={() => pick(links.newRefill)} />
        </View>
      </Sheet>
    </BoardScreen>
  );
});

const REASONS: readonly ReturnReason[] = ['WRONG_ITEM', 'DAMAGED', 'NOT_NEEDED', 'OTHER'];
const SERVICES: readonly VisitService[] = ['NURSE_VISIT', 'LAB_PICKUP'];
const HOURS = ['1', '2', '3'] as const;

export interface NewRequestLinks {
  done: () => void;
  back?: () => void;
  crisis?: () => void;
  /** Web only: attach a photo to the return just created. */
  attachReturnPhoto?: (returnId: string) => Promise<void>;
}

/** Hostel room visit (canvas HostelVisit): what's going on and where, then when, then send. */
const HostelVisitSteps = observer(function HostelVisitSteps({ vm, links, step, setStep }: { vm: NewRequestViewModel; links: NewRequestLinks; step: 1 | 2; setStep: (s: 1 | 2) => void }) {
  const t = useT();
  return (
    <>
      {links.crisis ? (
        <Pressable accessibilityRole="link" accessibilityLabel={t('pb.visit.crisisSpoken')} onPress={links.crisis} testID="hostel-visit-crisis"
          style={({ focused }: PressState) => [styles.crisis, focused ? focusRing : null]}>
          <Icon name="alert-circle" size={size.navIcon} color={color.danger} />
          <Text style={[styles.crisisText, styles.flex]}>{t('pb.visit.crisis')}</Text>
          <Icon name="phone" size={size.navIcon} color={color.danger} />
        </Pressable>
      ) : null}

      {step === 1 ? (
        <>
          <BoardSection label={t('pb.visit.what')}>
            {SERVICES.map((sv) => (
              <ChoiceCard key={sv} testID={`hostel-visit-${sv}`} title={t(`req.service.${sv}` as MessageKey)} meta={t(`pb.visit.${sv}` as MessageKey)}
                selected={vm.service === sv} onPress={() => vm.set('service', sv)} />
            ))}
          </BoardSection>
          <BoardSection label={t('pb.visit.where')}>
            <View style={styles.whereCard}>
              <View style={styles.whereHead}>
                <Icon name="pin" size={size.navIcon} color={color.action} />
                <Text style={[boardText.strong, styles.flex]}>{vm.hostelBlock && vm.room ? t('pb.visit.blockRoom', { block: vm.hostelBlock, room: vm.room }) : t('pb.visit.whereEmpty')}</Text>
              </View>
              <TextField label={t('req.block')} value={vm.hostelBlock} onChangeText={(v) => vm.set('hostelBlock', v)} maxLength={80} />
              <TextField label={t('req.room')} value={vm.room} onChangeText={(v) => vm.set('room', v)} maxLength={40} />
              <Text style={boardText.meta}>{t('req.visitNote')}</Text>
            </View>
          </BoardSection>
        </>
      ) : (
        <>
          <BoardSection label={t('pb.visit.when')}>
            <Card>
              <TextField label={t('req.date')} mono value={vm.date} onChangeText={(v) => vm.set('date', v.trim())} maxLength={10} />
              <TextField label={t('req.from')} mono value={vm.startTime} onChangeText={(v) => vm.set('startTime', v.trim())} maxLength={5} />
              <RadioGroup label={t('req.howLong')} options={HOURS.map((h) => ({ value: h, label: h === '1' ? t('req.hour1') : t('req.hoursN', { count: h }) }))} value={vm.hours} onChange={(v) => vm.set('hours', v)} />
              {vm.date && vm.startTime && vm.hours && !vm.window ? <Text style={styles.warn}>{t('req.badWindow')}</Text> : null}
            </Card>
          </BoardSection>
          <TextLink label={t('pb.visit.backToStep1')} onPress={() => setStep(1)} />
        </>
      )}
    </>
  );
});

export const NewRequestView = observer(function NewRequestView({ viewModel: vm, links }: { viewModel: NewRequestViewModel; links: NewRequestLinks }) {
  const o = vm.options;
  const t = useT();
  const [photoNote, setPhotoNote] = useState<MessageKey | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const visit = vm.kind === 'HOSTEL_VISIT';
  const stepOneDone = Boolean(vm.service && vm.hostelBlock.trim() && vm.room.trim());
  const header = (
    <BoardHeader
      title={visit ? t('pb.visit.title') : t(`req.form.${vm.kind}` as MessageKey)}
      backIcon="arrow-left"
      backLabel={t('common.back')}
      onBack={links.back}
      trailingKey={visit && !vm.done ? `step-${step}` : ''}
      trailing={visit && !vm.done ? <Text style={styles.step}>{t('pb.visit.step', { step, total: 2 })}</Text> : null}
    />
  );

  if (vm.done) {
    return (
      <BoardScreen testID="new-request-done">
        {header}
        <Note tone="positive" title={t('req.sentTitle')}>{t('req.sentBody')}</Note>
        {vm.kind === 'RETURN' && vm.createdReturnId && links.attachReturnPhoto ? (
          <Button label={t('req.addPhoto')} variant="secondary" fullWidth onPress={() => {
            links.attachReturnPhoto?.(vm.createdReturnId).then(() => setPhotoNote('req.photoAdded'), () => setPhotoNote('req.photoFailed'));
          }} />
        ) : null}
        {photoNote ? <Text style={boardText.body}>{t(photoNote)}</Text> : null}
        <Button label={t('req.backToList')} fullWidth onPress={links.done} />
      </BoardScreen>
    );
  }

  const footer = o ? (
    visit && step === 1 ? (
      <Button label={t('pb.visit.continue')} size="cta" fullWidth disabled={!stepOneDone} onPress={() => setStep(2)} testID="hostel-visit-continue" />
    ) : (
      <Button label={t('req.send')} size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} onPress={() => void vm.submit()} />
    )
  ) : null;

  return (
    <BoardScreen testID={visit ? 'hostel-visit' : 'new-request'}>
      {header}
      {!o && !vm.loadFailed ? <Skeleton label={t('common.loading')} lines={['100%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {o && visit ? <HostelVisitSteps vm={vm} links={links} step={step} setStep={setStep} /> : null}

      {o && vm.kind === 'RETURN' ? (
        o.lines.length === 0 ? (
          <EmptyState title={t('req.nothingReturnTitle')} body={t('req.nothingReturnBody')} />
        ) : (
          <Card>
            <RadioGroup label={t('req.whichItem')} options={o.lines.map((l) => ({ value: l.orderLineId, label: `${l.item} · ${rupees(l.pricePaise)}` }))}
              value={vm.orderLineId} onChange={(v) => vm.set('orderLineId', v)} />
            <RadioGroup label={t('req.whatsWrong')} options={REASONS.map((r) => ({ value: r, label: t(`req.reason.${r}` as MessageKey) }))} value={vm.reason} onChange={(v) => vm.set('reason', v)} />
            <TextField label={vm.reason === 'OTHER' ? t('req.tellUs') : t('req.anythingElse')} value={vm.note} onChangeText={(v) => vm.set('note', v)} maxLength={500} />
            <Text style={boardText.body}>{t('req.refundNote')}</Text>
          </Card>
        )
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
            <Text style={boardText.body}>{t('req.refillPrivacy')}</Text>
          </Card>
        )
      ) : null}

      {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
      {footer}
    </BoardScreen>
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
  flex: { flex: 1, minWidth: 0, gap: space.s2 },
  emergency: { fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, overflow: 'hidden' },
  cardOpen: { borderColor: color.selectedRule, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, padding: space.s16, minHeight: size.touchTarget },
  ref: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text3 },
  detail: { gap: space.s8, paddingHorizontal: space.s16, paddingBottom: space.s16, borderTopWidth: 1, borderTopColor: color.ruleSoft, paddingTop: space.s12 },
  choices: { gap: space.s10 },
  crisis: { flexDirection: 'row', alignItems: 'center', gap: space.s10, backgroundColor: color.dangerBg, borderRadius: radius.xl, padding: space.s14, minHeight: size.touchTarget },
  crisisText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  whereCard: { gap: space.s12, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16 },
  whereHead: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  step: { fontFamily: font.family.mono, fontSize: font.size.bodySm, color: color.text2 },
  warn: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.danger },
});
