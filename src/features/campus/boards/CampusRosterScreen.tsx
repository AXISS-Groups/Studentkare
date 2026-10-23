import React, { useEffect, useId, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import { Drawer } from '@/design-system/overlays/Drawer';
import { SkButton } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { apiRequest } from '@/data/services/http';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Unavailable, goTo } from './boardKit';
import { ROSTER_FIELDS, checkRoster, hasRequiredColumns, rosterTemplate } from './rosterImport';
import { StudentInvitesPanel } from '../invites/StudentInvitesPanel';
import { studentInvitesRepository } from '../invites/studentInvitesRepository';
import type { StudentInvitesRepository } from '../invites/studentInvitesRepository';
import type { RosterCheck, RosterField, RowProblem } from './rosterImport';
import './campus-boards.css';

export interface RosterSource {
  /** How many students on this campus are waiting for verification; null when it can't be read. */
  pendingCount(): Promise<number | null>;
}

export const liveRosterSource: RosterSource = {
  pendingCount: () => apiRequest<{ items: unknown[] }>('/ops/campus/pending').then((body) => body.items.length).catch(() => null),
};

const BOARD = 'CampusRoster';
const PROBLEMS_SHOWN = 5;
const IMPORT_STEPS = ['campusBoards.roster.import.step.upload', 'campusBoards.roster.import.step.map', 'campusBoards.roster.import.step.check', 'campusBoards.roster.import.step.invite'] as const;

const FIELD_LABEL: Record<RosterField, MessageKey> = {
  name: 'campusBoards.roster.field.name',
  roll_no: 'campusBoards.roster.field.roll',
  email: 'campusBoards.roster.field.email',
  phone: 'campusBoards.roster.field.phone',
  programme: 'campusBoards.roster.field.programme',
  year: 'campusBoards.roster.field.year',
  hostel: 'campusBoards.roster.field.hostel',
  room: 'campusBoards.roster.field.room',
};

const PROBLEM_LABEL: Record<RowProblem, MessageKey> = {
  missingName: 'campusBoards.roster.problem.missingName',
  missingRoll: 'campusBoards.roster.problem.missingRoll',
  badEmail: 'campusBoards.roster.problem.badEmail',
  duplicateRoll: 'campusBoards.roster.problem.duplicateRoll',
};

/**
 * Students (design page 4, CampusRoster; Tier 2). No roster endpoint exists,
 * so the table draws its designed columns and says it isn't connected; no
 * student is listed. Two parts are real: how many students wait for
 * verification (GET /ops/campus/pending, a count only), and the import
 * drawer, which reads and checks a CSV on this computer and says plainly that
 * sending invites from a CSV isn't connected yet (D-B4). Export is shown disabled
 * for the same reason. Below it, "Invite students" invites one student at a time
 * (B2B; plan tier1-auth-password-2026-10-22, amendment b).
 */
