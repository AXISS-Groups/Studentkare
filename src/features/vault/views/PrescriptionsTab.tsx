import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorState, Sheet, Skeleton, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { GlossTile, M2Card, M2EmptyState, M2HeroPanel, M2Heading, M2Note, M2Pill, M2Table, m2TableText, m2Text, useM2Layout } from '@/design-system/m2';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import { displayDate } from '@/data/types/workflowTypes';
import { useT, type MessageKey, type Vars } from '@/i18n';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { awaitsLabPayment } from '@/features/labBooking/views/labPaymentState';

interface PrescriptionItem {
  id: string; genericName: string; brandName: string; strength: string; dose: string;
  frequency: string; durationDays: number; quantity: number; scheduleClass: string;
}
export interface Prescription {
  id: string; issuedAt: number; validUntil: number; status: string; advice: string;
  prescriberRegNo: string; items: PrescriptionItem[];
  allergyCheck: { conflicts?: Array<{ substance: string; flag: string }>; acknowledged?: boolean };
}
export interface LabOrder {
  id: string; testPanel: string[]; status: string; sampleId: string; collectorName: string;
  fastingRequired: boolean; collectionMode: string; criticalFlag: boolean;
  rejectionReason: string; createdAt: number; reviewNote: string;
  /** The chosen collection time (ISO), or empty when none has been chosen. */
  slotStart?: string;
  /** The ordering doctor's name; empty for a test the student booked themselves. */
  orderedByDoctor?: string;
  /** A self-booked test's payment (null for a doctor-ordered one). */
  paymentStatus?: string | null;
}

/** The two reads the Prescriptions tab makes (the same pages the older panel read). */
const PRESCRIPTIONS_PATH = '/prescriptions?limit=20';
const LAB_ORDERS_PATH = '/lab-orders?limit=20';

const LAB_PROGRESS = ['BOOKED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY', 'REPORT_RELEASED'];
/** Statuses with a translation. Anything else the server sends is shown readably, in English. */
const TRANSLATED_STATUS = new Set(['ISSUED', ...LAB_PROGRESS]);

