import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { navigate } from '@/lib/utils/workflowRouting';
import { LeaveCampusViewModel } from '@/features/campus/viewmodel/LeaveCampusViewModel';
import type { DepartureReason } from '@/features/campus/viewmodel/LeaveCampusViewModel';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead } from '../parts';
import { IconNote } from './shared';
import '../../studentweb.css';
import './t1web.css';

const REASONS: readonly DepartureReason[] = ['GRADUATING', 'TRANSFERRING', 'PAUSING'];
/** What campus_departure.py leaves alone (records, shares, reminders, the account). */
const STAYS: readonly MessageKey[] = ['leave.s1', 'leave.s2', 'leave.s3'];

/**
 * Leaving campus, web (canvas 3b, WebLeaveCampus, Tier 1 — approved by
 * Krishna Chintakayala, 2026-10-21). Same view-model and rules as the phone
 * board (GET/POST /campus/departure, /cancel to undo); the effective date is
 * the server's.
 *
 * Every "stays" and "changes" line is something campus_departure.py does
 * (D9-9). Not drawn: the personal-email field (the request doesn't take one —
 * there is no verified recovery address to change), the plan picker (plans are
 * compared on Plan & billing), "Care Circle" (doesn't exist), "Edu ID prices
 * end" and "checks carry over to a new campus" (neither is something the
 * backend does).
 */
