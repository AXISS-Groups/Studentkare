import React, { useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { DataTable } from '@/design-system/data/DataTable';
import type { DataTableRow } from '@/design-system/data/DataTable';
import { Avatar, SkButton, Skeleton } from '@/design-system/primitives';
import { Icon, Icon3d } from '@/design-system/icons';
import { apiRequest } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import type { AccountRole } from '@/data/types/workflowTypes';
import { initialsOf } from '@/features/clinician/shared/names';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { canAccessRoute, navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { HTTP_FORBIDDEN, NotConnected, Unavailable, useBoardLoad, useBoardRef } from './boardKit';
import './campus-boards.css';

/** A campus-scoped staff account, from GET /ops/campus/team (scoped to the caller's campus). */
export interface CampusStaff {
  id: string;
  fullName: string;
  identifier: string;
  role: 'CAMPUS_ADMIN' | 'COUNSELLOR';
  active: boolean;
  twoFactorEnabled: boolean;
  campus: string;
}

export interface TeamSource { load(): Promise<CampusStaff[]> }

/** The campus team endpoint (GET /ops/campus/team): the board used to call the super-admin /ops/accounts and got a 403. */
export const CAMPUS_TEAM_PATH = '/ops/campus/team';
interface TeamPage { items: Array<Omit<CampusStaff, 'role'> & { role: string }> }

export const liveTeamSource: TeamSource = {
  async load() {
    const page = await apiRequest<TeamPage>(CAMPUS_TEAM_PATH);
    return page.items
      .filter((item): item is TeamPage['items'][number] & { role: CampusStaff['role'] } => item.role === 'CAMPUS_ADMIN' || item.role === 'COUNSELLOR')
      .map((item) => ({ id: item.id, fullName: item.fullName, identifier: item.identifier, role: item.role, active: item.active, twoFactorEnabled: item.twoFactorEnabled, campus: item.campus ?? '' }));
  },
};

const BOARD = 'CampusAdminTeam';

/** What each campus role may open, read from the app's own route gate (canAccessRoute). */
const PERMISSIONS: Array<{ label: MessageKey; route: RoutePath | null }> = [
  { label: 'campusBoards.team.perm.roster', route: 'campus/students' },
  { label: 'campusBoards.team.perm.insights', route: 'campus/insights' },
  { label: 'campusBoards.team.perm.access', route: 'campus-access-requests' },
  { label: 'campusBoards.team.perm.breakGlass', route: 'campus-break-glass' },
  { label: 'campusBoards.team.perm.incidents', route: 'campus/incidents' },
  { label: 'campusBoards.team.perm.counsellor', route: 'counsellor' },
  // Staff accounts are created by a super admin only (POST /ops/accounts): no campus role can invite.
  { label: 'campusBoards.team.perm.invite', route: null },
];
const MATRIX_ROLES: ReadonlyArray<{ role: AccountRole; label: MessageKey }> = [
  { role: 'CAMPUS_ADMIN', label: 'campusShell.role.CAMPUS_ADMIN' },
  { role: 'COUNSELLOR', label: 'campusBoards.team.role.COUNSELLOR' },
];

/**
 * Admin team (design page 4, CampusAdminTeam; Tier 3). The staff list is the
 * campus admins and counsellors of the caller's own campus (GET /ops/campus/team;
 * a super admin sees every campus). A 403 now means the admin has no campus
 * assigned, and the board says so. The role matrix is read from the
 * app's route gate, so it can't drift from what each role can really open.
 * Hostel admin and medical officer roles do not exist yet and are not drawn.
 */
export function CampusAdminTeamScreen({ source = liveTeamSource }: { source?: TeamSource }): React.ReactElement {
  const t = useT();
  const { user } = useAuth();
  const boardRef = useBoardRef();
  const [load] = useState(() => () => source.load());
  const { state, retry } = useBoardLoad(load);
  const superAdmin = user?.role === 'SUPER_ADMIN';

  const header = (
    <ConsolePageHeader
      title={t('campusBoards.team.title')}
      subtitle={t('campusBoards.team.subtitle')}
      actions={superAdmin ? (
        <SkButton onClick={() => navigate('admin/accounts')}>
          <Icon name="plus" size={17} strokeWidth={1.9} />
          {t('campusBoards.team.invite')}
        </SkButton>
      ) : (
        <SkButton disabled>
            <Icon name="plus" size={17} strokeWidth={1.9} />
          {t('campusBoards.team.invite')}
          <Unavailable reason="campusBoards.team.inviteSuperOnly" />
        </SkButton>
      )}
    />
  );

  let list: React.ReactNode;
  if (state.kind === 'loading') {
    list = (
      <div className="cb-skel-list" role="status" aria-busy="true" aria-label={t('campusBoards.team.loading')}>
        {[0, 1, 2, 3].map((key) => <Skeleton key={key} height={54} />)}
      </div>
    );
  } else if (state.kind === 'failed' && state.status === HTTP_FORBIDDEN) {
    list = (
      <div className="sk-card">
        <NotConnected icon="lock" titleKey="campusBoards.team.restrictedTitle" bodyKey="campusBoards.team.restrictedBody" />
      </div>
    );
  } else if (state.kind === 'failed') {
    list = (
      <div className="sk-state__body sk-state__body--card cb-inline-error" role="alert">
        <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
        <h2 className="sk-state__title">{t('campusBoards.team.error')}</h2>
        <p className="sk-state__text">{t('console.error.body')}</p>
        <div className="sk-state__actions"><SkButton onClick={retry}>{t('common.tryAgain')}</SkButton></div>
        <span className="sk-state__ref">{boardRef(state.status, BOARD)}</span>
      </div>
    );
  } else if (state.data.length === 0) {
    list = (
      <div className="sk-state">
        <div className="sk-state__body">
          <Icon3d name="chart-alt--p4" size={96} />
          <h2 className="sk-state__title">{t('campusBoards.team.empty')}</h2>
          <p className="sk-state__text">{t('campusBoards.team.emptyBody')}</p>
        </div>
      </div>
    );
  } else {
    const rows: DataTableRow[] = state.data.map((member) => ({
      id: member.id,
      muted: !member.active,
      cells: [
        { node: (
          <span className="cb-person">
            <Avatar initials={initialsOf(member.fullName)} />
            <span className="cb-person__text"><strong>{member.fullName}</strong><span>{member.identifier}</span></span>
          </span>
        ) },
        { pill: member.role === 'CAMPUS_ADMIN' ? { label: t('campusShell.role.CAMPUS_ADMIN'), tone: 'action' } : { label: t('campusBoards.team.role.COUNSELLOR'), tone: 'attention' } },
        { text: member.campus || t('campusBoards.notGiven') },
        { pill: member.twoFactorEnabled ? { label: t('campusBoards.team.twoFactorOn'), tone: 'positive' } : { label: t('campusBoards.team.twoFactorOff'), tone: 'danger' } },
        { text: member.active ? t('campusBoards.team.lastActiveUnknown') : t('campusBoards.team.inactive'), weight: 'muted', mono: true },
      ],
    }));
    list = (
      <DataTable
        caption={t('campusBoards.team.title')}
        columns={[
          { label: t('campusBoards.team.col.admin') },
          { label: t('campusBoards.team.col.role'), width: '170px' },
          { label: t('campusBoards.team.col.scope'), width: '190px' },
          { label: t('campusBoards.team.col.twoFactor'), width: '110px' },
          { label: t('campusBoards.team.col.lastActive'), width: '120px' },
        ]}
        rows={rows}
      />
    );
  }

  return (
    <div className="sk-ds cb-board">
      {header}
      {list}
      <div className="cb-two">
        <section className="sk-card" aria-labelledby="cb-perm-title">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cb-perm-title" className="sk-card__title">{t('campusBoards.team.perm.title')}</h2>
              <p className="sk-card__subtitle">{t('campusBoards.team.perm.subtitle')}</p>
            </span>
          </div>
          <table className="cb-matrix">
            <caption className="sk-visually-hidden">{t('campusBoards.team.perm.title')}</caption>
            <thead>
              <tr>
                <td />
                {MATRIX_ROLES.map((column) => <th key={column.role} scope="col">{t(column.label)}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission.label}>
                  <th scope="row">{t(permission.label)}</th>
                  {MATRIX_ROLES.map((column) => {
                    const allowed = permission.route !== null && canAccessRoute(permission.route, column.role);
                    return (
                      <td key={column.role} className={allowed ? 'is-yes' : 'is-no'}>
                        {allowed ? <Icon name="check" size={15} strokeWidth={2.4} /> : <span aria-hidden="true">{'—'}</span>}
                        <span className="sk-visually-hidden">{t(allowed ? 'campusBoards.team.perm.yes' : 'campusBoards.team.perm.no')}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sk-note sk-note--info">
            <Icon name="info" size={16} strokeWidth={1.9} />
            <span>{t('campusBoards.team.perm.note')}</span>
          </div>
        </section>
        <section className="sk-card" aria-labelledby="cb-changes-title">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cb-changes-title" className="sk-card__title">{t('campusBoards.team.changes.title')}</h2>
              <p className="sk-card__subtitle">{t('campusBoards.team.changes.subtitle')}</p>
            </span>
          </div>
          <NotConnected icon="user" titleKey="campusBoards.team.changes.offTitle" bodyKey="campusBoards.team.changes.offBody" />
        </section>
      </div>
    </div>
  );
}