function statusLabel(status: string, t: (key: MessageKey, vars?: Vars) => string): string {
  if (TRANSLATED_STATUS.has(status)) return t(`care.rx.status.${status}` as MessageKey);
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

const prescriptionExpired = (prescription: Prescription, now: number = Date.now()): boolean => prescription.validUntil > 0 && prescription.validUntil * 1000 < now;

export interface PrescriptionsTabLinks {
  /** Choose or change a doctor-ordered test's collection time (the web's slot picker). Omitted: no time can be chosen here. */
  chooseTime?: (order: LabOrder) => void;
}

/**
 * The vault's Prescriptions tab (Tier 1 parity plan 2026-10-24 §7, Q4; design
 * boards T1Prescriptions / T1PrescriptionsDesktop approved 24 Oct 2026): the
 * two sections the older panel drew, together. E-prescriptions
 * (GET /prescriptions: ref, medicines, issued, prescriber reg. no., valid
 * until, status or expired, the items, advice, the allergy conflict line,
 * Send to pharmacy, POST /dispenses by pharmacy id) and tests your doctor
 * ordered (GET /lab-orders: status, slot, fasting, collector, Choose / Change
 * time, sample rejected, awaiting review, released with the review note).
 *
 * The allergy line stays `danger` (a server-flagged alert) above the actions
 * at every width. No price or product appears here (Rule L).
 */
export function PrescriptionsTab({ online, links, art, reloadKey = 0, directory }: {
  online: boolean;
  links: PrescriptionsTabLinks;
  /** The hero's art (canvas `image-a3e6ba.png`), decorative. */
  art?: ArtSource;
  /** Bump to read both lists again (after a time was chosen). */
  reloadKey?: number;
  /** Web only: the pharmacy and lab directories under the sections, where a pharmacy's identifier is found. */
  directory?: { pharmacies?: React.ReactNode; labs?: React.ReactNode };
}) {
  const t = useT();
  const layout = useM2Layout();
  const prescriptions = useApiResource<{ items: Prescription[]; total: number }>(PRESCRIPTIONS_PATH);
  const labOrders = useApiResource<{ items: LabOrder[]; total: number }>(LAB_ORDERS_PATH);
  const [sending, setSending] = useState<Prescription | null>(null);
  const reloadRx = prescriptions.reload;
  const reloadLabs = labOrders.reload;
  useEffect(() => { if (reloadKey > 0) { reloadRx(); reloadLabs(); } }, [reloadKey, reloadRx, reloadLabs]);

  const rxSection = (
    <View style={styles.stack} testID="vault-rx-section">
      <M2HeroPanel hue="green" icon="file-text" eyebrow={t('care.rx.eyebrow')} title={t('care.rx.title')} sub={t('care.rx.intro')} art={art} testID="vault-rx-hero" />
      {prescriptions.loading ? <Skeleton label={t('care.rx.title')} lines={['50%', '100%', '100%']} /> : null}
      {prescriptions.error ? <ErrorState title={t('care.rx.emptyTitle')} body={t('swt.vault.errorBody')} retryLabel={t('common.tryAgain')} onRetry={prescriptions.reload} /> : null}
      {prescriptions.data && prescriptions.data.items.length === 0 ? (
        <M2EmptyState animation="anim-file-text" hue="green" title={t('care.rx.emptyTitle')} body={t('care.rx.emptyBody')} testID="vault-rx-empty" />
      ) : null}
      {prescriptions.data?.items.map((rx) => (
        <PrescriptionCard key={rx.id} rx={rx} online={online} onSend={() => setSending(rx)} />
      ))}
      {directory?.pharmacies ?? null}
    </View>
  );

  const labSection = (
    <View style={styles.stack} testID="vault-lab-section">
      <View style={styles.sectionHead}>
        <GlossTile icon="flask" hue="violet" size={44} iconSize={22} />
        <View style={styles.sectionWords}>
          <Text style={m2Text.eyebrow}>{t('care.rx.testsEyebrow')}</Text>
          <M2Heading style={m2Text.section}>{t('care.rx.labTitle')}</M2Heading>
        </View>
      </View>
      {labOrders.loading ? <Skeleton label={t('care.rx.labTitle')} lines={['50%', '100%', '100%']} /> : null}
      {labOrders.error ? <ErrorState title={t('care.rx.testsEmptyTitle')} body={t('swt.vault.errorBody')} retryLabel={t('common.tryAgain')} onRetry={labOrders.reload} /> : null}
      {labOrders.data && labOrders.data.items.length === 0 ? (
        <M2EmptyState animation="anim-file" hue="violet" title={t('care.rx.testsEmptyTitle')} body={t('care.rx.testsEmptyBody')} testID="vault-lab-empty" />
      ) : null}
      {labOrders.data?.items.map((order) => <LabOrderCard key={order.id} order={order} online={online} chooseTime={links.chooseTime} />)}
      {directory?.labs ?? null}
    </View>
  );

  return (
    <View style={styles.stack} testID="vault-prescriptions">
      {layout === 'desktop' ? (
        <View style={styles.columns}>
          <View style={styles.colRx}>{rxSection}</View>
          <View style={styles.colLab}>{labSection}</View>
        </View>
      ) : (
        <>
          {rxSection}
          {labSection}
        </>
      )}
      <M2Note tone="neutral" icon="hospital">{t('care.rx.sendIntro')}</M2Note>
      <SendSheet rx={sending} onClose={() => setSending(null)} onSent={() => { setSending(null); prescriptions.reload(); }} />
    </View>
  );
}

function PrescriptionCard({ rx, online, onSend }: { rx: Prescription; online: boolean; onSend: () => void }) {
  const t = useT();
  const expired = prescriptionExpired(rx);
  const ref = rx.id.slice(0, 8).toUpperCase();
  const meta = [
    t('care.rx.issued', { date: displayDate(new Date(rx.issuedAt * 1000).toISOString()) }),
    rx.prescriberRegNo ? t('care.rx.reg', { reg: rx.prescriberRegNo }) : '',
    rx.validUntil ? t('care.rx.validUntil', { date: displayDate(new Date(rx.validUntil * 1000).toISOString()) }) : '',
  ].filter(Boolean).join(' · ');
  const conflicts = rx.allergyCheck?.conflicts ?? [];
  return (
    <M2Card style={styles.card} testID={`vault-rx-${rx.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.sectionWords}>
          <Text style={m2Text.eyebrow}>{t('care.rx.ref', { ref })}</Text>
          <M2Heading style={m2Text.cardTitle}>{t('care.rx.medicineCount', { count: rx.items.length })}</M2Heading>
          <Text style={m2Text.meta}>{meta}</Text>
        </View>
        <M2Pill label={expired ? t('care.rx.expired') : statusLabel(rx.status, t)} tone={expired ? 'neutral' : 'positive'} testID={`vault-rx-${rx.id}-status`} />
      </View>
      <M2Table<PrescriptionItem>
        rows={rx.items}
        rowKey={(item) => item.id}
        label={t('care.rx.medicineCount', { count: rx.items.length })}
        testID={`vault-rx-${rx.id}-items`}
        columns={[
          { key: 'medicine', header: t('care.rx.col.medicine'), flex: 2, cell: (item) => <Text style={m2TableText.strong}>{`${item.genericName}${item.brandName ? ` (${item.brandName})` : ''} ${item.strength}`.trim()}</Text> },
          { key: 'dose', header: t('care.rx.col.dose'), cell: (item) => <Text style={m2TableText.cell}>{item.dose || '—'}</Text> },
          { key: 'howOften', header: t('care.rx.col.howOften'), cell: (item) => <Text style={m2TableText.cell}>{item.frequency || '—'}</Text> },
          { key: 'days', header: t('care.rx.col.days'), width: 44, cell: (item) => <Text style={m2TableText.cell}>{item.durationDays || '—'}</Text> },
          { key: 'qty', header: t('care.rx.col.qty'), width: 40, cell: (item) => <Text style={m2TableText.cell}>{item.quantity}</Text> },
        ]}
      />
      {rx.advice ? <Text style={m2Text.body}>{t('care.rx.advice', { advice: rx.advice })}</Text> : null}
      {/* Surfaced to the student too: a server-flagged alert, red, above the actions at every width. */}
      {conflicts.length ? (
        <View role="alert" accessibilityRole="alert" style={styles.allergy} testID={`vault-rx-${rx.id}-allergy`}>
          <Icon name="alert-triangle" size={16} color={color.danger} strokeWidth={2.2} />
          <Text style={styles.allergyText}>{t('care.rx.allergy', { substances: conflicts.map((c) => c.substance).join(', ') })}</Text>
        </View>
      ) : null}
      {expired ? null : (
        <View style={styles.actions}>
          <Button label={t('care.rx.send')} accessibilityLabel={t('care.rx.sendSpoken', { ref: rx.id.slice(0, 8) })} disabled={!online} onPress={onSend}
            icon={<Icon name="arrow-right" size={16} color={online ? color.onAction : color.text2} strokeWidth={2.4} />} testID={`vault-rx-${rx.id}-send`} />
          {!online ? <Text style={m2Text.meta}>{t('m2v.up.needsConnection')}</Text> : null}
        </View>
      )}
    </M2Card>
  );
}

function LabOrderCard({ order, online, chooseTime }: { order: LabOrder; online: boolean; chooseTime?: (order: LabOrder) => void }) {
  const t = useT();
  const unpaid = awaitsLabPayment(order);
  const status = unpaid ? t('care.rx.status.AWAITING_PAYMENT') : statusLabel(order.status, t);
  const name = order.testPanel.join(', ');
  const meta = [
    t('care.rx.bookingRef', { ref: order.id.slice(0, 8).toUpperCase() }),
    t('care.rx.booked', { date: displayDate(new Date(order.createdAt * 1000).toISOString()) }),
    order.orderedByDoctor ? t('care.rx.orderedBy', { name: order.orderedByDoctor }) : '',
    order.fastingRequired ? t('care.rx.fasting') : '',
    order.collectorName ? t('care.rx.collector', { name: order.collectorName }) : '',
  ].filter(Boolean).join(' · ');
  const canPick = Boolean(order.orderedByDoctor && order.status === 'BOOKED' && chooseTime);
  return (
    <M2Card style={styles.card} testID={`vault-lab-${order.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.sectionWords}>
          <M2Heading style={m2Text.cardTitle}>{name}</M2Heading>
          <Text style={m2Text.meta}>{meta}</Text>
        </View>
        <M2Pill label={status} tone={unpaid ? 'attention' : order.status === 'REPORT_RELEASED' ? 'positive' : 'action'} testID={`vault-lab-${order.id}-status`} />
      </View>
      {unpaid ? <Text style={m2Text.body}>{t('care.rx.awaitingPayment')}</Text> : null}
      {order.slotStart || canPick ? <Text style={m2Text.meta}>{t('care.rx.slot', { time: order.slotStart ? displayDate(order.slotStart) : '—' })}</Text> : null}
      {canPick ? (
        <View style={styles.actions}>
          <Button label={order.slotStart ? t('care.rx.changeTime') : t('care.rx.chooseTime')} variant={order.slotStart ? 'secondary' : 'primary'} disabled={!online}
            accessibilityLabel={t(order.slotStart ? 'care.rx.changeTimeSpoken' : 'care.rx.chooseTimeSpoken', { test: name })}
            icon={<Icon name="calendar" size={16} color={order.slotStart || !online ? color.action : color.onAction} strokeWidth={2.2} />}
            onPress={() => chooseTime?.(order)} testID={`vault-lab-${order.id}-time`} />
          {!online ? <Text style={m2Text.meta}>{t('m2v.up.needsConnection')}</Text> : null}
        </View>
      ) : null}
      {order.rejectionReason ? <M2Note tone="attention" icon="alert-triangle" announce testID={`vault-lab-${order.id}-rejected`}>{t('care.rx.sampleRejected', { reason: order.rejectionReason })}</M2Note> : null}
      {order.status === 'REPORT_READY' ? <Text style={m2Text.body}>{t('care.rx.awaitingReview')}</Text> : null}
      {order.status === 'REPORT_RELEASED' ? <Text style={m2Text.body}>{t('care.rx.reportReleased')}</Text> : null}
      {order.status === 'REPORT_RELEASED' && order.reviewNote ? <M2Note tone="info" icon="stethoscope" testID={`vault-lab-${order.id}-note`}>{t('care.rx.reviewNote', { note: order.reviewNote })}</M2Note> : null}
    </M2Card>
  );
}

/** Send to a pharmacy: the same id field and POST /dispenses body as the older panel, in the shared Sheet. */
function SendSheet({ rx, onClose, onSent }: { rx: Prescription | null; onClose: () => void; onSent: () => void }) {
  const t = useT();
  const [pharmacyId, setPharmacyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => { if (busy) return; setPharmacyId(''); setError(''); onClose(); };
  const submit = async () => {
    if (!rx || !pharmacyId.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/dispenses', { method: 'POST', body: JSON.stringify({ prescriptionId: rx.id, pharmacyId: pharmacyId.trim() }) });
      setPharmacyId('');
      onSent();
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('swt.vault.errorBody'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={rx !== null} title={t('care.rx.send')} subtitle={t('care.rx.sendIntro')} onClose={close} busy={busy} testID="vault-rx-send-sheet">
      <View style={styles.form}>
        <TextField label={t('care.rx.pharmacyId')} value={pharmacyId} onChangeText={setPharmacyId} maxLength={80} error={error || undefined} testID="vault-rx-pharmacy-id" />
        <Button label={busy ? t('care.rx.sending') : t('care.rx.sendPrescription')} busy={busy} disabled={!pharmacyId.trim()} onPress={() => void submit()} fullWidth testID="vault-rx-send-confirm" />
        <Button label={t('common.cancel')} variant="ghost" disabled={busy} onPress={close} fullWidth />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.s12 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s24 },
  colRx: { flex: 1.25, minWidth: 0 },
  colLab: { flex: 1, minWidth: 0 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  sectionWords: { flex: 1, minWidth: 0, gap: space.s2 },
  card: { padding: space.s16, gap: space.s12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10 },
  allergy: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  allergyText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  actions: { gap: space.s6, alignItems: 'flex-start' },
  form: { gap: space.s12 },
});
