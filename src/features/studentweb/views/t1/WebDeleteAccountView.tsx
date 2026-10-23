import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { navigate } from '@/lib/utils/workflowRouting';
import { CONFIRM_WORD, DeleteAccountViewModel, deletionGraceDays } from '@/features/account/viewmodel/DeleteAccountViewModel';
import { ErrorPanel, LoadingRows, OfflinePanel, PageHead } from '../parts';
import { CrisisLine, IconNote } from './shared';
import '../../studentweb.css';
import './t1web.css';

const longDate = (seconds: number | null) => (seconds ? new Date(seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Delete my account, web (canvas 3b, WebDeleteAccount, Tier 1 — approved by
 * Krishna Chintakayala, 2026-10-21). Same view-model as the phone board
 * (GET/POST/DELETE /records/deletion-request); the schedule and the sealed
 * copy's retention come from the server. No animation: a destructive confirm.
 * Red is used because deleting an account is on the founder's danger list.
 *
 * Not drawn, on purpose (D6-9): the PDF + FHIR export (the export is a JSON
 * file), the code sent to the phone (no server step), the request id and "we've
 * emailed you" (the server returns and sends neither), the "kept because the
 * law requires it" lines and the grievance address (they need legal sign-off,
 * D6-10), and the ABHA line (no ABHA is linked to a Student Kare account).
 */
export const WebDeleteAccountView = observer(function WebDeleteAccountView({ viewModel: vm }: { viewModel: DeleteAccountViewModel }) {
  const t = useT();
  const online = useOnline();
  const [confirming, setConfirming] = useState(false);
  const s = vm.state;

  let body: React.ReactNode;
  if (!s && !vm.loadFailed) body = <LoadingRows label={t('common.loading')} rows={3} />;
  else if (vm.loadFailed || !s) body = online ? <ErrorPanel title={t('del.failedTitle')} body={t('del.failedBody')} onRetry={() => void vm.load()} /> : <OfflinePanel onRetry={() => void vm.load()} />;
  else if (vm.scheduled) {
    body = (
      <section className="sk-sw-card sk-swt-form" aria-labelledby="sk-swt-del-scheduled" data-testid="delete-scheduled">
        <span className="sk-sw-eyebrow">{t('swt.del.scheduledEyebrow')}</span>
        <h2 id="sk-swt-del-scheduled" className="sk-sw-h2">{t('del.scheduledTitle', { date: longDate(s.scheduledFor) })}</h2>
        <p className="sk-sw-muted">{t('del.scheduledBody')} {t('swt.del.stillWorks')}</p>
        {vm.error ? <p className="sk-sw-error" role="alert">{t(vm.error)}</p> : null}
        <button type="button" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--block" disabled={vm.busy || !online} aria-busy={vm.busy} onClick={() => void vm.cancel()}>{t('del.keep')}</button>
      </section>
    );
  } else {
    body = (
      <div className="sk-swt-form">
        <button type="button" className="sk-swt-download" onClick={() => navigate('data-export')}>
          <Icon name="download" size={20} />
          <span><strong>{t('del.export')}</strong><small>{t('swt.del.exportMeta')}</small></span>
          <Icon name="arrow-right" size={18} />
        </button>
        <section className="sk-swt-list is-danger" aria-labelledby="sk-swt-del-what">
          <h2 id="sk-swt-del-what">{t('del.what')}</h2>
          <ul>
            <li><Icon name="x" size={15} />{t('del.p1', { graceDays: deletionGraceDays(s) })}</li>
            <li><Icon name="x" size={15} />{t('del.p2')}</li>
          </ul>
        </section>
        <section className="sk-swt-list is-attention" aria-labelledby="sk-swt-del-kept">
          <h2 id="sk-swt-del-kept">{t('swt.del.keptTitle')}</h2>
          <ul>
            <li><Icon name="lock-keyhole" size={15} />{s.archiveRetentionDays ? t('del.p3days', { days: s.archiveRetentionDays }) : t('del.p3')}</li>
            <li><Icon name="lock-keyhole" size={15} />{t('del.p4')}</li>
          </ul>
        </section>
        {!confirming ? (
          <button type="button" className="sk-sw-btn sk-sw-btn--danger-outline sk-sw-btn--block" onClick={() => setConfirming(true)}>{t('swt.del.continue')}</button>
        ) : (
          <form className="sk-sw-card sk-swt-form" onSubmit={(event) => { event.preventDefault(); void vm.confirm(); }} aria-labelledby="sk-swt-del-confirm">
            <h2 id="sk-swt-del-confirm" className="sk-sw-card__title">{t('swt.del.confirmTitle')}</h2>
            <label className="sk-sw-field sk-swt-confirm-field">{t('del.typeToConfirm', { word: CONFIRM_WORD })}
              <input value={vm.confirmText} maxLength={10} autoComplete="off" autoCapitalize="characters" onChange={(event) => vm.setConfirmText(event.target.value)} />
            </label>
            {vm.error ? <p className="sk-sw-error" role="alert">{t(vm.error)}</p> : null}
            <div className="sk-sw-head__actions">
              <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={vm.busy} onClick={() => { setConfirming(false); vm.setConfirmText(''); }}>{t('common.back')}</button>
              <button type="submit" className="sk-sw-btn sk-swt-danger-btn" disabled={!vm.canConfirm || !online} aria-busy={vm.busy}>{t('del.confirm', { graceDays: deletionGraceDays(s) })}</button>
            </div>
            <IconNote icon="shield-half">{t('swt.del.crisisNote')}</IconNote>
            <CrisisLine />
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="sk-sw-page" data-testid="web-delete-account">
      <div className="sk-swt-two">
        <div className="sk-swt-col">
          <PageHead title={t('del.title')} sub={t('swt.del.sub')} />
          {body}
        </div>
        <aside className="sk-sw-card sk-swt-side" aria-labelledby="sk-swt-del-not">
          <h2 id="sk-swt-del-not" className="sk-sw-eyebrow">{t('swt.del.notReady')}</h2>
          <ul>
            <li><Icon name="arrow-right" size={15} /><span>{t('swt.del.leaving')} <button type="button" className="sk-sw-link" onClick={() => navigate('leave-campus')}>{t('swt.del.leavingLink')}</button></span></li>
            <li><Icon name="arrow-right" size={15} /><span>{t('swt.del.worried')} <button type="button" className="sk-sw-link" onClick={() => navigate('security')}>{t('swt.del.worriedLink')}</button> {t('swt.del.worriedAnd')} <button type="button" className="sk-sw-link" onClick={() => navigate('records')}>{t('swt.del.shares')}</button></span></li>
            <li><Icon name="arrow-right" size={15} /><span>{t('swt.del.questions')} <button type="button" className="sk-sw-link" onClick={() => navigate('my-requests')}>{t('swt.del.questionsLink')}</button></span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
});

export function WebDeleteAccountRoute(): React.ReactElement {
  const [vm] = useState(() => new DeleteAccountViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <WebDeleteAccountView viewModel={vm} />;
}
