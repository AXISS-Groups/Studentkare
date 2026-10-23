import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, DataTable, SkButton, StatusPill } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { BoardNote, BoardToast } from '@/features/admin/views/AdminBoard';
import { BoardFailure, BoardLoading, GovCard } from '@/features/admin/views/GovBoard';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { MedicineInfoReviewViewModel, valueToText } from '../viewmodel/MedicineInfoReviewViewModel';
import type { FieldName, FieldRow, HistoryEntry, QueueItem, ReviewFilter } from '../viewmodel/MedicineInfoReviewViewModel';
import '@/features/admin/views/gov-board.css';
import '@/theme/workflows.css';

/**
 * Medicine information review (AdminMedicineInfo; plan
 * docs/plans/tier1-medicine-info-2026-10-22.md). Pharmacists approve; super
 * admins edit, import and withdraw. Every change is audited by the server and
 * listed under History. Nothing on this screen is written by an AI.
 */
const FIELD_LABEL: Record<FieldName, MessageKey> = {
  brand: 'mia.f.brand', composition: 'mia.f.composition', form: 'mia.f.form', pack: 'mia.f.pack', manufacturer: 'mia.f.manufacturer',
  schedule: 'mia.f.schedule', uses: 'mia.f.uses', side_effects: 'mia.f.side_effects', warnings: 'mia.f.warnings', storage: 'mia.f.storage',
  age_availability: 'mia.f.age_availability',
};
const ACTION_LABEL: Record<HistoryEntry['action'], MessageKey> = {
  IMPORTED: 'mia.h.IMPORTED', EDITED: 'mia.h.EDITED', REVIEWED: 'mia.h.REVIEWED', REVIEW_WITHDRAWN: 'mia.h.REVIEW_WITHDRAWN',
};
const FILTERS: readonly { id: ReviewFilter; label: MessageKey }[] = [
  { id: 'TO_REVIEW', label: 'mia.filter.toReview' }, { id: 'REVIEWED', label: 'mia.filter.reviewed' }, { id: 'ALL', label: 'mia.filter.all' },
];

function fieldPill(row: FieldRow): { label: MessageKey; tone: SkTone } {
  if (row.shown) return { label: 'mia.state.shown', tone: 'positive' };
  if (row.changedSinceReview) return { label: 'mia.state.changed', tone: 'attention' };
  return { label: 'mia.state.unreviewed', tone: 'neutral' };
}

function queuePill(item: QueueItem): { label: MessageKey; tone: SkTone } {
  if (!item.active) return { label: 'mia.q.off', tone: 'neutral' };
  if (!item.published) return { label: 'mia.q.hiddenImport', tone: 'neutral' };
  if (item.changedCount > 0) return { label: 'mia.q.changed', tone: 'attention' };
  return item.reviewedCount === item.fieldCount ? { label: 'mia.q.complete', tone: 'positive' } : { label: 'mia.q.partial', tone: 'neutral' };
}