export function CampusRosterScreen({ source = liveRosterSource, invites = studentInvitesRepository }: { source?: RosterSource; invites?: StudentInvitesRepository }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    source.pendingCount().then((count) => { if (live) setPending(count); }).catch(() => { if (live) setPending(null); });
    return () => { live = false; };
  }, [source]);

  return (
    <>
      <ConsoleTablePage
        className="cb-board"
        status="unconnected"
        header={{
          title: t('campusBoards.roster.title'),
          subtitle: t('campusBoards.roster.subtitle'),
          actions: (
            <>
              <SkButton variant="secondary" disabled>
            <Icon name="download-2" size={17} strokeWidth={1.9} />
                {t('campusBoards.roster.export')}
                <Unavailable reason="campusBoards.roster.exportUnavailable" />
              </SkButton>
              <SkButton onClick={() => setImporting(true)}>
                <Icon name="upload" size={17} strokeWidth={1.9} />
                {t('campusBoards.roster.import')}
              </SkButton>
            </>
          ),
        }}
        note={(
          <div className="sk-note sk-note--info">
            <Icon name="info" size={16} strokeWidth={1.9} />
            <span>{t('campusBoards.roster.note')}</span>
          </div>
        )}
        table={{
          caption: t('campusBoards.roster.title'),
          columns: [
            { label: t('campusBoards.roster.col.student') },
            { label: t('campusBoards.roster.col.roll'), width: '130px' },
            { label: t('campusBoards.roster.col.programme'), width: '150px' },
            { label: t('campusBoards.roster.col.hostel'), width: '130px' },
            { label: t('campusBoards.roster.col.account'), width: '120px' },
            { label: t('campusBoards.roster.col.verification'), width: '220px' },
          ],
          rows: [],
        }}
        unconnected={{ title: t('campusBoards.roster.unconnectedTitle'), body: t('campusBoards.roster.unconnectedBody') }}
        empty={{ title: t('campusBoards.roster.empty'), body: t('campusBoards.roster.emptyBody'), icon3d: 'chart-alt--p4', action: { label: t('campusBoards.emptyCta'), onSelect: () => setImporting(true) } }}
        error={{ title: t('campusBoards.roster.error'), reference: t('campusBoards.ref', { code: 'NET', board: BOARD }), onRetry: () => undefined }}
        loadingLabel={t('campusBoards.roster.loading')}
      >
        {pending !== null && pending > 0 ? (
          <a className="cb-pending-link" href="/campus/verification" onClick={goTo('campus/verification')}>
            <Icon name="shield-check" size={18} strokeWidth={1.9} />
            <span>{t('campusBoards.roster.pending', { count: pending.toLocaleString(lang === 'en' ? 'en-IN' : `${lang}-IN`) })}</span>
            <Icon name="arrow-right" size={16} strokeWidth={1.9} />
          </a>
        ) : null}
        <StudentInvitesPanel repository={invites} />
      </ConsoleTablePage>
      <ImportDrawer open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

/** FileReader rather than Blob.text(): it works in every browser the console supports. */
function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('unreadable')));
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsText(file);
  });
}

