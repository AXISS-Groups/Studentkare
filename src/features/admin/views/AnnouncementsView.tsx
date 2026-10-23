import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { BrandLogo, Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { announcementsRepository } from '../model/announcementsRepository';
import type { AnnouncementKind, AnnouncementStatus } from '../model/announcementsRepository';
import { count, when } from '../model/format';
import { AnnouncementsViewModel } from '../viewmodels/AnnouncementsViewModel';
import './announcements.css';

const KINDS: AnnouncementKind[] = ['ANNOUNCEMENT', 'OFFER'];
const KIND_LABEL: Record<AnnouncementKind, MessageKey> = { ANNOUNCEMENT: 'push.adm.kind.ANNOUNCEMENT', OFFER: 'push.adm.kind.OFFER' };
const STATUS_LABEL: Record<AnnouncementStatus, MessageKey> = {
  SCHEDULED: 'push.adm.status.SCHEDULED', SENDING: 'push.adm.status.SENDING', SENT: 'push.adm.status.SENT', CANCELLED: 'push.adm.status.CANCELLED',
};
const STATUS_TONE: Record<AnnouncementStatus, string> = { SCHEDULED: 'is-attention', SENDING: 'is-attention', SENT: 'is-positive', CANCELLED: 'is-neutral' };
const PROBLEM: Record<string, MessageKey> = {
  TITLE_EMPTY: 'push.adm.problem.TITLE_EMPTY',
  BODY_EMPTY: 'push.adm.problem.BODY_EMPTY',
  TITLE_TOO_LONG: 'push.adm.problem.TITLE_TOO_LONG',
  BODY_TOO_LONG: 'push.adm.problem.BODY_TOO_LONG',
  HEALTH_TERM: 'push.adm.problem.HEALTH_TERM',
  ASKS_FOR_CODE: 'push.adm.problem.ASKS_FOR_CODE',
  HAS_LINK: 'push.adm.problem.HAS_LINK',
  SCHEDULE_TOO_FAR: 'push.adm.problem.SCHEDULE_TOO_FAR',
  UNKNOWN_CAMPUS: 'push.adm.problem.UNKNOWN_CAMPUS',
};

/**
 * Super Admin → Content & AI → Announcements (/admin/announcements). Not on the
 * design canvas (Tier 3, built from the admin components).
 *
 * Write, preview (the server's non-health check and an audience count — counts
 * only, never a name), confirm, send now or at a time; the history shows each
 * announcement's device counts and lets a scheduled one be cancelled. Every
 * create and cancel is audited on the server. Offers reach only students who
 * opted in to offers (Rule L).
 */
export const AnnouncementsView = observer(function AnnouncementsView() {
  const t = useT();
  const [vm] = useState(() => new AnnouncementsViewModel(announcementsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const providers = vm.data?.providers;
  const preview = vm.preview;
  const scheduledAt = vm.scheduledAt;

  return <AdminPage eyebrow={t('admin.eyebrow.contentAi')} title={t('push.adm.title')} description={t('push.adm.description')}
    status={providers ? <span className="sk-admin-note">{t('push.adm.providers', {
      phone: t(providers.phone ? 'push.adm.providerOn' : 'push.adm.providerOff'),
      web: t(providers.web ? 'push.adm.providerOn' : 'push.adm.providerOff'),
    })}</span> : null}>
    <div className="sk-ann">
      <section className="sk-admin-card sk-ann__compose" aria-labelledby="sk-ann-compose">
        <h2 id="sk-ann-compose" className="sk-admin-card-title">{t('push.adm.compose')}</h2>
        <fieldset className="sk-ann__fieldset">
          <legend className="sk-admin-field-label">{t('push.adm.kind')}</legend>
          <div className="sk-admin-chips" role="group" aria-label={t('push.adm.kind')}>
            {KINDS.map((kind) => <button key={kind} type="button" aria-pressed={vm.kind === kind} onClick={() => vm.setKind(kind)}>{t(KIND_LABEL[kind])}</button>)}
          </div>
        </fieldset>
        <label className="sk-ann__field">
          <span className="sk-admin-field-label">{t('push.adm.campus')}</span>
          <select value={vm.campus} onChange={(event) => vm.setCampus(event.target.value)}>
            <option value="">{t('push.adm.campusAll')}</option>
            {(vm.data?.campuses ?? []).map((campus) => <option key={campus.name} value={campus.name}>{t('push.adm.campusOption', { campus: campus.name, count: count(campus.students) })}</option>)}
          </select>
        </label>
        <label className="sk-ann__field">
          <span className="sk-admin-field-label">{t('push.adm.titleLabel')}<small>{t('push.adm.chars', { count: count(vm.title.length), max: count(vm.titleMax) })}</small></span>
          <input value={vm.title} maxLength={vm.titleMax} onChange={(event) => vm.setTitle(event.target.value)} />
        </label>
        <label className="sk-ann__field">
          <span className="sk-admin-field-label">{t('push.adm.bodyLabel')}<small>{t('push.adm.chars', { count: count(vm.body.length), max: count(vm.bodyMax) })}</small></span>
          <textarea value={vm.body} maxLength={vm.bodyMax} rows={3} onChange={(event) => vm.setBody(event.target.value)} />
        </label>
        <fieldset className="sk-ann__fieldset">
          <legend className="sk-admin-field-label">{t('push.adm.when')}</legend>
          <div className="sk-admin-chips" role="group" aria-label={t('push.adm.when')}>
            <button type="button" aria-pressed={vm.when === 'now'} onClick={() => vm.setWhen('now')}>{t('push.adm.now')}</button>
            <button type="button" aria-pressed={vm.when === 'later'} onClick={() => vm.setWhen('later')}>{t('push.adm.later')}</button>
          </div>
          {vm.when === 'later' ? <label className="sk-ann__field">
            <span className="sk-admin-field-label">{t('push.adm.at')}</span>
            <input type="datetime-local" value={vm.at} onChange={(event) => vm.setAt(event.target.value)} />
          </label> : null}
        </fieldset>

        <div className="sk-ann__actions">
          <button type="button" className="sk-admin-button" disabled={!vm.canPreview} aria-busy={vm.previewing} onClick={() => void vm.runPreview()}>
            <Icon name="eye" size={16} />{vm.previewing ? t('push.adm.previewing') : t('push.adm.preview')}
          </button>
          <button type="button" className="sk-admin-button sk-admin-button-primary" disabled={!vm.canSend} aria-describedby={vm.canSend ? undefined : 'sk-ann-needs-preview'} onClick={vm.askSend}>
            <Icon name="megaphone" size={16} />{vm.when === 'later' ? t('push.adm.schedule') : t('push.adm.send')}
          </button>
        </div>
        {!vm.canSend ? <p id="sk-ann-needs-preview" className="sk-admin-note">{t('push.adm.needsPreview')}</p> : null}
        {vm.previewFailed || vm.createFailed ? <p className="sk-admin-form-error" role="alert">{t('push.adm.createFailed')}</p> : null}
        {vm.created ? <p className="sk-admin-note" role="status"><Icon name="check" size={16} />{t('push.adm.created')}</p> : null}
      </section>

      <section className="sk-admin-card sk-ann__preview" aria-labelledby="sk-ann-lock" aria-live="polite">
        <h2 id="sk-ann-lock" className="sk-admin-card-title">{t('push.adm.lockCap')}</h2>
        {preview ? <>
          {preview.problems.length ? <ul className="sk-ann__problems" role="alert">
            {preview.problems.map((problem) => <li key={problem}><Icon name="alert-triangle" size={16} />{PROBLEM[problem] ? t(PROBLEM[problem]) : problem}</li>)}
          </ul> : null}
          <div className="sk-ann__lock">
            <BrandLogo size={30} label="" />
            <span><strong>{preview.lockScreen.title}</strong><small>{preview.lockScreen.body}</small></span>
          </div>
          <p className="sk-ann__reach"><Icon name="users" size={16} />{t('push.adm.reach', { students: count(preview.students), devices: count(preview.devices) })}</p>
          <p className="sk-admin-note">{t('push.adm.reachNote')}</p>
        </> : <p className="sk-admin-note">{t('push.adm.needsPreview')}</p>}
      </section>
    </div>

    <section aria-labelledby="sk-ann-history">
      <h2 id="sk-ann-history" className="sk-admin-card-title sk-ann__heading">{t('push.adm.history')}</h2>
      <div className="sk-admin-card sk-admin-table-card">
      {vm.loading && !vm.data ? <AdminLoading label={t('push.adm.loading')} />
        : vm.error ? <AdminError title={t('push.adm.error')} message={vm.error} onRetry={() => void vm.load()} />
          : <table className="sk-admin-table">
            <caption className="sk-admin-visually-hidden">{t('push.adm.caption')}</caption>
            <thead><tr>
              <th scope="col">{t('push.adm.col.status')}</th><th scope="col">{t('push.adm.col.what')}</th><th scope="col">{t('push.adm.col.who')}</th>
              <th scope="col">{t('push.adm.col.when')}</th><th scope="col">{t('push.adm.col.counts')}</th><th scope="col">{t('push.adm.col.action')}</th>
            </tr></thead>
            <tbody>{vm.data && vm.data.items.length ? vm.data.items.map((row) => <tr key={row.id}>
              <td><span className={`sk-admin-tag ${STATUS_TONE[row.status]}`}>{t(STATUS_LABEL[row.status])}</span></td>
              <td><strong>{row.title}</strong><br /><small>{t(KIND_LABEL[row.kind])}</small></td>
              <td>{row.campus || t('push.adm.campusAll')}</td>
              <td>{when(row.sentAt ?? row.scheduledAt)}</td>
              <td className="sk-admin-mono">{t('push.adm.counts', { sent: count(row.counts.sent), delivered: count(row.counts.delivered), failed: count(row.counts.failed), pending: count(row.counts.pending) })}</td>
              <td>{row.status === 'SCHEDULED'
                ? <button type="button" className="sk-admin-button" aria-label={t('push.adm.cancelSpoken', { title: row.title })} onClick={() => vm.askCancel(row)}><Icon name="x" size={16} />{t('push.adm.cancel')}</button>
                : '—'}</td>
            </tr>) : <tr><td colSpan={6}><AdminEmpty title={t('push.adm.empty')} description={t('push.adm.emptyBody')} /></td></tr>}</tbody>
          </table>}
      </div>
    </section>

    <ConfirmDialog open={vm.confirming} title={t('push.adm.confirmTitle')}
      body={preview ? (scheduledAt ? t('push.adm.confirmScheduled', { time: when(scheduledAt) }) : t('push.adm.confirmBody', { students: count(preview.students), devices: count(preview.devices) })) : ''}
      confirmLabel={vm.when === 'later' ? t('push.adm.schedule') : t('push.adm.send')} busy={vm.creating} onConfirm={() => void vm.send()} onCancel={vm.cancelSend} />
    <ConfirmDialog open={vm.cancelTarget !== null} tone="destructive" title={t('push.adm.cancelTitle')}
      body={<>{t('push.adm.cancelBody')}{vm.cancelFailed ? <p className="sk-admin-form-error" role="alert">{t('push.adm.cancelFailed')}</p> : null}</>}
      confirmLabel={t('push.adm.cancel')} cancelLabel={t('push.adm.keep')} busy={vm.cancelling} onConfirm={() => void vm.confirmCancel()} onCancel={vm.keep} />
  </AdminPage>;
});
