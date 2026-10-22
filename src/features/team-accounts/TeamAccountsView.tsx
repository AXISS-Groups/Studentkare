import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { when } from '@/features/admin/model/format';
import { STAFF_PIN_LENGTH } from '@/features/auth/viewmodel/AuthViewModel';
import { teamAccountsRepository } from './teamAccountsRepository';
import type { TeamAccount, TeamAccountsRepository } from './teamAccountsRepository';
import { TeamAccountsViewModel } from './TeamAccountsViewModel';
import './team-accounts.css';

type Translate = ReturnType<typeof useT>;

function roleLabel(account: TeamAccount, t: Translate): string {
  const role = t(`admin.role.${account.role}` as MessageKey);
  return account.partnerKind ? `${role} · ${t(`team.kind.${account.partnerKind}` as MessageKey)}` : role;
}

function StateTag({ account }: { account: TeamAccount }) {
  const t = useT();
  if (!account.active) return <span className="sk-admin-tag is-neutral">{t('team.state.disabled')}</span>;
  if (account.locked) {
    return <span className="sk-admin-tag is-attention">
      <Icon name="lock" size={14} />{' '}{t('team.state.locked')}
      {account.lockedUntil ? <span className="sk-team-accounts__meta">{' '}{t('team.lockedUntil', { time: when(account.lockedUntil) })}</span> : null}
    </span>;
  }
  if (!account.hasPin) return <span className="sk-admin-tag is-attention">{t('team.state.noPin')}</span>;
  return <span className="sk-admin-tag is-positive">{t('team.state.active')}</span>;
}

/**
 * Super admin → Platform → Team accounts (/admin/team-accounts). Not on the canvas:
 * a console sub-page (DESIGN.md Tier 3) for the shared team accounts, one per role
 * (founder decision 2026-10-22). Lists each account, what it sees, its state and
 * last sign-in, with Rotate PIN (the new PIN is shown once), Unlock and Disable; the
 * server audits each. Rotating your own PIN asks for the current one first.
 */
