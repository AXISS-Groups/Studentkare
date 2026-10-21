import React, { useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { DataTable, StatRow } from '@/design-system/data/DataTable';
import type { DataTableRow, Stat } from '@/design-system/data/DataTable';
import { Drawer } from '@/design-system/overlays/Drawer';
import { SkButton, Skeleton } from '@/design-system/primitives';
import { Icon, Icon3d } from '@/design-system/icons';
import { apiRequest } from '@/data/services/http';
import { useLanguage, useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { HTTP_FORBIDDEN, NoCampusState, NotConnected, statusOf, useBoardLoad, useBoardRef } from './boardKit';
import './campus-boards.css';

/** One row of GET /ops/campus/pending (scoped to the admin's campus by the server). */
export interface PendingStudent {
  accountId: string;
  fullName: string;
  email: string;
  university: string;
  rollNumber: string;
}

export type Decision = 'VERIFIED' | 'REJECTED';

export interface ApprovalsSource {
  load(): Promise<PendingStudent[]>;
  decide(accountId: string, decision: Decision): Promise<void>;
}

export const liveApprovalsSource: ApprovalsSource = {
  async load() {
    const { items } = await apiRequest<{ items: PendingStudent[] }>('/ops/campus/pending');
    return items.map(({ accountId, fullName, email, university, rollNumber }) => ({ accountId, fullName, email, university, rollNumber }));
  },
  async decide(accountId, decision) {
    await apiRequest(`/ops/campus/${encodeURIComponent(accountId)}`, { method: 'PATCH', body: JSON.stringify({ status: decision }) });
  },
};

const BOARD = 'CampusApprovals';
const VISIBLE_EMAIL_CHARS = 1;
const MASK = '•••••';

/** "k•••••@vnrvjiet.in": enough to tell two applicants apart, not a contact list. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email ? `${email.slice(0, VISIBLE_EMAIL_CHARS)}${MASK}` : '';
  return `${email.slice(0, VISIBLE_EMAIL_CHARS)}${MASK}${email.slice(at)}`;
}

/**
 * Verification queue (design page 4, CampusApprovals; Tier 2). The queue and
 * both decisions are real: GET /ops/campus/pending and PATCH /ops/campus/{id}.
 * The server sends no submission time, ID-card photo or campus-directory match,
 * so the funnel, the decision-time figures and the board's evidence checks are
 * shown as not connected; the drawer shows only what the student gave: their
 * campus and roll number.
 */
export function CampusApprovalsScreen({ source = liveApprovalsSource }: { source?: ApprovalsSource }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const boardRef = useBoardRef();
  const [load] = useState(() => () => source.load());
  const { state, retry } = useBoardLoad(load);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [failure, setFailure] = useState<{ status: number } | null>(null);
  const [done, setDone] = useState<{ name: string; decision: Decision } | null>(null);
  const locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;

  if (state.kind === 'loading') {
    return (
      <div className="sk-ds cb-board" role="status" aria-busy="true" aria-label={t('campusBoards.approvals.loading')}>
        <Skeleton width={280} height={30} />
        <div className="cb-skel-row">{[0, 1, 2, 3].map((key) => <Skeleton key={key} height={64} />)}</div>
        {[0, 1, 2].map((key) => <Skeleton key={key} height={56} />)}
      </div>
    );
  }
  if (state.kind === 'failed' && state.status === HTTP_FORBIDDEN) return <NoCampusState />;
  if (state.kind === 'failed') {
    return (
      <div className="sk-ds cb-board">
        <div className="sk-state">
          <div className="sk-state__body sk-state__body--card" role="alert">
            <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
            <h1 className="sk-state__title">{t('campusBoards.approvals.error')}</h1>
            <p className="sk-state__text">{t('console.error.body')}</p>
            <div className="sk-state__actions">
              <SkButton onClick={retry}>{t('common.tryAgain')}</SkButton>
              <SkButton variant="secondary" onClick={() => navigate('support')}>{t('console.error.help')}</SkButton>
            </div>
            <span className="sk-state__ref">{boardRef(state.status, BOARD)}</span>
          </div>
        </div>
      </div>
    );
  }

  const pending = state.data;
  const current = pending.find((item) => item.accountId === openId) ?? null;

  const decide = async (decision: Decision) => {
    if (!current || busy) return;
    setBusy(decision);
    setFailure(null);
    try {
      await source.decide(current.accountId, decision);
      setDone({ name: current.fullName, decision });
      setOpenId(null);
      retry();
    } catch (reason) {
      setFailure({ status: statusOf(reason) });
    } finally {
      setBusy(null);
    }
  };

  const stats: Stat[] = [
    { label: t('campusBoards.approvals.stat.pending'), value: pending.length.toLocaleString(locale), tone: pending.length > 0 ? 'attention' : 'positive' },
    { label: t('campusBoards.approvals.stat.auto'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.approvals.stat.median'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.approvals.stat.rejected'), value: null, meta: t('campusBoards.notConnectedShort') },
  ];

  const rows: DataTableRow[] = pending.map((item) => ({
    id: item.accountId,
    cells: [
      { text: item.fullName, sub: maskEmail(item.email), weight: 'strong' },
      { pill: { label: t('campusBoards.approvals.evidence'), tone: 'neutral' } },
      { text: item.rollNumber, mono: true },
    ],
    actions: [{
      label: t('campusBoards.approvals.review'),
      variant: 'primary',
      accessibleLabel: t('campusBoards.approvals.reviewOne', { name: item.fullName }),
      onSelect: () => { setFailure(null); setOpenId(item.accountId); },
    }],
  }));

  return (
    <div className="sk-ds cb-board">
      <ConsolePageHeader eyebrow={t('campusBoards.approvals.eyebrow')} title={t('campusBoards.approvals.title')} />
      {done ? (
        <div className={`sk-note sk-note--${done.decision === 'VERIFIED' ? 'positive' : 'info'}`} role="status">
          <Icon name={done.decision === 'VERIFIED' ? 'shield-check' : 'info'} size={16} strokeWidth={2} />
          <span>{t(done.decision === 'VERIFIED' ? 'campusBoards.approvals.doneVerified' : 'campusBoards.approvals.doneRejected', { name: done.name })}</span>
        </div>
      ) : null}
      <StatRow stats={stats} variant="plain" />
      <section className="cb-funnel" aria-labelledby="cb-funnel-title">
        <h2 id="cb-funnel-title" className="cb-eyebrow">{t('campusBoards.approvals.funnel')}</h2>
        <NotConnected icon="bar-chart" titleKey="campusBoards.approvals.funnelOffTitle" bodyKey="campusBoards.approvals.funnelOffBody" />
      </section>
      {pending.length === 0 ? (
        <div className="sk-state">
          <div className="sk-state__body">
            <Icon3d name="chart-alt--p4" size={96} />
            <h2 className="sk-state__title">{t('campusBoards.approvals.empty')}</h2>
            <p className="sk-state__text">{t('campusBoards.approvals.emptyBody')}</p>
          </div>
        </div>
      ) : (
        <DataTable
          caption={t('campusBoards.approvals.title')}
          variant="plain"
          columns={[
            { label: t('campusBoards.approvals.col.applicant') },
            { label: t('campusBoards.approvals.col.evidence'), width: '220px' },
            { label: t('campusBoards.approvals.col.roll'), width: '170px' },
          ]}
          actionsLabel={t('console.table.actions')}
          rows={rows}
        />
      )}
      <Drawer
        open={current !== null}
        eyebrow={t('campusBoards.approvals.drawer.eyebrow')}
        eyebrowTone="action"
        title={current?.fullName ?? ''}
        subtitle={current ? t('campusBoards.approvals.drawer.subtitle', { roll: current.rollNumber }) : undefined}
        busy={busy !== null}
        onClose={() => setOpenId(null)}
      >
        {current ? (
          <div className="cb-decide">
            <ul className="cb-evidence">
              <li>
                <span className="cb-evidence__dot is-given" aria-hidden="true" />
                <span><strong>{t('campusBoards.approvals.drawer.campus')}</strong><span>{current.university}</span></span>
              </li>
              <li>
                <span className="cb-evidence__dot is-given" aria-hidden="true" />
                <span><strong>{t('campusBoards.approvals.drawer.roll')}</strong><span className="sk-mono">{current.rollNumber}</span></span>
              </li>
              <li>
                <span className="cb-evidence__dot is-missing" aria-hidden="true" />
                <span><strong>{t('campusBoards.approvals.drawer.noChecks')}</strong><span>{t('campusBoards.approvals.drawer.noChecksBody')}</span></span>
              </li>
            </ul>
            {failure ? (
              <div className="sk-note sk-note--danger" role="alert">
                <Icon name="alert-triangle" size={16} strokeWidth={2} />
                <span>{t(failure.status === HTTP_FORBIDDEN ? 'campusBoards.approvals.drawer.ownForbidden' : 'campusBoards.approvals.drawer.failed', { ref: boardRef(failure.status, BOARD) })}</span>
              </div>
            ) : null}
            <div className="cb-decide__actions">
              <SkButton busy={busy === 'VERIFIED'} disabled={busy !== null} onClick={() => { void decide('VERIFIED'); }}>{t('campusBoards.approvals.drawer.confirm')}</SkButton>
              <SkButton variant="secondary" className="cb-btn-danger-text" busy={busy === 'REJECTED'} disabled={busy !== null} onClick={() => { void decide('REJECTED'); }}>{t('campusBoards.approvals.drawer.reject')}</SkButton>
            </div>
            <p className="cb-field__hint">{t('campusBoards.approvals.drawer.rejectNote')}</p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