function when(at: number): string {
  return new Date(at * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

const FieldEditor = observer(function FieldEditor({ vm, row }: { vm: MedicineInfoReviewViewModel; row: FieldRow }) {
  const t = useT();
  const draft = vm.drafts[row.field] ?? { text: '', sourceTitle: '', sourceUrl: '' };
  const pill = fieldPill(row);
  const busy = vm.busyField === row.field;
  const dirty = vm.dirty(row.field);
  const error = vm.fieldError?.field === row.field ? vm.fieldError.message : null;
  const canApprove = vm.canApprove && !dirty && !row.shown && Boolean(row.sourceTitle) && row.valueHash !== null;
  return (
    <section className="sk-gov-card" aria-labelledby={`mia-${row.field}`} data-testid={`mia-field-${row.field}`}>
      <div className="sk-gov-toolbar">
        <h3 id={`mia-${row.field}`}>{t(FIELD_LABEL[row.field])}</h3>
        <span data-testid={`mia-state-${row.field}`}><StatusPill tone={pill.tone}>{t(pill.label)}</StatusPill></span>
      </div>
      {row.kind === 'identity' ? (
        <p className="sk-gov-text" data-testid={`mia-value-${row.field}`}>{typeof row.value === 'string' ? row.value : ''}</p>
      ) : (
        <Field label={t(row.field === 'age_availability' ? 'mia.ageLines' : 'mia.lines')} hint={row.field === 'age_availability' ? t('mia.ageHint', { bands: vm.detail?.bands.join(', ') ?? '' }) : t('mia.linesHint')}>
          <textarea rows={4} value={draft.text} onChange={(e) => vm.setDraft(row.field, { text: e.target.value })} data-testid={`mia-text-${row.field}`} />
        </Field>
      )}
      <div className="wf-form-grid">
        <Field label={t('mia.sourceTitle')} hint={t('mia.sourceHint')}>
          <input value={draft.sourceTitle} maxLength={200} onChange={(e) => vm.setDraft(row.field, { sourceTitle: e.target.value })} data-testid={`mia-source-${row.field}`} />
        </Field>
        <Field label={t('mia.sourceUrl')}>
          <input type="url" value={draft.sourceUrl} maxLength={2000} onChange={(e) => vm.setDraft(row.field, { sourceUrl: e.target.value })} />
        </Field>
      </div>
      {row.reviewedOn ? <p className="sk-gov-fine"><Icon name="shield-check" size={14} /> {t(row.reviewedByYou ? 'mia.reviewedByYou' : 'mia.reviewedBy', { date: row.reviewedOn })}</p> : null}
      {error ? <FormError message={error} /> : null}
      <div className="sk-gov-toolbar">
        <SkButton variant="secondary" onClick={() => void vm.save(row.field)} disabled={busy || !dirty || draft.sourceTitle.trim().length < 3} data-testid={`mia-save-${row.field}`}>
          <Icon name="pencil" size={16} />{t('mia.save')}
        </SkButton>
        {vm.canApprove ? (
          <SkButton onClick={() => void vm.approve(row.field)} disabled={busy || !canApprove} data-testid={`mia-approve-${row.field}`}>
            <Icon name="check-circle" size={16} />{t('mia.approve')}
          </SkButton>
        ) : null}
        {row.state === 'REVIEWED' ? (
          <SkButton variant="secondary" onClick={() => void vm.withdraw(row.field)} disabled={busy} data-testid={`mia-withdraw-${row.field}`}>
            <Icon name="rotate-ccw" size={16} />{t('mia.withdraw')}
          </SkButton>
        ) : null}
      </div>
      {row.kind === 'monograph' && dirty && valueToText(row) ? <p className="sk-gov-fine">{t('mia.dirty')}</p> : null}
    </section>
  );
});

const DetailDialog = observer(function DetailDialog({ vm }: { vm: MedicineInfoReviewViewModel }) {
  const t = useT();
  if (vm.detailPhase === 'idle') return null;
  const d = vm.detail;
  return (
    <ShopDialog title={d ? d.medicine.brand : t('mia.loading')} onClose={vm.close} wide>
      {vm.detailPhase === 'loading' ? <p>{t('mia.loading')}</p> : null}
      {vm.detailPhase === 'error' ? <BoardNote icon="alert-triangle" tone="attention">{t('mia.detailFailed')}</BoardNote> : null}
      {d ? (
        <div className="sk-gov-stack" data-testid="mia-detail">
          <p className="sk-gov-text">{`${d.medicine.composition} · ${d.medicine.form} · ${d.medicine.schedule}`}</p>
          {!d.canApprove ? <BoardNote icon="shield-check">{t('mia.onlyPharmacist')}</BoardNote> : <BoardNote icon="shield-check">{t('mia.approveRule')}</BoardNote>}
          <BoardNote icon="info">{t('mia.identityNote')}</BoardNote>
          {d.fields.map((row) => <FieldEditor key={row.field} vm={vm} row={row} />)}
          <GovCard title={t('mia.history')} aside={<Icon name="file-text" size={18} />}>
            {d.history.length ? (
              <ul className="sk-gov-history" data-testid="mia-history">
                {d.history.map((h) => (
                  <li key={h.id}>{t('mia.historyLine', { action: t(ACTION_LABEL[h.action]), field: h.field ? t(FIELD_LABEL[h.field as FieldName]) : '', who: h.byYou ? t('mia.you') : h.actorRole, at: when(h.at) })}</li>
                ))}
              </ul>
            ) : <p className="sk-gov-text">{t('mia.historyEmpty')}</p>}
          </GovCard>
        </div>
      ) : null}
    </ShopDialog>
  );
});

const ImportDialog = observer(function ImportDialog({ vm }: { vm: MedicineInfoReviewViewModel }) {
  const t = useT();
  const file = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState('');
  const [licence, setLicence] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  if (!vm.importOpen) return null;
  const result = vm.importResult;
  return (
    <ShopDialog title={t('mia.importTitle')} onClose={vm.closeImport} wide>
      <form className="wf-form" data-testid="mia-import-form" onSubmit={(e) => {
        e.preventDefault();
        const chosen = file.current?.files?.[0];
        if (chosen) void vm.importFile(chosen, dataset, licence, sourceUrl);
      }}>
        <p>{t('mia.importIntro')}</p>
        <p className="sk-gov-fine">{t('mia.importColumns')}</p>
        <FormError message={vm.importError ?? ''} />
        <Field label={t('mia.importFile')}><input ref={file} type="file" accept=".csv,text/csv" required data-testid="mia-import-file" /></Field>
        <div className="wf-form-grid">
          <Field label={t('mia.importDataset')}><input required minLength={3} maxLength={200} value={dataset} onChange={(e) => setDataset(e.target.value)} /></Field>
          <Field label={t('mia.importLicence')} hint={t('mia.importLicenceHint')}><input required minLength={3} maxLength={300} value={licence} onChange={(e) => setLicence(e.target.value)} /></Field>
        </div>
        <Field label={t('mia.sourceUrl')}><input type="url" maxLength={2000} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></Field>
        <SubmitButton busy={vm.importing}>{t('mia.importGo')}</SubmitButton>
      </form>
      {result ? (
        <div className="sk-gov-stack" data-testid="mia-import-result" aria-live="polite">
          <BoardNote icon="info">{t('mia.importDone', { created: result.rowsCreated, matched: result.rowsMatched, rejected: result.rowsRejected })}</BoardNote>
          {result.errors.length ? (
            <ul className="sk-gov-bullets">{result.errors.map((e) => <li key={e.row}>{t('mia.importRowError', { row: e.row, reason: e.reason })}</li>)}</ul>
          ) : null}
        </div>
      ) : null}
    </ShopDialog>
  );
});

export const MedicineInfoReviewView = observer(function MedicineInfoReviewView({ console: where }: { console: 'admin' | 'pharmacy' }) {
  const t = useT();
  const [vm] = useState(() => new MedicineInfoReviewViewModel());
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);

  if (vm.phase === 'loading' && !vm.items.length) return <BoardLoading label={t('mia.loading')} />;
  if (vm.phase === 'error') return <BoardFailure t={t} what={t('mia.what')} screen="AdminMedicineInfo" onRetry={() => void vm.load()} />;

  const rows: DataTableRow[] = vm.items.map((item) => {
    const pill = queuePill(item);
    return {
      id: item.id,
      muted: !item.active,
      cells: [
        { text: item.brand, weight: 'strong', sub: item.composition },
        { text: `${item.form} · ${item.schedule}` },
        { text: t('mia.reviewedCount', { done: item.reviewedCount, total: item.fieldCount }), mono: true },
        { pill: { label: t(pill.label), tone: pill.tone } },
      ],
      actions: [{ label: t('mia.open'), icon: 'pencil', onSelect: () => void vm.open(item.id), accessibleLabel: t('mia.openSpoken', { name: item.brand }) }],
    };
  });
  const notice: Record<NonNullable<MedicineInfoReviewViewModel['notice']>, MessageKey> = {
    saved: 'mia.saved', approved: 'mia.approved', withdrawn: 'mia.withdrawn', imported: 'mia.imported',
  };

  return (
    <div className="sk-ds sk-admin-page sk-gov" data-testid="mia-page">
      <ConsolePageHeader eyebrow={t(where === 'admin' ? 'mia.eyebrowAdmin' : 'mia.eyebrowPharmacy')} title={t('mia.title')} subtitle={t('mia.subtitle')}
        actions={vm.canImport ? <SkButton onClick={vm.openImport} data-testid="mia-import"><Icon name="upload" size={16} />{t('mia.import')}</SkButton> : undefined} />
      <div className="sk-gov-stack">
        {!vm.canApprove ? <BoardNote icon="shield-check">{t('mia.onlyPharmacist')}</BoardNote> : null}
        <form className="sk-gov-toolbar" role="search" onSubmit={(e) => { e.preventDefault(); void vm.load(); }}>
          <Field label={t('mia.searchLabel')}><input value={vm.query} maxLength={120} onChange={(e) => vm.setQuery(e.target.value)} data-testid="mia-search" /></Field>
          <SkButton type="submit" variant="secondary"><Icon name="search" size={16} />{t('mia.search')}</SkButton>
        </form>
        <div role="tablist" aria-label={t('mia.filterLabel')} className="sk-gov-toolbar">
          {FILTERS.map((f) => (
            <SkButton key={f.id} role="tab" aria-selected={vm.filter === f.id} variant={vm.filter === f.id ? 'primary' : 'secondary'} onClick={() => vm.setFilter(f.id)} data-testid={`mia-filter-${f.id}`}>
              {t(f.label)}
            </SkButton>
          ))}
        </div>
        <DataTable variant="plain" caption={t('mia.queue')} title={t('mia.queue')} actionsLabel={t('mia.col.actions')}
          columns={[{ label: t('mia.col.medicine') }, { label: t('mia.col.form'), width: '150px' }, { label: t('mia.col.reviewed'), width: '120px' }, { label: t('mia.col.status'), width: '170px', align: 'end' }]}
          rows={rows} emptyMessage={{ title: t('mia.empty'), body: t('mia.emptyBody') }} />
        {!rows.length ? <p className="sk-gov-fine"><Icon name="pill" size={16} /> {t('mia.emptyHint')}</p> : null}
        <p className="sk-gov-fine"><Icon name="alert-triangle" size={16} /> {t('mia.noAi')}</p>
      </div>
      <DetailDialog vm={vm} />
      <ImportDialog vm={vm} />
      <BoardToast message={vm.notice ? t(notice[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});

/** Super admin console (`admin/medicine-info`). */
export function AdminMedicineInfoScreen(): React.ReactElement {
  return <MedicineInfoReviewView console="admin" />;
}

/** Pharmacy partner console (`medicine-info-review`). */
export function PharmacyMedicineInfoScreen(): React.ReactElement {
  return <MedicineInfoReviewView console="pharmacy" />;
}