export const WebLeaveCampusView = observer(function WebLeaveCampusView({ viewModel: vm }: { viewModel: LeaveCampusViewModel }) {
  const t = useT();
  const online = useOnline();
  const s = vm.state;
  const title = s?.campus ? t('leave.titleNamed', { university: s.campus.university }) : t('leave.title');

  let body: React.ReactNode = null;
  if (vm.stage === 'loading') body = <LoadingRows label={t('common.loading')} rows={3} />;
  else if (vm.stage === 'failed') body = online ? <ErrorPanel title={t('del.failedTitle')} body={t('del.failedBody')} onRetry={() => void vm.load()} /> : <OfflinePanel onRetry={() => void vm.load()} />;
  else if (vm.stage === 'notLinked') body = <EmptyPanel title={t('leave.notLinkedTitle')} body={t('leave.notLinkedBody')} action={{ label: t('leave.seeRecords'), onPress: () => navigate('records') }} />;
  else if (vm.stage === 'scheduled' && s?.departure) {
    body = (
      <section className="sk-sw-card sk-sw-state" data-testid="leave-campus-scheduled" aria-labelledby="sk-swt-leave-done">
        <Icon name="check" size={36} color="var(--sk-color-positive)" />
        <h2 id="sk-swt-leave-done" className="sk-sw-state__title">{t('leave.scheduledTitle', { date: s.departure.effectiveOn })}</h2>
        <p className="sk-sw-state__body">{t('leave.scheduledBody')}</p>
        {vm.error ? <p className="sk-sw-error" role="alert">{say(t, vm.error)}</p> : null}
        <div className="sk-sw-state__actions">
          <button type="button" className="sk-sw-btn sk-sw-btn--primary" onClick={() => navigate('records')}>{t('leave.seeRecords')}</button>
          <button type="button" className="sk-sw-btn sk-sw-btn--outline" disabled={vm.busy} aria-busy={vm.busy} onClick={() => void vm.undo()}>{t('leave.undo')}</button>
        </div>
      </section>
    );
  } else if (vm.stage === 'completed') {
    body = <EmptyPanel title={t('leave.doneTitle')} body={t('leave.doneBody')} action={{ label: t('leave.seeRecords'), onPress: () => navigate('records') }} />;
  } else if (vm.stage === 'form' && s) {
    body = (
      <form className="sk-swt-form" onSubmit={(event) => { event.preventDefault(); void vm.submit(); }}>
        {s.signsInWithCollegeEmail ? <IconNote icon="alert-triangle" tone="attention"><strong>{t('leave.emailWarnTitle')}</strong> {t('leave.emailWarnBody')}</IconNote> : null}
        <fieldset className="sk-swt-radios">
          <legend className="sk-swt-group-label">{t('leave.what')}</legend>
          {REASONS.map((reason) => (
            <label key={reason} className="sk-swt-radio">
              <input type="radio" name="leave-reason" checked={vm.reason === reason} onChange={() => vm.setReason(reason)} />
              {t(`leave.reason.${reason}` as MessageKey)}
            </label>
          ))}
        </fieldset>
        {vm.needsDate ? (
          <label className="sk-sw-field">{vm.reason === 'GRADUATING' ? t('leave.lastDay') : t('leave.moveDay')}
            <input className="sk-sw-mono" type="date" min={s.today} value={vm.effectiveOn} aria-invalid={Boolean(vm.dateError)} onChange={(event) => vm.setEffectiveOn(event.target.value)} />
            {vm.dateError ? <span className="sk-sw-danger" role="alert">{t(vm.dateError)}</span> : null}
          </label>
        ) : null}
        {vm.reason === 'TRANSFERRING' ? (
          <label className="sk-sw-field">{t('leave.whereTo')}
            <input maxLength={160} value={vm.destination} onChange={(event) => vm.setDestination(event.target.value)} />
            <span className="sk-sw-fine">{t('leave.whereToHint')}</span>
          </label>
        ) : null}

        <section className="sk-swt-list is-positive" aria-labelledby="sk-swt-stays" data-testid="leave-campus-stays">
          <h2 id="sk-swt-stays">{t('leave.stays')}</h2>
          <ul>{STAYS.map((key) => <li key={key}><Icon name="check" size={15} />{t(key)}</li>)}</ul>
        </section>
        <section className="sk-swt-list is-attention" aria-labelledby="sk-swt-changes" data-testid="leave-campus-changes">
          <h2 id="sk-swt-changes">{t('leave.changes')}</h2>
          <ul>
            <li><Icon name="arrow-right" size={15} />{t('leave.c1', { college: s.campus?.university ?? t('leave.yourCollege') })}</li>
            <li><Icon name="arrow-right" size={15} />{t('leave.c2')}</li>
            <li><Icon name="arrow-right" size={15} />{t('swt.leave.cPass')}</li>
            {s.collegePlan ? <li><Icon name="arrow-right" size={15} />{t('leave.c3', { org: s.collegePlan.organization })}</li> : null}
          </ul>
          {vm.reason ? <p className="sk-sw-fine">{vm.reason === 'PAUSING' ? t('leave.effectToday') : t('leave.effectChosen')}</p> : null}
        </section>

        {vm.error ? <p className="sk-sw-error" role="alert">{say(t, vm.error)}</p> : null}
        <button type="submit" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--block" disabled={!vm.canSubmit || !online} aria-busy={vm.busy}>{t('leave.submit')}</button>
        {s.collegePlan ? <button type="button" className="sk-sw-link" onClick={() => navigate('billing')}>{t('leave.compare')}</button> : null}
      </form>
    );
  }

  return (
    <div className="sk-sw-page" data-testid="web-leave-campus">
      <div className="sk-swt-two">
        <div className="sk-swt-col">
          <PageHead title={title} sub={t('leave.intro')} />
          {body}
        </div>
        <aside className="sk-sw-card sk-swt-side" aria-labelledby="sk-swt-leave-know">
          <h2 id="sk-swt-leave-know" className="sk-sw-eyebrow">{t('swt.leave.knowTitle')}</h2>
          <ul>
            <li><Icon name="check" size={15} />{t('swt.leave.know1')}</li>
            <li><Icon name="check" size={15} />{t('swt.leave.know2')}</li>
            <li><Icon name="check" size={15} /><span>{t('swt.leave.know3')} <button type="button" className="sk-sw-link" onClick={() => navigate('data-export')}>{t('swt.leave.download')}</button></span></li>
          </ul>
          <button type="button" className="sk-sw-link" onClick={() => navigate('my-requests')}>{t('leave.support')}</button>
        </aside>
      </div>
    </div>
  );
});

export function WebLeaveCampusRoute(): React.ReactElement {
  const [vm] = useState(() => new LeaveCampusViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <WebLeaveCampusView viewModel={vm} />;
}
