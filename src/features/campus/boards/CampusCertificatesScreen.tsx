import React, { useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import { Drawer } from '@/design-system/overlays/Drawer';
import { SkButton, StatusPill } from '@/design-system/primitives';
import type { SkTone } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { useBoardLoad, useBoardRef } from './boardKit';
import './campus-boards.css';

type CertificateStatus = 'TO_CHECK' | 'CHECK_FAILED' | 'ACCEPTED' | 'RETURNED';

/** What a campus may see of a medical certificate: validity, never the diagnosis. */
export interface CampusCertificate {
  id: string;
  studentName: string;
  rollNumber: string;
  purpose: string;
  issuedBy: string;
  dates: string;
  status: CertificateStatus;
  checks: Array<{ label: string; passed: boolean }>;
}

type CertificateDecision = 'ACCEPT' | 'RETURN';

export interface CertificatesSource {
  /** `unconnected`: no certificate endpoint exists to read from. */
  load(): Promise<CampusCertificate[] | 'unconnected'>;
  decide(id: string, decision: CertificateDecision): Promise<void>;
}

/**
 * No endpoint receives or checks medical certificates yet, so the live source
 * says so; the board then shows its layout as "not connected" and never a row.
 */
const liveCertificatesSource: CertificatesSource = {
  load: async () => 'unconnected',
  decide: async () => { throw new Error('Certificate decisions are not connected.'); },
};

const BOARD = 'CampusCertificates';
type Tab = 'check' | 'accepted' | 'returned' | 'all';

const STATUS: Record<CertificateStatus, { label: MessageKey; tone: SkTone }> = {
  TO_CHECK: { label: 'campusBoards.certs.status.toCheck', tone: 'attention' },
  CHECK_FAILED: { label: 'campusBoards.certs.status.failed', tone: 'danger' },
  ACCEPTED: { label: 'campusBoards.certs.status.accepted', tone: 'positive' },
  RETURNED: { label: 'campusBoards.certs.status.returned', tone: 'neutral' },
};

const inTab = (tab: Tab, status: CertificateStatus) =>
  tab === 'all' || (tab === 'check' && (status === 'TO_CHECK' || status === 'CHECK_FAILED'))
  || (tab === 'accepted' && status === 'ACCEPTED') || (tab === 'returned' && status === 'RETURNED');

/**
 * Certificates (design page 4, CampusCertificates; Tier 3). The board is built
 * for certificates a student chooses to submit (tabs, table, a drawer with the
 * automatic checks and Accept / Return). No endpoint feeds it yet, so the live
 * board is "not connected": no certificates, names or doctors are shown.
 */
export function CampusCertificatesScreen({ source = liveCertificatesSource }: { source?: CertificatesSource }): React.ReactElement {
  const t = useT();
  const boardRef = useBoardRef();
  const [load] = useState(() => () => source.load());
  const { state, retry } = useBoardLoad(load);
  const [tab, setTab] = useState<Tab>('check');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const certificates = state.kind === 'ready' && state.data !== 'unconnected' ? state.data : [];
  const status: ConsoleTableStatus = state.kind === 'loading' ? 'loading'
    : state.kind === 'failed' ? 'error'
      : state.data === 'unconnected' ? 'unconnected'
        : state.data.length === 0 ? 'empty' : 'ready';
  const current = certificates.find((item) => item.id === openId) ?? null;
  const toCheck = certificates.filter((item) => inTab('check', item.status)).length;

  const decide = async (decision: CertificateDecision) => {
    if (!current) return;
    setBusy(true);
    setFailed(false);
    try {
      await source.decide(current.id, decision);
      setOpenId(null);
      retry();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const rows: DataTableRow[] = certificates.filter((item) => inTab(tab, item.status)).map((item) => ({
    id: item.id,
    cells: [
      { text: item.studentName, sub: item.rollNumber, weight: 'strong' },
      { text: item.purpose },
      { text: item.issuedBy, tone: item.status === 'CHECK_FAILED' ? 'danger' : undefined },
      { text: item.dates, mono: true },
      { pill: { label: t(STATUS[item.status].label), tone: STATUS[item.status].tone } },
    ],
    actions: [{ label: t('campusBoards.certs.open'), accessibleLabel: t('campusBoards.certs.openOne', { name: item.studentName }), onSelect: () => { setFailed(false); setOpenId(item.id); } }],
  }));

  return (
    <>
      <ConsoleTablePage
        className="cb-board"
        status={status}
        header={{ title: t('campusBoards.certs.title'), subtitle: t('campusBoards.certs.subtitle') }}
        filters={{
          label: t('campusBoards.certs.tabsLabel'),
          value: tab,
          onChange: (id) => setTab(id as Tab),
          options: [
            { id: 'check', label: t('campusBoards.certs.tab.check'), count: String(toCheck) },
            { id: 'accepted', label: t('campusBoards.certs.tab.accepted') },
            { id: 'returned', label: t('campusBoards.certs.tab.returned') },
            { id: 'all', label: t('campusBoards.certs.tab.all'), count: String(certificates.length) },
          ],
        }}
        table={{
          caption: t('campusBoards.certs.title'),
          rowActions: true,
          columns: [
            { label: t('campusBoards.certs.col.student') },
            { label: t('campusBoards.certs.col.for'), width: '230px' },
            { label: t('campusBoards.certs.col.issuedBy'), width: '220px' },
            { label: t('campusBoards.certs.col.dates'), width: '130px' },
            { label: t('campusBoards.certs.col.status'), width: '140px' },
          ],
          rows,
        }}
        noMatches={{ title: t('campusBoards.certs.noMatchTitle'), body: t('campusBoards.certs.noMatchBody') }}
        unconnected={{ title: t('campusBoards.certs.unconnectedTitle'), body: t('campusBoards.certs.unconnectedBody') }}
        empty={{ title: t('campusBoards.certs.empty'), body: t('campusBoards.emptyBody'), icon3d: 'chart-alt--p4', action: { label: t('campusBoards.emptyCta'), onSelect: () => navigate('campus/students') } }}
        error={{ title: t('campusBoards.certs.error'), reference: boardRef(state.kind === 'failed' ? state.status : 0, BOARD), onRetry: retry, onHelp: () => navigate('support') }}
        loadingLabel={t('campusBoards.certs.loading')}
      />
      <Drawer
        open={current !== null}
        title={current ? t('campusBoards.certs.drawer.title', { name: current.studentName }) : ''}
        subtitle={current ? t('campusBoards.certs.drawer.issuedBy', { doctor: current.issuedBy }) : undefined}
        busy={busy}
        onClose={() => setOpenId(null)}
      >
        {current ? (
          <div className="cb-decide">
            <StatusPill tone={STATUS[current.status].tone}>{t(STATUS[current.status].label)}</StatusPill>
            <div className="cb-cert">
              <span className="cb-eyebrow">{t('campusBoards.certs.drawer.seeEyebrow')}</span>
              <strong>{current.studentName}</strong>
              <span>{t('campusBoards.certs.drawer.unfit', { dates: current.dates })}</span>
              <span className="cb-cert__withheld">{t('campusBoards.certs.drawer.reason')}</span>
            </div>
            <span className="cb-eyebrow">{t('campusBoards.certs.drawer.checks')}</span>
            <ul className="cb-checks">
              {current.checks.map((check) => (
                <li key={check.label} className={check.passed ? 'is-pass' : 'is-fail'}>
                  <span className="cb-checks__mark" aria-hidden="true"><Icon name={check.passed ? 'check' : 'alert-triangle'} size={14} strokeWidth={2.4} /></span>
                  <span>{check.label}</span>
                  <span className="sk-visually-hidden">{t(check.passed ? 'campusBoards.certs.drawer.passed' : 'campusBoards.certs.drawer.notPassed')}</span>
                </li>
              ))}
            </ul>
            {failed ? (
              <div className="sk-note sk-note--danger" role="alert">
                <Icon name="alert-triangle" size={16} strokeWidth={2} />
                <span>{t('campusBoards.certs.drawer.failed', { ref: boardRef(0, BOARD) })}</span>
              </div>
            ) : null}
            <div className="cb-decide__actions">
              <SkButton variant="secondary" disabled={busy} onClick={() => { void decide('RETURN'); }}>{t('campusBoards.certs.drawer.return')}</SkButton>
              <SkButton busy={busy} onClick={() => { void decide('ACCEPT'); }}>{t('campusBoards.certs.drawer.accept')}</SkButton>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