function downloadTemplate(): void {
  const url = URL.createObjectURL(new Blob([rosterTemplate()], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'studentkare-roster-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function ImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement | null {
  const t = useT();
  const inputId = useId();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{ name: string; check: RosterCheck } | null>(null);
  const [unreadable, setUnreadable] = useState(false);

  const reset = () => { setStep(0); setFile(null); setUnreadable(false); };
  const close = () => { reset(); onClose(); };

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    readText(chosen)
      .then((text) => { setUnreadable(false); setFile({ name: chosen.name, check: checkRoster(text) }); setStep(1); })
      .catch(() => { setFile(null); setUnreadable(true); });
  };

  const check = file?.check ?? null;
  const usable = check !== null && hasRequiredColumns(check) && check.rows > 0;
  const last = IMPORT_STEPS.length - 1;
  const canNext = step === 0 ? check !== null : step === 2 ? usable : step < last;

  return (
    <Drawer open={open} title={t('campusBoards.roster.import')} subtitle={t('campusBoards.roster.import.subtitle')} onClose={close}>
      <div className="cb-import">
        <ol className="cb-steps" aria-label={t('campusBoards.roster.import.stepsLabel')}>
          {IMPORT_STEPS.map((key, index) => (
            <li key={key} className={`cb-steps__item${index === step ? ' is-current' : index < step ? ' is-done' : ''}`} aria-current={index === step ? 'step' : undefined}>
              {t(key)}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="cb-import__panel">
            <label className="cb-drop" htmlFor={inputId}>
              <Icon name="upload" size={22} strokeWidth={1.9} />
              <strong>{t('campusBoards.roster.import.drop')}</strong>
              <span className="sk-mono">{ROSTER_FIELDS.join(', ')}</span>
            </label>
            <input id={inputId} className="sk-visually-hidden" type="file" accept=".csv,text/csv" onChange={pick} />
            {unreadable ? <p className="cb-field__error" role="alert">{t('campusBoards.roster.import.unreadable')}</p> : null}
            <button type="button" className="sk-link" onClick={downloadTemplate}>
              <Icon name="download-2" size={15} strokeWidth={1.9} />
              <span>{t('campusBoards.roster.import.template')}</span>
            </button>
          </div>
        ) : null}

        {step === 1 && file && check ? (
          <div className="cb-import__panel">
            <p className="cb-import__file sk-mono">{t('campusBoards.roster.import.file', { name: file.name, rows: check.rows })}</p>
            <ul className="cb-map" aria-label={t('campusBoards.roster.import.step.map')}>
              {check.mapping.map((entry, index) => (
                <li key={`${entry.column}-${index}`}>
                  <span className="sk-mono">{entry.column || t('campusBoards.roster.import.blankColumn')}</span>
                  <Icon name="arrow-right" size={15} strokeWidth={1.9} />
                  <span className={entry.field ? '' : 'cb-map__unused'}>{entry.field ? t(FIELD_LABEL[entry.field]) : t('campusBoards.roster.import.unused')}</span>
                </li>
              ))}
            </ul>
            {check.missingFields.length > 0 ? (
              <p className="cb-field__hint">{t('campusBoards.roster.import.missing', { fields: check.missingFields.map((field) => t(FIELD_LABEL[field])).join(', ') })}</p>
            ) : null}
          </div>
        ) : null}

        {step === 2 && check ? (
          <div className="cb-import__panel">
            {!hasRequiredColumns(check) ? (
              <div className="sk-note sk-note--danger" role="alert">
                <Icon name="alert-triangle" size={16} strokeWidth={2} />
                <span>{t('campusBoards.roster.import.needColumns')}</span>
              </div>
            ) : (
              <>
                <dl className="cb-import__counts">
                  <div className="is-ready"><dt>{t('campusBoards.roster.import.ready')}</dt><dd><Icon name="check" size={16} strokeWidth={2.4} />{check.ready}</dd></div>
                  <div className={check.problems.length ? 'is-fix' : ''}><dt>{t('campusBoards.roster.import.fix')}</dt><dd>{check.rows - check.ready}</dd></div>
                </dl>
                {check.problems.length > 0 ? (
                  <ul className="cb-problems">
                    {check.problems.slice(0, PROBLEMS_SHOWN).map((problem) => (
                      <li key={`${problem.row}-${problem.problem}`}>
                        <span className="sk-mono">{t('campusBoards.roster.import.row', { row: problem.row })}</span>
                        <span>{t(PROBLEM_LABEL[problem.problem])}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="cb-field__hint">{t('campusBoards.roster.import.alreadyUnknown')}</p>
              </>
            )}
          </div>
        ) : null}

        {step === 3 && check ? (
          <div className="cb-import__panel">
            <div className="cb-unconnected" role="note">
              <span className="cb-unconnected__icon" aria-hidden="true"><Icon name="mail" size={20} strokeWidth={1.9} /></span>
              <span className="cb-unconnected__text">
                <strong>{t('campusBoards.roster.import.inviteOffTitle')}</strong>
                <span>{t('campusBoards.roster.import.inviteOffBody', { count: check.ready })}</span>
              </span>
            </div>
          </div>
        ) : null}

        <div className="cb-import__nav">
          {step > 0 ? <SkButton variant="secondary" onClick={() => setStep(step - 1)}>{t('campusBoards.back')}</SkButton> : null}
          {step < last ? (
            <SkButton disabled={!canNext} onClick={() => setStep(step + 1)}>{t('campusBoards.continue')}</SkButton>
          ) : (
            <SkButton disabled>
            <Icon name="mail" size={17} strokeWidth={1.9} />
              {t('campusBoards.roster.import.send')}
              <Unavailable reason="campusBoards.roster.import.inviteOffTitle" />
            </SkButton>
          )}
        </div>
      </div>
    </Drawer>
  );
}

