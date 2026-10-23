import React, { useEffect, useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer } from '@/design-system/overlays/Drawer';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { SkButton } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { when } from '@/features/admin/model/format';
import { studentInvitesRepository } from './studentInvitesRepository';
import type { InviteChannel, StudentInvite, StudentInvitesRepository } from './studentInvitesRepository';
import { StudentInvitesViewModel } from './StudentInvitesViewModel';
import './student-invites.css';

const CHANNELS: readonly InviteChannel[] = ['EMAIL', 'WHATSAPP'];

/**
 * Campus, Students, Invite students (B2B; plan tier1-auth-password-2026-10-22,
 * amendment b). One student at a time (CSV later, D-B4): name, roll number, email
 * and/or WhatsApp, and which one the link goes to. The temporary password is
 * shown once, to hand over separately (D-B3). The list says where each invite
 * stands, with Resend (a new link and password) and Cancel (frees the email and
 * number). A campus admin invites to their own campus only; a super admin names one.
 */
export const StudentInvitesPanel = observer(function StudentInvitesPanel({ repository = studentInvitesRepository }: {
  repository?: StudentInvitesRepository;
}) {
  const t = useT();
  const [vm] = useState(() => new StudentInvitesViewModel(repository));
  const superAdmin = vm.superAdmin;
  const [copied, setCopied] = useState(false);
  const errorId = useId();
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);

  const field = (id: string, label: string, value: string, onChange: (value: string) => void, type: 'text' | 'email' | 'tel' = 'text',
    invalid = false) => (
    <div className="cb-field">
      <label className="cb-field__label" htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid}
        aria-describedby={invalid && vm.problem ? errorId : undefined} maxLength={type === 'tel' ? 20 : 254} />
    </div>
  );
  const contact = (invite: StudentInvite) => (invite.sentBy === 'EMAIL' ? invite.email : invite.phone);

  return (
    <section className="cb-invites" aria-labelledby="cb-invites-title">
      <div className="cb-invites__head">
        <div>
          <h2 id="cb-invites-title">{t('invite.title')}</h2>
          <p>{t('invite.lead')}</p>
        </div>
        <SkButton onClick={vm.openForm}>
          <Icon name="user" size={17} strokeWidth={1.9} />
          {t('invite.open')}
        </SkButton>
      </div>

      {vm.notice ? <p className="cb-field__hint" role="status">{t(vm.notice)}</p> : null}

      {vm.loading && !vm.items.length ? <p className="cb-field__hint" role="status">{t('invite.loading')}</p>
        : vm.error ? (
          <div className="sk-note sk-note--danger" role="alert">
            <Icon name="alert-triangle" size={16} strokeWidth={2} />
            <span>{t('invite.error')}</span>
            <button type="button" className="sk-link" onClick={vm.reload}>{t('common.tryAgain')}</button>
          </div>
        ) : vm.items.length === 0 ? <p className="cb-field__hint">{t('invite.empty')}</p> : (
          <table className="cb-invites__table">
            <caption className="sk-visually-hidden">{t('invite.caption')}</caption>
            <thead><tr>
              <th scope="col">{t('invite.col.student')}</th><th scope="col">{t('invite.col.contact')}</th>
              <th scope="col">{t('invite.col.status')}</th><th scope="col">{t('invite.col.actions')}</th>
            </tr></thead>
            <tbody>{vm.items.map((invite) => {
              const busy = vm.busyId === invite.id;
              const open = invite.status !== 'CLAIMED';
              return (
                <tr key={invite.id}>
                  <td>
                    <strong>{invite.fullName}</strong>
                    <span className="cb-invites__meta">{invite.rollNumber}{superAdmin ? ` · ${invite.university}` : ''}</span>
                  </td>
                  <td>
                    {t(`invite.sendBy.${invite.sentBy}`)}
                    <span className="cb-invites__meta">{contact(invite)}</span>
                  </td>
                  <td>
                    {t(`invite.status.${invite.status}`)}
                    <span className="cb-invites__meta">{invite.claimedAt ? when(invite.claimedAt) : when(invite.expiresAt)}</span>
                    {invite.locked ? <span className="cb-invites__meta">{t('invite.locked')}</span> : null}
                  </td>
                  <td>{open ? (
                    <div className="cb-invites__actions">
                      <SkButton variant="secondary" disabled={busy} aria-label={t('invite.resendAria', { name: invite.fullName })} onClick={() => void vm.resend(invite)}>
                        <Icon name="refresh" size={16} strokeWidth={1.9} />{t('invite.resend')}
                      </SkButton>
                      <SkButton variant="secondary" disabled={busy} aria-label={t('invite.cancelAria', { name: invite.fullName })} onClick={() => vm.askCancel(invite)}>
                        <Icon name="x" size={16} strokeWidth={1.9} />{t('invite.cancel')}
                      </SkButton>
                    </div>
                  ) : null}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}

      <Drawer open={vm.formOpen} title={t('invite.drawerTitle')} subtitle={t('invite.lead')} busy={vm.saving} onClose={vm.closeForm}>
        <form className="cb-form" onSubmit={(event) => { event.preventDefault(); void vm.save(); }}>
          {field('cb-invite-name', t('invite.name'), vm.fullName, (v) => vm.set('fullName', v))}
          {field('cb-invite-roll', t('invite.roll'), vm.rollNumber, (v) => vm.set('rollNumber', v))}
          {superAdmin ? field('cb-invite-campus', t('invite.campus'), vm.university, (v) => vm.set('university', v)) : null}
          {field('cb-invite-email', t('invite.email'), vm.email, (v) => vm.set('email', v), 'email', vm.problem === 'invite.inUse')}
          {field('cb-invite-phone', t('invite.phone'), vm.phone, (v) => vm.set('phone', v), 'tel', vm.problem === 'invite.inUse')}
          <fieldset className="cb-fieldset">
            <legend className="cb-field__label">{t('invite.sendBy')}</legend>
            <div className="cb-invites__radio">
              {CHANNELS.map((channel) => (
                <label key={channel}>
                  <input type="radio" name="cb-invite-send-by" value={channel} checked={vm.sendBy === channel} onChange={() => vm.setSendBy(channel)} />
                  {t(`invite.sendBy.${channel}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {vm.problem ? <p className="cb-field__error" id={errorId} role="alert">{t(vm.problem)}</p> : null}
          <SkButton type="submit" className="cb-form__submit" disabled={!vm.canSave} aria-busy={vm.saving}>
            {vm.saving ? t('invite.sending') : t('invite.send')}
          </SkButton>
          <SkButton type="button" variant="secondary" onClick={vm.closeForm} disabled={vm.saving}>{t('invite.cancelForm')}</SkButton>
        </form>
      </Drawer>

      <ConfirmDialog
        open={vm.shown !== null}
        title={vm.shown ? t('invite.doneTitle', { name: vm.shown.name }) : ''}
        body=""
        confirmLabel={t('invite.close')}
        onConfirm={() => { setCopied(false); vm.closeShown(); }}
        onCancel={() => { setCopied(false); vm.closeShown(); }}
        done={vm.shown ? {
          title: t('invite.doneTitle', { name: vm.shown.name }),
          body: (
            <div className="cb-invites__temp-card">
              <span className="cb-invites__temp-label" id="cb-invite-temp-label">{t('claim.temp.label')}</span>
              <output className="cb-invites__temp" aria-labelledby="cb-invite-temp-label">{vm.shown.password}</output>
              <p>{t('invite.doneBody')}</p>
              <p>{vm.shown.linkSent ? t('invite.doneLinkSent', { channel: t(`invite.sendBy.${vm.shown.channel}`) }) : t('invite.doneLinkNotSent')}</p>
              <button type="button" className="cb-invites__copy" onClick={() => {
                void navigator.clipboard?.writeText(vm.shown?.password ?? '').then(() => setCopied(true), () => setCopied(false));
              }}>
                <Icon name="copy" size={16} />{copied ? t('invite.copied') : t('invite.copy')}
              </button>
            </div>
          ),
          actionLabel: t('invite.close'),
          onAction: () => { setCopied(false); vm.closeShown(); },
        } : null}
      />

      <ConfirmDialog
        open={vm.cancelTarget !== null}
        tone="danger"
        title={vm.cancelTarget ? t('invite.cancelTitle', { name: vm.cancelTarget.fullName }) : ''}
        body={t('invite.cancelBody')}
        confirmLabel={t('invite.cancel')}
        busy={Boolean(vm.busyId)}
        onConfirm={() => void vm.cancel()}
        onCancel={vm.closeCancel}
      />
    </section>
  );
});
