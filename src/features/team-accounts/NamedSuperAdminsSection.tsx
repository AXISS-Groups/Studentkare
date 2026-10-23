import React, { useCallback, useEffect, useState } from 'react';
import { AdminEmpty, AdminError, AdminLoading } from '@/screens/workspace/admin/AdminPage';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { when } from '@/features/admin/model/format';
import { namedSuperAdminsRepository, RETIRE_CONFIRM_WORD } from './teamAccountsRepository';
import type { NamedSuperAdminState, NamedSuperAdminsRepository } from './teamAccountsRepository';

const STEPS: readonly MessageKey[] = ['team.retire.step1', 'team.retire.step2', 'team.retire.step3', 'team.retire.step4'];

/**
 * Super admin → Team accounts: named super admins and the guided retirement of
 * the shared one (audit H3; plan tier1-canvas-wp03, amendment 2026-10-23).
 * Create one person's super admin (email + name; the server holds them to an
 * authenticator on first sign-in and audits it), see who has signed in with
 * their authenticator, and — only from a named account, only once one of them
 * has signed in with it — retire the shared superadmin@ (typed confirmation).
 * The steps state what is done from the server's answer, never assumed.
 */
export function NamedSuperAdminsSection({ repository = namedSuperAdminsRepository, onChanged }: { repository?: NamedSuperAdminsRepository; onChanged?: () => void }) {
  const t = useT();
  const [state, setState] = useState<NamedSuperAdminState | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '' });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [retiring, setRetiring] = useState(false);
  const [typed, setTyped] = useState('');

  const load = useCallback(() => {
    setError(false);
    repository.state().then(setState, () => setError(true));
  }, [repository]);
  useEffect(load, [load]);

  const create = () => {
    setBusy(true);
    setFailed(false);
    const name = form.fullName.trim();
    repository.create(form.email.trim(), name).then((next) => {
      setState(next);
      setCreating(false);
      setForm({ email: '', fullName: '' });
      setNotice(t('team.named.created', { name }));
    }, () => setFailed(true)).finally(() => setBusy(false));
  };

  const retire = () => {
    setBusy(true);
    setFailed(false);
    repository.retireShared(typed.trim()).then((next) => {
      setState(next);
      setRetiring(false);
      setTyped('');
      setNotice(t('team.retire.done'));
      onChanged?.();
    }, () => setFailed(true)).finally(() => setBusy(false));
  };

  if (error) return <AdminError title={t('team.named.error')} message={t('privacy.error.body')} onRetry={load} />;
  if (!state) return <AdminLoading label={t('team.named.loading')} />;

  const retired = state.shared?.retired === true;
  const done = [state.items.length > 0, state.items.some((item) => item.twoFactorEnabled), state.readyToRetire, retired];
  const canRetire = state.readyToRetire && state.viewerIsNamed && !retired && state.shared !== null;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  return <>
    {notice ? <div className="sk-admin-card sk-admin-card-heading" role="status">
      <p className="sk-admin-note"><Icon name="check" size={16} />{' '}{notice}</p>
    </div> : null}
    <section className="sk-admin-card sk-admin-table-card sk-team-named" aria-labelledby="sk-team-named-title">
      <div className="sk-team-named__head">
        <div>
          <h2 id="sk-team-named-title" className="sk-team-named__title">{t('team.named.title')}</h2>
          <p className="sk-team-named__body">{t('team.named.body')}</p>
        </div>
        <button type="button" className="sk-admin-button" onClick={() => { setFailed(false); setCreating(true); }}>
          <Icon name="plus" size={16} />{t('team.named.create')}
        </button>
      </div>
      {state.items.length ? <table className="sk-admin-table">
        <caption className="sk-admin-visually-hidden">{t('team.named.caption')}</caption>
        <thead><tr>
          <th scope="col">{t('team.named.colPerson')}</th><th scope="col">{t('team.named.colAuthenticator')}</th><th scope="col">{t('team.named.colTotp')}</th>
        </tr></thead>
        <tbody>{state.items.map((item) => <tr key={item.id}>
          <td><strong>{item.fullName}</strong>{item.isSelf ? <span className="sk-admin-tag is-neutral sk-team-accounts__you">{t('team.screen.you')}</span> : null}
            <span className="sk-team-accounts__id">{item.identifier}</span></td>
          <td><span className={`sk-admin-tag ${item.twoFactorEnabled ? 'is-positive' : 'is-attention'}`}>{t(item.twoFactorEnabled ? 'team.named.twofaOn' : 'team.named.twofaOff')}</span></td>
          <td>{item.totpSignedInAt ? when(item.totpSignedInAt) : t('team.named.totpNever')}</td>
        </tr>)}</tbody>
      </table> : <AdminEmpty title={t('team.named.empty')} description={t('team.named.emptyBody')} />}
    </section>

    <section className="sk-admin-card sk-team-retire" aria-labelledby="sk-team-retire-title">
      <h2 id="sk-team-retire-title" className="sk-team-named__title">{t('team.retire.title')}</h2>
      <ol className="sk-team-retire__steps">
        {STEPS.map((step, index) => <li key={step} className="sk-team-retire__step" data-done={done[index]}>
          <span className="sk-team-retire__mark" aria-hidden="true">{done[index] ? <Icon name="check" size={14} /> : index + 1}</span>
          <span>{t(step)} <span className={`sk-admin-tag ${done[index] ? 'is-positive' : 'is-neutral'}`}>{t(done[index] ? 'team.retire.stepDone' : 'team.retire.stepTodo')}</span></span>
        </li>)}
      </ol>
      {retired ? <p className="sk-admin-note" role="status"><Icon name="check" size={16} />{' '}{t('team.retire.done')}</p>
        : <>
          {!state.readyToRetire ? <p className="sk-admin-note"><Icon name="info" size={16} />{' '}{t('team.retire.notReady')}</p>
            : !state.viewerIsNamed ? <p className="sk-admin-note"><Icon name="info" size={16} />{' '}{t('team.retire.notNamed')}</p> : null}
          <button type="button" className="sk-admin-button" disabled={!canRetire} onClick={() => { setFailed(false); setTyped(''); setRetiring(true); }}>
            <Icon name="lock" size={16} />{t('team.retire.cta')}
          </button>
        </>}
    </section>

    <ConfirmDialog
      open={creating}
      title={t('team.named.createTitle')}
      body={t('team.named.createBody')}
      confirmLabel={t('team.named.create')}
      busyLabel={t('team.named.creating')}
      busy={busy}
      onConfirm={() => { if (emailOk && form.fullName.trim().length >= 2) create(); }}
      onCancel={() => setCreating(false)}
    >
      <div className="sk-team-accounts__current">
        <label htmlFor="sk-team-named-email">{t('team.named.email')}</label>
        <input id="sk-team-named-email" type="email" autoComplete="off" maxLength={254} value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })} />
      </div>
      <div className="sk-team-accounts__current">
        <label htmlFor="sk-team-named-name">{t('team.named.name')}</label>
        <input id="sk-team-named-name" type="text" autoComplete="off" maxLength={120} value={form.fullName}
          onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
      </div>
      {failed ? <p className="sk-admin-form-error" role="alert">{t('team.action.failed')}</p> : null}
    </ConfirmDialog>

    <ConfirmDialog
      open={retiring}
      tone="danger"
      title={t('team.retire.confirmTitle')}
      body={t('team.retire.confirmBody', { word: RETIRE_CONFIRM_WORD })}
      confirmLabel={t('team.retire.confirm')}
      busyLabel={t('team.retire.busy')}
      busy={busy}
      onConfirm={() => { if (typed.trim() === RETIRE_CONFIRM_WORD) retire(); }}
      onCancel={() => setRetiring(false)}
    >
      <div className="sk-team-accounts__current">
        <label htmlFor="sk-team-retire-word">{t('team.retire.confirmLabel', { word: RETIRE_CONFIRM_WORD })}</label>
        <input id="sk-team-retire-word" type="text" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} />
      </div>
      {failed ? <p className="sk-admin-form-error" role="alert">{t('team.action.failed')}</p> : null}
    </ConfirmDialog>
  </>;
}
