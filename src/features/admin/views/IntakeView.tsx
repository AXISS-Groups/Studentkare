import React, { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage, SkButton, StatusPill } from '@/design-system';
import type { ConsoleTableStatus, SkTone } from '@/design-system';
import { intakeRepository } from '../model/intakeRepository';
import { confidenceTone, count, percent, readable } from '../model/format';
import { IntakeViewModel } from '../viewmodels/IntakeViewModel';
import { useT } from '@/i18n';
import { BoardToast, boardEmpty, boardError } from './AdminBoard';

/** `is-positive` (format.confidenceTone) > the pill's tone. */
const TONE: Record<string, SkTone> = { 'is-positive': 'positive', 'is-attention': 'attention', 'is-danger': 'danger' };
const toneOf = (confidence: number): SkTone => TONE[confidenceTone(confidence)] ?? 'neutral';

/**
 * Intake & OCR (design: AdminIntake), on the console table page: the queue of documents
 * with fields the reader isn't sure of, the original (not viewable from this console
 * yet), and the extracted fields to correct, confirm or reject. Confirming or rejecting
 * records the decision per field (audited on the server) and says so. Not wired: "Ask the
 * lab" (no endpoint) and the board's "read today / auto-matched" figure (nothing reports it).
 */
export const IntakeView = observer(function IntakeView() {
  const t = useT();
  const [vm] = useState(() => new IntakeViewModel(intakeRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // The confirmation shown after a decision the server accepted is presentation state.
  const [done, setDone] = useState<string | null>(null);
  const clearDone = useCallback(() => setDone(null), []);
  const { items, documents, selected } = vm;

  const decide = (approved: boolean) => {
    void vm.decide(approved).then(() => {
      if (!vm.decisionError) setDone(approved ? t('adminBoard.intake.confirmed') : t('adminBoard.intake.rejected'));
    });
  };

  const status: ConsoleTableStatus = vm.loading ? 'loading' : vm.error ? 'error' : documents.length ? 'ready' : 'empty';
  const body = <div className="sk-board-intake">
    <section className="sk-board-card" aria-labelledby="sk-intake-queue">
      <h2 id="sk-intake-queue" className="sk-board-card__eyebrow">{t('admin.intake.needsHuman', { count: count(documents.length) })}</h2>
      <ul className="sk-board-queue">{documents.map(document => <li key={document.intakeId}>
        <button type="button" aria-pressed={document.intakeId === selected?.intakeId} onClick={() => vm.selectDocument(document.intakeId)}>
          <strong>{t('admin.intake.document', { id: document.documentId.slice(0, 8) })}</strong>
          <span>{document.fields.length === 1 ? t('admin.intake.toCheckOne') : t('admin.intake.toCheckOther', { count: count(document.fields.length) })}</span>
          <StatusPill tone={toneOf(document.lowest)} small>{t('admin.intake.lowest', { percent: percent(document.lowest) })}</StatusPill>
        </button>
      </li>)}</ul>
    </section>

    <section className="sk-board-card" aria-labelledby="sk-intake-original">
      <h2 id="sk-intake-original" className="sk-board-card__title">{t('admin.intake.original')}</h2>
      <p className="sk-board-card__text"><strong>{t('admin.intake.noPreview')}</strong> {t('admin.intake.noPreviewBody')}</p>
    </section>

    {selected ? <section className="sk-board-card" aria-labelledby="sk-intake-fields">
      <h2 id="sk-intake-fields" className="sk-board-card__title">{t('admin.intake.fields')}</h2>
      <div className="sk-board-fields">{selected.fields.map(field => <label key={field.id} className="sk-board-field">
        <span className="sk-board-field__label">{readable(field.field)}<StatusPill tone={toneOf(field.confidence)} small>{percent(field.confidence)}</StatusPill></span>
        <input className={field.confidence < 0.9 ? 'is-uncertain' : undefined} value={vm.fieldValue(field)} onChange={event => vm.edit(field.id, event.target.value)} />
      </label>)}</div>
      {vm.decisionError ? <p className="sk-board-error" role="alert">{vm.decisionError}</p> : null}
      <SkButton busy={vm.deciding} onClick={() => decide(true)}>{t('admin.intake.confirm')}</SkButton>
      <div className="sk-board-actions">
        <SkButton variant="secondary" disabled={vm.deciding} onClick={() => decide(false)}>{t('admin.intake.reject')}</SkButton>
      </div>
      <p className="sk-board-hint">{t('adminBoard.intake.footnote')}</p>
    </section> : null}
  </div>;

  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={status}
      header={{
        title: t('admin.intake.title'),
        subtitle: t('admin.intake.description'),
        badge: items.length ? { label: items.length === 1 ? t('admin.intake.waitingOne') : t('admin.intake.waitingOther', { count: count(items.length) }), tone: 'attention' } : undefined,
      }}
      table={{ caption: t('admin.intake.title'), columns: [], rows: [] }}
      alternate={body}
      empty={boardEmpty(t, t('admin.intake.empty'), t('admin.intake.emptyBody'))}
      unconnected={{ title: t('admin.intake.title'), body: t('admin.intake.emptyBody') }}
      error={boardError(t, t('adminBoard.intake.what'), 'AdminIntake', vm.reload, vm.error)}
      loadingLabel={t('admin.intake.loading')}
    />
    <BoardToast message={done} onDone={clearDone} />
  </div>;
});
