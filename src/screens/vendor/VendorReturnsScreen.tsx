import React, { useCallback, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import { Overlay } from '@/design-system/overlays/Overlay';
import { FormField } from '@/design-system/feedback/FormField';
import { SkButton, Toast } from '@/design-system/primitives';
import type { SkTone } from '@/design-system/primitives';
import { apiBaseUrl } from '@/core/env';
import { money } from '@/data/types/workflowTypes';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { decideReturn, loadReturns, markReturnPickedUp } from '@/features/partner/partnerApi';
import type { PartnerReturn } from '@/features/partner/partnerApi';
import { PARTNER_EMPTY_TILE, shortRef, usePartnerLoad } from '@/features/partner/PartnerPage';

/**
 * VendorReturns — returns for items this partner supplied (design page 6, Tier 3).
 *
 * Wired to `GET /work/returns` (the server lists only this partner's) with the
 * existing decisions: approve with a refund up to what was paid, decline with
 * a reason the student sees, and mark an approved return picked up. The
 * student's name comes back from the server but is not shown: the board needs
 * only the order and the item. "Return rate" has no source (no order total is
 * reported against returns), so it reads "—".
 *
 * Hostel visits and refills, which used to share this page, stay below the
 * table (`liveRequests`) so nothing a partner could do here is lost.
 */

export type ReturnsSource = (signal: AbortSignal) => Promise<{ items: PartnerReturn[] }>;

const OUTCOME: Record<string, { key: MessageKey; tone: SkTone }> = {
  REQUESTED: { key: 'pc.ret.outcome.REQUESTED', tone: 'attention' },
  APPROVED: { key: 'pc.ret.outcome.APPROVED', tone: 'positive' },
  PICKED_UP: { key: 'pc.ret.outcome.PICKED_UP', tone: 'positive' },
  DECLINED: { key: 'pc.ret.outcome.DECLINED', tone: 'attention' },
  CANCELLED: { key: 'pc.ret.outcome.CANCELLED', tone: 'neutral' },
};

const REASONS = new Set(['WRONG_ITEM', 'DAMAGED', 'NOT_NEEDED', 'OTHER']);

export interface VendorReturnsScreenProps {
  source?: ReturnsSource;
  /** Hostel visits and refills (PartnerRequestsPanel), shown under the returns table. */
  liveRequests?: React.ReactNode;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

type Deciding = { row: PartnerReturn; decision: 'APPROVED' | 'DECLINED' };

export function VendorReturnsScreen({ source = loadReturns, liveRequests, onNavigate }: VendorReturnsScreenProps) {
  const t = useT();
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const returns = usePartnerLoad<{ items: PartnerReturn[] }>(load);
  const [deciding, setDeciding] = useState<Deciding | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const items = returns.data?.items ?? [];
  const status: ConsoleTableStatus = returns.status === 'loading' && !returns.data ? 'loading' : returns.status === 'error' ? 'error' : 'ready';
  const count = (state: string) => items.filter((row) => row.status === state).length;
  const reasonLabel = (reason: string) => t(REASONS.has(reason) ? (`pc.ret.reason.${reason}` as MessageKey) : 'pc.ret.reason.OTHER');

  const pickedUp = async (row: PartnerReturn) => {
    setBusyId(row.id);
    try {
      await markReturnPickedUp(row.id);
      setToast(t('pc.ret.pickedUpDone'));
      returns.reload();
    } catch (error) {
      setToast(error instanceof Error && error.message ? error.message : t('pc.home.decideFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const rows: DataTableRow[] = items.map((row) => {
    const outcome = OUTCOME[row.status] ?? OUTCOME.CANCELLED;
    const assessment = row.decisionNote
      ? row.decisionNote
      : row.refundPaise ? t('pc.ret.refundToArrange', { amount: money(row.refundPaise) }) : t('pc.ret.notAssessed');
    const actions = row.status === 'REQUESTED'
      ? [
        { label: t('pc.ret.approve'), variant: 'primary' as const, onSelect: () => setDeciding({ row, decision: 'APPROVED' }), accessibleLabel: t('pc.ret.approveFor', { item: row.item }) },
        { label: t('pc.ret.decline'), onSelect: () => setDeciding({ row, decision: 'DECLINED' }), accessibleLabel: t('pc.ret.declineFor', { item: row.item }) },
      ]
      : row.status === 'APPROVED' && busyId !== row.id
        ? [{ label: t('pc.ret.markPickedUp'), onSelect: () => { void pickedUp(row); }, accessibleLabel: t('pc.ret.markPickedUpFor', { item: row.item }) }]
        : [];
    return {
      id: row.id,
      muted: row.status === 'CANCELLED',
      cells: [
        { text: `#${shortRef(row.orderLineId)}`, weight: 'strong', mono: true },
        {
          node: (
            <>
              <span className="sk-table__text sk-table__text--strong">{row.item}</span>
              {row.hasPhoto ? <a className="sk-table__sub sk-link" href={`${apiBaseUrl()}/work/returns/${encodeURIComponent(row.id)}/photo`} target="_blank" rel="noreferrer">{t('pc.ret.photo')}</a> : null}
            </>
          ),
        },
        { text: reasonLabel(row.reason), sub: row.note ?? undefined, weight: 'regular' },
        { text: assessment, weight: 'muted' },
        { pill: { label: t(outcome.key), tone: outcome.tone } },
      ],
      actions,
    };
  });

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{
          title: t('pc.ret.title'),
          subtitle: t('pc.ret.sub'),
          actions: <SkButton variant="secondary" onClick={() => setPolicyOpen(true)}>{t('pc.ret.policy')}</SkButton>,
        }}
        stats={[
          { label: t('pc.ret.stat.requests'), value: items.length.toLocaleString('en-IN') },
          { label: t('pc.ret.stat.waiting'), value: count('REQUESTED').toLocaleString('en-IN'), tone: count('REQUESTED') ? 'attention' : 'text' },
          { label: t('pc.ret.stat.refused'), value: count('DECLINED').toLocaleString('en-IN') },
          { label: t('pc.ret.stat.rate'), value: null },
        ]}
        statsLabel={t('pc.ret.statsLabel')}
        table={{
          caption: t('pc.ret.caption'),
          columns: [
            { label: t('pc.ret.col.order'), width: '120px' },
            { label: t('pc.ret.col.item') },
            { label: t('pc.ret.col.reason'), width: '190px' },
            { label: t('pc.ret.col.assessment'), width: '190px' },
            { label: t('pc.ret.col.outcome'), width: '150px', align: 'end' },
          ],
          rows,
          rowActions: true,
          footnote: t('pc.ret.footnote'),
        }}
        empty={{ title: t('pc.ret.emptyTitle'), body: t('pc.ret.emptyBody'), icon3d: PARTNER_EMPTY_TILE }}
        unconnected={{ title: t('pc.ret.emptyTitle'), body: t('pc.ret.emptyBody') }}
        error={{ title: t('pc.ret.errorTitle'), reference: t('pc.ret.ref'), detail: returns.error || undefined, onRetry: returns.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pc.ret.title') })}
      >
        {liveRequests}
      </ConsoleTablePage>

      <DecideReturn deciding={deciding} onClose={() => setDeciding(null)} onDone={(message) => { setDeciding(null); setToast(message); returns.reload(); }} />

      <Overlay open={policyOpen} variant="drawer" title={t('pc.ret.policyTitle')} onClose={() => setPolicyOpen(false)}>
        <ul className="pc-policy">
          <li>{t('pc.ret.policy1')}</li>
          <li>{t('pc.ret.policy2')}</li>
          <li>{t('pc.ret.policy3')}</li>
          <li>{t('pc.ret.policy4')}</li>
        </ul>
      </Overlay>
      <Toast message={toast} onDone={() => setToast(null)} />
    </main>
  );
}

/** Approve (refund up to what was paid) or decline (a reason the student sees). */
function DecideReturn({ deciding, onClose, onDone }: { deciding: Deciding | null; onClose: () => void; onDone: (message: string) => void }): React.ReactElement {
  const t = useT();
  const [refund, setRefund] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  const approving = deciding?.decision === 'APPROVED';
  const rupees = Number(refund);
  const refundOk = !approving || (refund.trim() !== '' && Number.isFinite(rupees) && rupees > 0);
  const noteOk = approving || note.trim().length >= 3;

  const close = () => { setRefund(''); setNote(''); setError(''); setTried(false); onClose(); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!deciding || !refundOk || !noteOk) return;
    setBusy(true);
    setError('');
    try {
      // Rupees typed, paise sent; the server checks it against what was paid.
      await decideReturn(deciding.row.id, deciding.decision, approving ? Math.round(rupees * 100) : 0, note.trim());
      setRefund(''); setNote(''); setTried(false);
      onDone(t(approving ? 'pc.ret.approvedDone' : 'pc.ret.declinedDone'));
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('pc.home.decideFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay
      open={deciding !== null}
      variant="dialog"
      busy={busy}
      title={deciding ? t(approving ? 'pc.ret.approveTitle' : 'pc.ret.declineTitle', { item: deciding.row.item }) : ''}
      onClose={close}
    >
      <form className="pc-form" noValidate onSubmit={(event) => { void submit(event); }}>
        {approving ? (
          <FormField label={t('pc.ret.refundLabel')} hint={t('pc.ret.refundHint')} status={tried && !refundOk ? 'invalid' : 'idle'} message={t('pc.ret.refundInvalid')}>
            <input className="pc-input" type="number" inputMode="decimal" min="0.01" step="0.01" value={refund} onChange={(event) => setRefund(event.target.value)} />
          </FormField>
        ) : null}
        <FormField label={t(approving ? 'pc.ret.noteOptional' : 'pc.ret.noteWhy')} status={tried && !noteOk ? 'invalid' : 'idle'} message={t('pc.ret.noteInvalid')}>
          <textarea className="pc-textarea" maxLength={500} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </FormField>
        {error ? <p className="pc-form__error" role="alert">{error}</p> : null}
        <div className="pc-form__actions">
          <SkButton variant="secondary" onClick={close} disabled={busy}>{t('common.cancel')}</SkButton>
          <SkButton type="submit" busy={busy} variant={approving ? 'primary' : 'danger'}>{t(approving ? 'pc.ret.approve' : 'pc.ret.decline')}</SkButton>
        </div>
      </form>
    </Overlay>
  );
}