export const TeamAccountsView = observer(function TeamAccountsView({ repository = teamAccountsRepository }: { repository?: TeamAccountsRepository }) {
  const t = useT();
  const [vm] = useState(() => new TeamAccountsViewModel(repository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const loaded = !vm.loading && !vm.error && vm.data !== null;
  const [copied, setCopied] = useState(false);

  const copy = (pin: string) => {
    void navigator.clipboard?.writeText(pin).then(() => setCopied(true), () => setCopied(false));
  };

  return <AdminPage eyebrow={t('admin.eyebrow.platform')} title={t('team.screen.title')} description={t('team.screen.description')}
    status={loaded ? (vm.data?.pinSignInEnabled
      ? <AdminStatus tone="positive">{t('team.screen.switchOn')}</AdminStatus>
      : <AdminStatus tone="attention">{t('team.screen.switchOff')}</AdminStatus>) : undefined}>
    {vm.notice && <div className="sk-admin-card sk-admin-card-heading" role="status">
      <p className="sk-admin-note"><Icon name="check" size={16} />{' '}{t(vm.notice.kind === 'unlocked' ? 'team.action.unlocked' : 'team.action.disabled', { name: vm.notice.name })}</p>
      <button type="button" className="sk-admin-button" onClick={vm.dismissNotice}>{t('team.screen.dismiss')}</button>
    </div>}
    {vm.actionError && <p className="sk-admin-form-error" role="alert">{t('team.action.failed')}</p>}

    <div className="sk-admin-card sk-admin-table-card">
      {vm.loading && !vm.data ? <AdminLoading label={t('team.screen.loading')} />
        : vm.error ? <AdminError title={t('team.screen.error')} message={vm.error} onRetry={vm.reload} />
          : <table className="sk-admin-table sk-team-accounts__table">
            <caption className="sk-admin-visually-hidden">{t('team.screen.caption')}</caption>
            <thead><tr>
              <th scope="col">{t('team.col.account')}</th><th scope="col">{t('team.col.role')}</th><th scope="col">{t('team.col.scope')}</th>
              <th scope="col">{t('team.col.state')}</th><th scope="col">{t('team.col.lastSignIn')}</th><th scope="col">{t('team.col.actions')}</th>
            </tr></thead>
            <tbody>{vm.items.length ? vm.items.map(account => {
              const busy = vm.busyId === account.id;
              return <tr key={account.id}>
                <td>
                  <strong>{account.fullName}</strong>
                  {account.isSelf ? <span className="sk-admin-tag is-neutral sk-team-accounts__you">{t('team.screen.you')}</span> : null}
                  <span className="sk-team-accounts__id">{account.identifier}</span>
                </td>
                <td>{roleLabel(account, t)}</td>
                <td>{account.scope || t(account.role === 'SUPER_ADMIN' ? 'team.scope.platform' : 'team.scope.own')}</td>
                <td><StateTag account={account} /></td>
                <td>{account.lastSignInAt ? when(account.lastSignInAt) : t('team.lastSignIn.never')}</td>
                <td><div className="sk-team-accounts__actions">
                  <button type="button" className="sk-admin-button" disabled={busy} aria-label={t('team.action.rotateAria', { name: account.fullName })} onClick={() => vm.openRotate(account)}>
                    <Icon name="refresh" size={16} />{t('team.action.rotate')}
                  </button>
                  {account.locked ? <button type="button" className="sk-admin-button" disabled={busy} aria-busy={busy} aria-label={t('team.action.unlockAria', { name: account.fullName })} onClick={() => void vm.unlock(account)}>
                    <Icon name="key" size={16} />{t('team.action.unlock')}
                  </button> : null}
                  {account.active && !account.isSelf ? <button type="button" className="sk-admin-button" disabled={busy} aria-label={t('team.action.disableAria', { name: account.fullName })} onClick={() => vm.openDisable(account)}>
                    <Icon name="x" size={16} />{t('team.action.disable')}
                  </button> : null}
                </div></td>
              </tr>;
            }) : <tr><td colSpan={6}><AdminEmpty title={t('team.screen.empty')} description={t('team.screen.emptyBody')} /></td></tr>}</tbody>
          </table>}
    </div>
    <p className="sk-admin-note"><Icon name="info" size={16} />{' '}{t('team.screen.superAdminReal')}</p>

    <ConfirmDialog
      open={vm.rotateTarget !== null}
      title={vm.rotateTarget ? t('team.rotate.title', { name: vm.rotateTarget.fullName }) : ''}
      body={vm.rotatingSelf ? t('team.rotate.selfBody') : t('team.rotate.body')}
      confirmLabel={t('team.rotate.confirm')}
      busyLabel={t('team.rotate.busy')}
      busy={vm.rotating}
      onConfirm={() => { if (vm.canRotate) void vm.rotate(); }}
      onCancel={vm.closeRotate}
      done={vm.shownPin ? {
        title: t('team.rotate.doneTitle', { name: vm.shownPin.name }),
        body: <div className="sk-team-accounts__pin-card">
          <span className="sk-team-accounts__pin-label" id="sk-team-new-pin-label">{t('team.rotate.pinLabel')}</span>
          <output className="sk-team-accounts__pin" aria-labelledby="sk-team-new-pin-label">{vm.shownPin.pin}</output>
          <p>{t('team.rotate.doneBody')}</p>
          <button type="button" className="sk-team-accounts__copy" onClick={() => copy(vm.shownPin?.pin ?? '')}>
            <Icon name="copy" size={16} />{copied ? t('team.rotate.copied') : t('team.rotate.copy')}
          </button>
        </div>,
        actionLabel: t('team.rotate.close'),
        onAction: () => { setCopied(false); vm.closeRotate(); },
      } : null}
    >
      {vm.rotatingSelf ? <div className="sk-team-accounts__current">
        <label htmlFor="sk-team-current-pin">{t('team.rotate.current')}</label>
        <input id="sk-team-current-pin" type="password" inputMode="numeric" autoComplete="off" pattern={`[0-9]{${STAFF_PIN_LENGTH}}`} maxLength={STAFF_PIN_LENGTH}
          value={vm.currentPin} aria-invalid={vm.rotateFailure === 'selfRefused'} aria-describedby={vm.rotateFailure ? 'sk-team-rotate-error' : undefined}
          onChange={event => vm.setCurrentPin(event.target.value)} />
      </div> : null}
      {vm.rotateFailure ? <p className="sk-admin-form-error" role="alert" id="sk-team-rotate-error">
        {t(vm.rotateFailure === 'selfRefused' ? 'team.rotate.selfRefused' : 'team.action.failed')}
      </p> : null}
    </ConfirmDialog>

    <ConfirmDialog
      open={vm.disableTarget !== null}
      tone="danger"
      title={vm.disableTarget ? t('team.disable.title', { name: vm.disableTarget.fullName }) : ''}
      body={t('team.disable.body')}
      confirmLabel={t('team.disable.confirm')}
      busyLabel={t('team.disable.busy')}
      busy={vm.disabling}
      onConfirm={() => void vm.disable()}
      onCancel={vm.closeDisable}
    />
  </AdminPage>;
});
