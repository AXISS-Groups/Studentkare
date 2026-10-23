import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage } from '@/design-system';
import type { ConsoleTableStatus, DataTableRow, SkTone } from '@/design-system';
import type { MessageKey } from '@/i18n';
import { intakeRepository } from '../model/intakeRepository';
import { count, readable, when } from '../model/format';
import { IntakeViewModel } from '../viewmodels/IntakeViewModel';
import { useT } from '@/i18n';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';

/** Document categories (care_documents.category) > their label. Unknown kinds fall back to their readable code. */
const KIND_LABEL: Record<string, MessageKey> = {
  LAB: 'member.records.category.LAB',
  PRESCRIPTION: 'member.records.category.PRESCRIPTION',
  VACCINE: 'member.records.category.VACCINE',
  CAMP_REPORT: 'member.records.category.CAMP_REPORT',
  DISCHARGE_SUMMARY: 'member.records.category.DISCHARGE_SUMMARY',
  OTHER: 'member.records.category.OTHER',
};

/** Intake states (care_document_intake.status) > label and pill tone. A failed read needs attention, never red. */
const STATUS: Record<string, { label: MessageKey; tone: SkTone }> = {
  DRAFT: { label: 'admin.intake.status.DRAFT', tone: 'neutral' },
  QUEUED: { label: 'admin.intake.status.QUEUED', tone: 'neutral' },
  FAILED: { label: 'admin.intake.status.FAILED', tone: 'attention' },
};

/**
 * Intake & OCR (design: AdminIntake), on the console table page: each uploaded
 * document whose intake is still open, with its kind, state and times only.
 *
 * Privacy: a student's document and the fields read from it are theirs. This
 * console never receives a title, a document id, an extracted field or a value
 * (the server leaves them out), so the board's "original", "extracted fields"
 * and confirm / reject panels are not drawn.
 */
export const IntakeView = observer(function IntakeView() {
  const t = useT();
  const [vm] = useState(() => new IntakeViewModel(intakeRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const { items } = vm;

  const rows: DataTableRow[] = items.map(item => {
    const status = STATUS[item.status];
    return {
      id: item.id,
      cells: [
        { text: item.id, weight: 'strong', mono: true },
        { text: KIND_LABEL[item.kind] ? t(KIND_LABEL[item.kind]) : readable(item.kind) },
        { pill: { label: status ? t(status.label) : readable(item.status), tone: status?.tone ?? 'neutral' } },
        { text: item.createdAt ? when(item.createdAt) : '—', weight: 'muted' },
        { text: item.processedAt ? when(item.processedAt) : '—', weight: 'muted' },
      ],
    };
  });

  const status: ConsoleTableStatus = vm.loading ? 'loading' : vm.error ? 'error' : items.length ? 'ready' : 'empty';
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status={status}
      header={{
        title: t('admin.intake.title'),
        subtitle: t('admin.intake.description'),
        badge: items.length ? { label: items.length === 1 ? t('admin.intake.openOne') : t('admin.intake.openOther', { count: count(items.length) }), tone: 'attention' } : undefined,
      }}
      note={<BoardNote icon="shield">{t('admin.intake.privacyNote')}</BoardNote>}
      table={{
        caption: t('admin.intake.title'),
        columns: [
          { label: t('admin.intake.col.intake'), width: '24%' },
          { label: t('admin.intake.col.kind') },
          { label: t('admin.intake.col.status') },
          { label: t('admin.intake.col.received') },
          { label: t('admin.intake.col.read') },
        ],
        rows,
      }}
      empty={boardEmpty(t, t('admin.intake.empty'), t('admin.intake.emptyBody'))}
      unconnected={{ title: t('admin.intake.title'), body: t('admin.intake.emptyBody') }}
      error={boardError(t, t('adminBoard.intake.what'), 'AdminIntake', vm.reload, vm.error)}
      loadingLabel={t('admin.intake.loading')}
    />
  </div>;
});
